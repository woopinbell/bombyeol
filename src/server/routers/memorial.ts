import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { nextAnniversary } from "@/lib/memorial";
import { MEMORIAL_POLICY } from "@/lib/plan";
import { inputError, notFound } from "@/server/errors";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture, isoDate } from "./inputs";

const note = z.string().trim().min(1).max(MEMORIAL_POLICY.noteMaxChars);

const targetInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("member"), memberId: entityId }),
  z.object({ type: z.literal("pet"), petId: entityId }),
]);

const memorialSelect = {
  id: true,
  memberId: true,
  petId: true,
  name: true,
  relationLabel: true,
  passedAt: true,
  note: true,
  createdAt: true,
} satisfies Prisma.MemorialProfileSelect;

function checkPassedAt(passedAt: Date | null | undefined) {
  if (passedAt && !isNotFuture(passedAt)) throw inputError("DATE_IN_FUTURE");
}

/** 같은 대상을 동시에 기념으로 바꾸면 unique 제약 → ALREADY_MEMORIAL */
async function withMemorialConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw inputError("ALREADY_MEMORIAL");
    }
    throw e;
  }
}

/**
 * 별이 되신 가족·반려동물(PRD §4.5, PRIVACY §5). 전환·수정·되돌리기는 parent만(유가족 동의 하에).
 * 기념 상태가 되면: 그 분의 새 이야기·물어보기·이야기 수정·삭제는 막히고(영구 보존) 반응(추모)은 열려 있다.
 * 반려동물은 새 마일스톤(일상 기록)이 막히고 추억 사진(Moment)은 계속 올릴 수 있다.
 */
export const memorialRouter = router({
  /** 기념 상태로 전환. 이름·관계는 스냅샷으로 남긴다. 답을 기다리던 물어보기는 거둔다 */
  mark: parentProcedure
    .input(
      z.object({
        target: targetInput,
        passedAt: isoDate.optional(),
        note: note.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkPassedAt(input.passedAt);
      const spaceId = ctx.member.spaceId;
      const base = {
        spaceId,
        passedAt: input.passedAt,
        note: input.note,
        createdById: ctx.userId,
      };

      if (input.target.type === "member") {
        const member = await ctx.prisma.member.findFirst({
          where: { id: input.target.memberId, spaceId },
          select: { id: true, relationLabel: true, user: { select: { name: true } } },
        });
        if (!member) throw notFound("SUBJECT_NOT_FOUND");
        if (member.id === ctx.member.id) throw inputError("MEMORIAL_SELF");
        return withMemorialConflict(() =>
          ctx.prisma.$transaction(async (tx) => {
            const memorial = await tx.memorialProfile.create({
              data: {
                ...base,
                memberId: member.id,
                name: member.user.name,
                relationLabel: member.relationLabel,
              },
              select: memorialSelect,
            });
            await tx.storyAsk.deleteMany({ where: { toMemberId: member.id, entryId: null } });
            return memorial;
          }),
        );
      }

      const pet = await ctx.prisma.pet.findFirst({
        where: { id: input.target.petId, spaceId },
        select: { id: true, name: true },
      });
      if (!pet) throw notFound("SUBJECT_NOT_FOUND");
      return withMemorialConflict(() =>
        ctx.prisma.$transaction(async (tx) => {
          const memorial = await tx.memorialProfile.create({
            data: { ...base, petId: pet.id, name: pet.name },
            select: memorialSelect,
          });
          await tx.pet.update({
            where: { id: pet.id },
            data: { status: "memorial", passedAt: input.passedAt ?? null },
          });
          return memorial;
        }),
      );
    }),

  /** 떠난 날·기억 메모 고치기 */
  update: parentProcedure
    .input(
      z.object({
        memorialId: entityId,
        passedAt: isoDate.nullable().optional(),
        note: note.nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkPassedAt(input.passedAt);
      const memorial = await ctx.prisma.memorialProfile.findFirst({
        where: { id: input.memorialId, spaceId: ctx.member.spaceId },
        select: { id: true, petId: true },
      });
      if (!memorial) throw notFound("ITEM_NOT_FOUND");
      return ctx.prisma.$transaction(async (tx) => {
        if (memorial.petId && input.passedAt !== undefined) {
          await tx.pet.update({
            where: { id: memorial.petId },
            data: { passedAt: input.passedAt },
          });
        }
        return tx.memorialProfile.update({
          where: { id: memorial.id },
          data: { passedAt: input.passedAt, note: input.note },
          select: memorialSelect,
        });
      });
    }),

  /** 되돌리기(잘못 전환한 경우). 이야기·기록은 그대로 남는다 */
  unmark: parentProcedure
    .input(z.object({ memorialId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const memorial = await ctx.prisma.memorialProfile.findFirst({
        where: { id: input.memorialId, spaceId: ctx.member.spaceId },
        select: { id: true, petId: true },
      });
      if (!memorial) throw notFound("ITEM_NOT_FOUND");
      await ctx.prisma.$transaction(async (tx) => {
        await tx.memorialProfile.delete({ where: { id: memorial.id } });
        if (memorial.petId) {
          await tx.pet.update({
            where: { id: memorial.petId },
            data: { status: "living", passedAt: null },
          });
        }
      });
      return { ok: true };
    }),

  /**
   * 기념 프로필 목록(모든 멤버)과 다음 기일 카드(조회 시점 계산).
   * today는 클라이언트의 현지 날짜(YYYY-MM-DD) — 없으면 UTC 오늘.
   */
  list: spaceProcedure
    .input(z.object({ today: isoDate.optional() }))
    .query(async ({ ctx, input }) => {
      const today = input.today ?? new Date();
      const rows = await ctx.prisma.memorialProfile.findMany({
        where: { spaceId: ctx.member.spaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: memorialSelect,
      });
      return rows.map((row) => ({
        ...row,
        anniversary: row.passedAt ? nextAnniversary(row.passedAt, today) : null,
      }));
    }),
});
