import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { TIER_LIMITS, tierOf } from "@/lib/plan";
import { inputError, limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { momentAssetIds } from "@/server/media/attached";
import { markPurging } from "@/server/media/purge";
import { parentProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture, isoDate, personName } from "./inputs";

/** 이름·태명 중 하나 이상, 출생 예정일·생일 중 정확히 하나 */
export const childInput = z
  .object({
    name: personName.optional(),
    nickname: personName.optional(),
    dueDate: isoDate.optional(),
    birthDate: isoDate.optional(),
  })
  .refine((c) => c.name || c.nickname, { message: "NAME_REQUIRED" })
  .refine((c) => Boolean(c.dueDate) !== Boolean(c.birthDate), { message: "ONE_DATE_REQUIRED" })
  .refine((c) => !c.birthDate || isNotFuture(c.birthDate), { message: "DATE_IN_FUTURE" });

export function createChild(
  tx: Prisma.TransactionClient,
  spaceId: string,
  createdById: string,
  child: z.infer<typeof childInput>,
) {
  const { name, nickname, dueDate, birthDate } = child;
  return tx.child.create({
    data: {
      spaceId,
      name,
      nickname,
      dueDate,
      birthDate,
      status: birthDate ? "born" : "expecting",
      createdById,
    },
    select: { id: true, status: true },
  });
}

const childSelect = {
  id: true,
  name: true,
  nickname: true,
  dueDate: true,
  birthDate: true,
  status: true,
} satisfies Prisma.ChildSelect;

async function findChild(prisma: Prisma.TransactionClient, spaceId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, spaceId },
    select: childSelect,
  });
  if (!child) throw notFound("SUBJECT_NOT_FOUND");
  return child;
}

export const childRouter = router({
  create: parentProcedure.input(z.object({ child: childInput })).mutation(({ ctx, input }) =>
    ctx.prisma.$transaction(async (tx) => {
      await lockKey(tx, `space-children:${ctx.member.spaceId}`);
      const count = await tx.child.count({ where: { spaceId: ctx.member.spaceId } });
      if (count >= TIER_LIMITS[tierOf()].children) throw limitError("CHILD_LIMIT");
      return createChild(tx, ctx.member.spaceId, ctx.userId, input.child);
    }),
  ),

  /**
   * 프로필 수정(parent). 이름·태명은 null로 지울 수 있지만 둘 다 비울 수는 없다.
   * 출생 전 아이의 생일은 markBorn으로만 정한다(상태 전환을 한 경로로).
   */
  update: parentProcedure
    .input(
      z.object({
        childId: entityId,
        name: personName.nullable().optional(),
        nickname: personName.nullable().optional(),
        dueDate: isoDate.optional(),
        birthDate: isoDate.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await findChild(ctx.prisma, ctx.member.spaceId, input.childId);
      if (current.status === "expecting" && input.birthDate) throw inputError("USE_MARK_BORN");
      if (input.birthDate && !isNotFuture(input.birthDate)) throw inputError("DATE_IN_FUTURE");
      const name = input.name === undefined ? current.name : input.name;
      const nickname = input.nickname === undefined ? current.nickname : input.nickname;
      if (!name && !nickname) throw inputError("NAME_REQUIRED");
      return ctx.prisma.child.update({
        where: { id: current.id },
        data: { name, nickname, dueDate: input.dueDate, birthDate: input.birthDate },
        select: childSelect,
      });
    }),

  /**
   * 태명 시절 → 출생 전환(parent). 태명·출생 예정일과 그동안의 기록은 그대로 둔다(PRD §4.2).
   */
  markBorn: parentProcedure
    .input(z.object({ childId: entityId, birthDate: isoDate, name: personName.optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!isNotFuture(input.birthDate)) throw inputError("DATE_IN_FUTURE");
      await findChild(ctx.prisma, ctx.member.spaceId, input.childId);
      // 동시에 두 번 눌러도 한 번만 전환된다.
      const { count } = await ctx.prisma.child.updateMany({
        where: { id: input.childId, spaceId: ctx.member.spaceId, status: "expecting" },
        data: {
          status: "born",
          birthDate: input.birthDate,
          ...(input.name && { name: input.name }),
        },
      });
      if (count === 0) throw inputError("CHILD_ALREADY_BORN");
      return findChild(ctx.prisma, ctx.member.spaceId, input.childId);
    }),

  /**
   * 아이 삭제(parent, 되돌릴 수 없음). 화면에 보이는 이름(이름 또는 태명)을 다시 입력해야 한다.
   * 그 아이의 사진·일기·마일스톤·임신 기록을 함께 지우고, 붙은 파일은 purging으로 넘겨
   * 정리 Cron이 R2에서 지운다(G-05). 아이 정보 동의 철회도 이 경로로 처리한다(PRIVACY §2.4).
   */
  delete: parentProcedure
    .input(z.object({ childId: entityId, confirmName: personName }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const child = await findChild(ctx.prisma, spaceId, input.childId);
      if (input.confirmName !== (child.name ?? child.nickname)) {
        throw inputError("CONFIRM_MISMATCH");
      }
      return ctx.prisma.$transaction(async (tx) => {
        const moments = await momentAssetIds(tx, { childId: child.id });
        const pregnancy = await tx.pregnancyRecord.findMany({
          where: { childId: child.id, photoAssetId: { not: null } },
          select: { photoAssetId: true },
        });
        const assetIds = [...moments, ...pregnancy.map((p) => p.photoAssetId as string)];
        const purging = await markPurging(tx, spaceId, assetIds);
        await tx.child.deleteMany({ where: { id: child.id, spaceId } });
        return { ok: true, purgingFiles: purging };
      });
    }),
});
