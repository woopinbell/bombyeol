import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ConsentKind, Prisma, PrismaClient } from "@/generated/prisma/client";
import { ACCOUNT_CONSENTS, CONSENT_VERSIONS, SPACE_CONSENTS } from "@/lib/consents";
import { validConsentWhere } from "@/server/consents";
import { inputError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { parentProcedure, protectedProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

const version = z.string().min(1).max(32);

const consentSelect = {
  kind: true,
  version: true,
  grantedAt: true,
} satisfies Prisma.ConsentSelect;

/**
 * 동의 기록(추가 전용). 화면에 보여준 문구 버전이 현재 버전과 달라졌으면 받지 않는다 —
 * 사용자가 실제로 읽은 버전에만 동의가 남도록. 이미 유효한 동의가 있으면 그 행을 돌려준다.
 */
async function grant(
  prisma: PrismaClient,
  userId: string,
  kind: ConsentKind,
  spaceId: string | null,
  shownVersion: string,
) {
  if (shownVersion !== CONSENT_VERSIONS[kind]) throw inputError("CONSENT_VERSION_STALE");
  return prisma.$transaction(async (tx) => {
    await lockKey(tx, `consent:${userId}:${kind}:${spaceId ?? "-"}`);
    const existing = await tx.consent.findFirst({
      where: validConsentWhere(userId, kind, spaceId),
      orderBy: { grantedAt: "desc" },
      select: consentSelect,
    });
    if (existing) return existing;
    return tx.consent.create({
      data: { userId, kind, spaceId, version: CONSENT_VERSIONS[kind] },
      select: consentSelect,
    });
  });
}

async function statusOf(
  prisma: PrismaClient,
  userId: string,
  kinds: readonly ConsentKind[],
  spaceId: string | null,
) {
  const rows = await prisma.consent.findMany({
    where: { userId, spaceId, kind: { in: [...kinds] }, withdrawnAt: null },
    orderBy: { grantedAt: "desc" },
    select: consentSelect,
  });
  return kinds.map((kind) => {
    const current = rows.find((r) => r.kind === kind && r.version === CONSENT_VERSIONS[kind]);
    return {
      kind,
      version: CONSENT_VERSIONS[kind],
      granted: Boolean(current),
      grantedAt: current?.grantedAt ?? null,
    };
  });
}

/**
 * 동의(PRIVACY §2.4·§3). 약관·처리방침은 사용자 단위, 아이 정보·임신 정보는 Space 단위(parent).
 * 이번 Phase에서 서버가 강제하는 것은 임신 동의(임신 기록 쓰기)뿐 — 가입 동의 게이트는 온보딩과 함께.
 */
export const consentRouter = router({
  /**
   * 동의 현황: 현재 버전 기준으로 빠진 동의를 알 수 있다.
   * spaceId를 주면 그 Space의 아이 정보·임신 동의도(그 Space 멤버만).
   */
  status: protectedProcedure
    .input(z.object({ spaceId: entityId.optional() }))
    .query(async ({ ctx, input }) => {
      const account = await statusOf(ctx.prisma, ctx.userId, ACCOUNT_CONSENTS, null);
      if (!input.spaceId) return { account, space: null };
      const member = await ctx.prisma.member.findUnique({
        where: { spaceId_userId: { spaceId: input.spaceId, userId: ctx.userId } },
        select: { space: { select: { deletedAt: true } } },
      });
      if (!member || member.space.deletedAt) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        account,
        space: await statusOf(ctx.prisma, ctx.userId, SPACE_CONSENTS, input.spaceId),
      };
    }),

  /** 가입 동의(이용약관·개인정보 처리방침) */
  grantAccount: protectedProcedure
    .input(z.object({ kind: z.enum(ACCOUNT_CONSENTS), version }))
    .mutation(({ ctx, input }) => grant(ctx.prisma, ctx.userId, input.kind, null, input.version)),

  /** Space 단위 동의(parent): 아이 정보 처리(법정대리인)·임신 정보 별도 동의 */
  grantSpace: parentProcedure
    .input(z.object({ kind: z.enum(SPACE_CONSENTS), version }))
    .mutation(({ ctx, input }) =>
      grant(ctx.prisma, ctx.userId, input.kind, ctx.member.spaceId, input.version),
    ),

  /**
   * 임신 정보 동의 철회(본인 — 역할이 바뀌었어도 할 수 있다). 철회하면 새 임신 기록을 쓰거나 고칠 수 없다.
   * 약관·처리방침 철회는 계정 삭제(Phase 7), 아이 정보 철회는 아이 삭제(Phase 7)로 다룬다.
   */
  withdraw: spaceProcedure
    .input(z.object({ kind: z.literal("pregnancy") }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.prisma.consent.updateMany({
        where: {
          userId: ctx.userId,
          kind: input.kind,
          spaceId: ctx.member.spaceId,
          withdrawnAt: null,
        },
        data: { withdrawnAt: new Date() },
      });
      return { withdrawn: count > 0 };
    }),
});
