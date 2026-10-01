import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ACCOUNT_LIMITS, INVITE_POLICY, RATE_LIMITS, TIER_LIMITS, tierOf } from "@/lib/plan";
import { inviteError, limitError } from "@/server/errors";
import { isInviteAttemptBlocked, recordInviteFailure } from "@/server/invite-attempts";
import { generateInviteCode, normalizeInviteCode } from "@/server/invite-code";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import type { Context } from "@/server/trpc/context";
import { openSpaceDeletion, parentProcedure, protectedProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { relationLabel } from "./inputs";

const HOUR_MS = 60 * 60 * 1000;
const memberRole = z.enum(["parent", "grandparent", "relative"]);

/** 미사용·미회수·미만료 초대 조건 */
export function activeInviteWhere(spaceId: string, now: Date): Prisma.InviteWhereInput {
  return { spaceId, usedAt: null, revokedAt: null, expiresAt: { gt: now } };
}

const inviteSelect = {
  id: true,
  code: true,
  role: true,
  relationLabel: true,
  expiresAt: true,
} satisfies Prisma.InviteSelect;

const codeInput = z.object({ code: z.string().max(32) });

/**
 * 코드로 유효한 초대를 찾는다. 차단 중이면 429, 못 찾으면 실패를 기록하고 INVITE_INVALID.
 * 없음·만료·사용됨·회수됨·삭제된 Space를 구분하지 않는다(코드 탐색에 정보를 주지 않기 위해).
 */
async function findValidInvite(ctx: Context & { userId: string }, rawCode: string) {
  if (await isInviteAttemptBlocked(ctx.prisma, ctx.userId, ctx.ip)) {
    throw limitError("RATE_LIMITED");
  }
  const code = normalizeInviteCode(rawCode);
  const invite = code
    ? await ctx.prisma.invite.findFirst({
        where: { code, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: {
          id: true,
          spaceId: true,
          role: true,
          relationLabel: true,
          space: { select: { name: true, deletedAt: true } },
        },
      })
    : null;
  // 삭제 요청 시 초대를 거두지만, 같은 순간의 경합까지 막기 위해 삭제 진행 중인 Space도 무효로 본다
  const deleting =
    invite &&
    (await ctx.prisma.deletionRequest.findFirst({
      where: openSpaceDeletion(invite.spaceId),
      select: { id: true },
    }));
  if (!invite || invite.space.deletedAt || deleting) {
    await recordInviteFailure(ctx.prisma, ctx.userId, ctx.ip);
    throw inviteError("INVITE_INVALID");
  }
  return invite;
}

export const inviteRouter = router({
  /** 합류 전 확인용(어느 가족에 어떤 역할로 들어가는지). 실패는 brute-force 카운트에 포함 */
  preview: protectedProcedure.input(codeInput).query(async ({ ctx, input }) => {
    const invite = await findValidInvite(ctx, input.code);
    return { spaceName: invite.space.name, role: invite.role, relationLabel: invite.relationLabel };
  }),

  /** 초대 수락: 1회용 소비 + 멤버 생성을 한 트랜잭션으로(G-11 정원 재확인) */
  accept: protectedProcedure
    .input(codeInput.extend({ relationLabel: relationLabel.optional() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await findValidInvite(ctx, input.code);

      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-invites:${invite.spaceId}`);
        await lockKey(tx, `user-spaces:${ctx.userId}`);

        const already = await tx.member.findUnique({
          where: { spaceId_userId: { spaceId: invite.spaceId, userId: ctx.userId } },
          select: { id: true },
        });
        if (already) throw inviteError("ALREADY_MEMBER");

        const [memberships, roleCount] = await Promise.all([
          tx.member.count({ where: { userId: ctx.userId, space: { deletedAt: null } } }),
          tx.member.count({ where: { spaceId: invite.spaceId, role: invite.role } }),
        ]);
        if (memberships >= ACCOUNT_LIMITS.membershipsPerUser) throw limitError("MEMBERSHIP_LIMIT");
        if (roleCount >= TIER_LIMITS[tierOf()].membersByRole[invite.role]) {
          throw limitError("MEMBER_ROLE_LIMIT");
        }

        // 1회용: 아직 유효할 때만 소비한다(동시 수락 중 하나만 성공).
        const now = new Date();
        const { count } = await tx.invite.updateMany({
          where: { id: invite.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now, usedById: ctx.userId },
        });
        if (count !== 1) throw inviteError("INVITE_INVALID");

        await tx.member.create({
          data: {
            spaceId: invite.spaceId,
            userId: ctx.userId,
            role: invite.role,
            relationLabel: input.relationLabel ?? invite.relationLabel,
          },
        });
        return { spaceId: invite.spaceId };
      });
    }),

  /** 초대 발급(parent). 링크는 같은 코드를 쓴다: /invite/{code} */
  create: parentProcedure
    .input(z.object({ role: memberRole, relationLabel: relationLabel.optional() }))
    .mutation(async ({ ctx, input }) => {
      const allowed = await hitRateLimit(
        ctx.prisma,
        `invite-issue:${ctx.userId}`,
        RATE_LIMITS.inviteIssuePerUser,
      );
      if (!allowed) throw limitError("RATE_LIMITED");

      return ctx.prisma.$transaction(async (tx) => {
        const spaceId = ctx.member.spaceId;
        await lockKey(tx, `space-invites:${spaceId}`);
        const now = new Date();
        const [active, members, pendingForRole] = await Promise.all([
          tx.invite.count({ where: activeInviteWhere(spaceId, now) }),
          tx.member.count({ where: { spaceId, role: input.role } }),
          tx.invite.count({ where: { ...activeInviteWhere(spaceId, now), role: input.role } }),
        ]);
        if (active >= INVITE_POLICY.activePerSpace) throw limitError("INVITE_ACTIVE_LIMIT");
        // 역할별 정원(G-11): 이미 멤버 + 대기 중 초대가 정원을 채우면 더 발급하지 않는다.
        if (members + pendingForRole >= TIER_LIMITS[tierOf()].membersByRole[input.role]) {
          throw limitError("MEMBER_ROLE_LIMIT");
        }

        // 코드 충돌은 극히 드물지만, 트랜잭션 안에서 unique 위반이 나면 트랜잭션 전체가 중단되므로 미리 확인한다.
        let code: string | null = null;
        for (let attempt = 0; attempt < 5 && !code; attempt++) {
          const candidate = generateInviteCode();
          const taken = await tx.invite.findUnique({
            where: { code: candidate },
            select: { id: true },
          });
          if (!taken) code = candidate;
        }
        if (!code) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return tx.invite.create({
          data: {
            spaceId,
            code,
            role: input.role,
            relationLabel: input.relationLabel,
            expiresAt: new Date(now.getTime() + INVITE_POLICY.ttlHours * HOUR_MS),
            createdById: ctx.userId,
          },
          select: inviteSelect,
        });
      });
    }),

  /** 유효한 초대 목록(parent) */
  list: parentProcedure.query(({ ctx }) =>
    ctx.prisma.invite.findMany({
      where: activeInviteWhere(ctx.member.spaceId, new Date()),
      orderBy: { createdAt: "desc" },
      select: inviteSelect,
    }),
  ),

  /** 초대 회수(parent) */
  revoke: parentProcedure
    .input(z.object({ inviteId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.prisma.invite.updateMany({
        where: { id: input.inviteId, spaceId: ctx.member.spaceId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),
});
