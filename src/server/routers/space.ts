import { z } from "zod";
import { ACCOUNT_LIMITS, DELETION_POLICY } from "@/lib/plan";
import { inputError, limitError } from "@/server/errors";
import { ensureChildConsent, requireAccountConsents } from "@/server/consents";
import { lockKey } from "@/server/locks";
import {
  openSpaceDeletion,
  parentProcedure,
  protectedProcedure,
  spaceProcedure,
} from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { childInput, createChild } from "./child";
import { consentVersion, relationLabel, spaceName } from "./inputs";

const DAY_MS = 24 * 60 * 60 * 1000;

const deletionSelect = { requestedAt: true, purgeAfter: true } as const;

export const spaceRouter = router({
  /**
   * 가족 Space 생성: 생성자는 parent 멤버가 되고, 첫 아이를 함께 등록할 수 있다(G-11).
   * 가입 동의(약관, 처리방침)가 먼저 있어야 하고, 아이를 함께 등록하면 아이 정보 동의도 함께 남긴다.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: spaceName,
        relationLabel: relationLabel.optional(),
        child: childInput.optional(),
        /** 첫 아이를 함께 등록할 때 화면이 보여준 아이 정보 동의 버전(법정대리인 동의) */
        childDataConsent: consentVersion.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAccountConsents(ctx.prisma, ctx.userId);
      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `user-spaces:${ctx.userId}`);
        const cooldownStart = new Date(
          Date.now() - ACCOUNT_LIMITS.deletedSpaceCooldownDays * DAY_MS,
        );
        // 쿨다운 안에 지운 Space도 센다: 파기 중(행이 남음)은 deletedAt으로, 파기 끝(행 없음)은 완료된 삭제 요청으로
        const [created, purged, memberships] = await Promise.all([
          tx.space.count({
            where: {
              createdById: ctx.userId,
              OR: [{ deletedAt: null }, { deletedAt: { gt: cooldownStart } }],
            },
          }),
          tx.deletionRequest.count({
            where: {
              kind: "space",
              spaceCreatedById: ctx.userId,
              completedAt: { gt: cooldownStart },
            },
          }),
          tx.member.count({ where: { userId: ctx.userId, space: { deletedAt: null } } }),
        ]);
        if (created + purged >= ACCOUNT_LIMITS.spacesCreatedPerUser) {
          throw limitError("SPACE_CREATE_LIMIT");
        }
        if (memberships >= ACCOUNT_LIMITS.membershipsPerUser) throw limitError("MEMBERSHIP_LIMIT");

        const space = await tx.space.create({
          data: {
            name: input.name,
            createdById: ctx.userId,
            members: {
              create: { userId: ctx.userId, role: "parent", relationLabel: input.relationLabel },
            },
          },
          select: { id: true },
        });
        if (input.child) {
          await ensureChildConsent(tx, ctx.userId, space.id, input.childDataConsent);
          await createChild(tx, space.id, ctx.userId, input.child);
        }
        return space;
      });
    }),

  /** 내가 속한 Space 목록 */
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.member.findMany({
      where: { userId: ctx.userId, space: { deletedAt: null } },
      orderBy: { joinedAt: "asc" },
      select: { role: true, space: { select: { id: true, name: true } } },
    }),
  ),

  /**
   * Space 삭제 요청(parent). Space 이름을 다시 입력해야 한다. 유예 기간 동안 읽기, 내보내기만 되고
   * 어느 parent든 취소할 수 있다. 유예가 끝나면 정리 Cron이 파일(R2)부터 지우고 Space를 파기한다(G-06).
   * 열려 있는 초대는 거둔다(새 합류 차단). 이미 요청돼 있으면 그 요청을 돌려준다.
   */
  requestDeletion: parentProcedure
    .meta({ allowWhileDeleting: true })
    .input(z.object({ confirmName: spaceName }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const space = await ctx.prisma.space.findUniqueOrThrow({
        where: { id: spaceId },
        select: { name: true, createdById: true },
      });
      if (input.confirmName !== space.name) throw inputError("CONFIRM_MISMATCH");
      const now = new Date();
      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-deletion:${spaceId}`);
        const open = await tx.deletionRequest.findFirst({
          where: openSpaceDeletion(spaceId),
          select: deletionSelect,
        });
        if (open) return open;
        await tx.invite.updateMany({
          where: { spaceId, usedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
        return tx.deletionRequest.create({
          data: {
            kind: "space",
            spaceId,
            userId: ctx.userId,
            spaceCreatedById: space.createdById,
            requestedAt: now,
            purgeAfter: new Date(now.getTime() + DELETION_POLICY.spaceGraceDays * DAY_MS),
          },
          select: deletionSelect,
        });
      });
    }),

  /** 삭제 요청 취소(parent, 유예 중에만). 거둔 초대는 되살리지 않는다 */
  cancelDeletion: parentProcedure.meta({ allowWhileDeleting: true }).mutation(async ({ ctx }) => {
    const { count } = await ctx.prisma.deletionRequest.updateMany({
      where: { ...openSpaceDeletion(ctx.member.spaceId), purgeAfter: { gt: new Date() } },
      data: { canceledAt: new Date(), canceledById: ctx.userId },
    });
    return { canceled: count > 0 };
  }),

  /** 진행 중인 삭제 요청(모든 멤버 - 유예 안내 배너용). 없으면 null */
  deletionStatus: spaceProcedure.query(({ ctx }) =>
    ctx.prisma.deletionRequest.findFirst({
      where: openSpaceDeletion(ctx.member.spaceId),
      select: deletionSelect,
    }),
  ),

  /** Space 상세: 멤버와 아이, 반려동물, 그리고 요청한 사람의 역할(화면이 목록 조회를 따로 하지 않게) */
  get: spaceProcedure.query(async ({ ctx }) => ({
    myRole: ctx.member.role,
    ...(await ctx.prisma.space.findUniqueOrThrow({
      where: { id: ctx.member.spaceId },
      select: {
        id: true,
        name: true,
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            userId: true,
            role: true,
            relationLabel: true,
            user: { select: { name: true } },
            memorial: { select: { id: true } },
          },
        },
        children: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            nickname: true,
            dueDate: true,
            birthDate: true,
            status: true,
          },
        },
        pets: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            species: true,
            speciesLabel: true,
            status: true,
            coverAssetId: true,
          },
        },
      },
    })),
  })),
});
