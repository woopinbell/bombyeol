import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { INVITE_POLICY, RATE_LIMITS, TIER_LIMITS, tierOf } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { generateInviteCode } from "@/server/invite-code";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { parentProcedure } from "@/server/trpc/procedures";
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

export const inviteRouter = router({
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
