import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { firstIsUnique, milestonePreset, suggestChildMilestones } from "@/lib/milestones";
import { RATE_LIMITS } from "@/lib/plan";
import { inputError, limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { reactionSummaries } from "@/server/reactions";
import { canRecordFor, memberSubjectInput, resolveSubject } from "@/server/subjects";
import { spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture, isoDate } from "./inputs";

const kindInput = z.string().min(1).max(32);

/** 오늘 탭에 한 번에 싣는 마일스톤 수(그보다 오래된 것은 대상별 목록에서) */
const MILESTONE_FEED_LIMIT = 200;

/** kind별 값 스키마로 검증한 JSON(PRD §4.2 프리셋 + 자유 입력) */
function parseValue(subject: "child" | "pet", kind: string, value: unknown) {
  const preset = milestonePreset(subject, kind);
  if (!preset) throw inputError("MILESTONE_KIND_INVALID");
  const parsed = preset.value.safeParse(value);
  if (!parsed.success)
    throw new TRPCError({ code: "BAD_REQUEST", message: "MILESTONE_VALUE_INVALID" });
  return { preset, value: parsed.data as Prisma.InputJsonValue };
}

const milestoneSelect = {
  id: true,
  childId: true,
  petId: true,
  kind: true,
  isFirst: true,
  value: true,
  recordedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.MilestoneSelect;

/** 수정, 삭제 대상: 같은 Space, 작성자 또는 parent */
async function findEditable(
  ctx: {
    prisma: Prisma.TransactionClient;
    userId: string;
    member: { spaceId: string; role: string };
  },
  milestoneId: string,
) {
  const milestone = await ctx.prisma.milestone.findFirst({
    where: { id: milestoneId, spaceId: ctx.member.spaceId },
    select: { id: true, childId: true, petId: true, kind: true, isFirst: true, createdById: true },
  });
  if (!milestone) throw notFound("ITEM_NOT_FOUND");
  if (milestone.createdById !== ctx.userId && ctx.member.role !== "parent") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return milestone;
}

/** "처음" 표시 검사: 붙일 수 있는 종류인지, 같은 대상, 종류에 이미 "처음"이 있는지(직접 쓰기는 제한 없음) */
async function checkFirst(
  tx: Prisma.TransactionClient,
  subject: { childId: string | null; petId: string | null },
  kind: string,
  exceptId?: string,
) {
  const preset = milestonePreset(subject.childId ? "child" : "pet", kind);
  if (!preset?.firstable) throw inputError("MILESTONE_FIRST_INVALID");
  if (!firstIsUnique(kind)) return;
  await lockKey(tx, `milestone-first:${subject.childId ?? subject.petId}:${kind}`);
  const exists = await tx.milestone.count({
    where: { ...subject, kind, isFirst: true, ...(exceptId && { id: { not: exceptId } }) },
  });
  if (exists) throw inputError("MILESTONE_FIRST_EXISTS");
}

export const milestoneRouter = router({
  /**
   * 마일스톤 기록. 아이는 parent만, 반려동물은 parent, grandparent(canRecordFor).
   * 입양일처럼 한 번뿐인 기록은 대상당 하나, "처음" 표시(first)는 대상, 종류마다 하나. 글 쓰기 폭주는 사용자당 리밋(G-07).
   */
  create: spaceProcedure
    .input(
      z.object({
        subject: memberSubjectInput,
        kind: kindInput,
        value: z.unknown(),
        recordedAt: isoDate,
        first: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      if (!canRecordFor(ctx.member.role, input.subject.type)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!isNotFuture(input.recordedAt)) throw inputError("DATE_IN_FUTURE");
      const { preset, value } = parseValue(input.subject.type, input.kind, input.value);
      const subject = await resolveSubject(ctx.prisma, spaceId, input.subject);
      // 별이 된 반려동물에는 새 일상 기록(마일스톤)을 더하지 않는다. 추억 사진(Moment)은 열려 있다(PRD §4.5)
      if (subject.petId) {
        const memorial = await ctx.prisma.memorialProfile.count({
          where: { petId: subject.petId },
        });
        if (memorial) throw inputError("MEMORIAL_READ_ONLY");
      }
      const ok = await hitRateLimit(
        ctx.prisma,
        `record-write:${ctx.userId}`,
        RATE_LIMITS.recordWritePerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");

      return ctx.prisma.$transaction(async (tx) => {
        if (preset.once) {
          const subjectId = subject.childId ?? subject.petId;
          await lockKey(tx, `milestone-once:${subjectId}:${input.kind}`);
          const exists = await tx.milestone.count({ where: { ...subject, kind: input.kind } });
          if (exists) throw inputError("MILESTONE_EXISTS");
        }
        if (input.first) await checkFirst(tx, subject, input.kind);
        return tx.milestone.create({
          data: {
            spaceId,
            ...subject,
            kind: input.kind,
            isFirst: input.first,
            value,
            recordedAt: input.recordedAt,
            createdById: ctx.userId,
          },
          select: milestoneSelect,
        });
      });
    }),

  /** 대상별 마일스톤(모든 멤버), 기록일 최신순 */
  list: spaceProcedure
    .input(z.object({ subject: memberSubjectInput }))
    .query(async ({ ctx, input }) => {
      const subject = await resolveSubject(ctx.prisma, ctx.member.spaceId, input.subject);
      const rows = await ctx.prisma.milestone.findMany({
        where: subject,
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        select: milestoneSelect,
      });
      const reactions = await reactionSummaries(
        ctx.prisma,
        ctx.userId,
        "milestoneId",
        rows.map((m) => m.id),
      );
      return rows.map((m) => ({ ...m, reactions: reactions.get(m.id)! }));
    }),

  /**
   * 가족 전체(또는 한 대상)의 마일스톤을 한 번에(모든 멤버) - 오늘 탭이 대상마다 따로 부르지 않게.
   * 기록일 최신순, 최근 MILESTONE_FEED_LIMIT개까지.
   */
  listAll: spaceProcedure
    .input(z.object({ subject: memberSubjectInput.optional() }))
    .query(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const subject = input.subject
        ? await resolveSubject(ctx.prisma, spaceId, input.subject)
        : { spaceId };
      const rows = await ctx.prisma.milestone.findMany({
        where: { spaceId, ...subject },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: MILESTONE_FEED_LIMIT,
        select: milestoneSelect,
      });
      const reactions = await reactionSummaries(
        ctx.prisma,
        ctx.userId,
        "milestoneId",
        rows.map((m) => m.id),
      );
      return rows.map((m) => ({ ...m, reactions: reactions.get(m.id)! }));
    }),

  /** 아이 나이 기반 제안(PRD §4.2): 나이에 맞고 아직 "처음"이 붙지 않은 순간 + 키, 몸무게 */
  suggestions: spaceProcedure
    .input(z.object({ childId: entityId }))
    .query(async ({ ctx, input }) => {
      const child = await ctx.prisma.child.findFirst({
        where: { id: input.childId, spaceId: ctx.member.spaceId },
        select: {
          birthDate: true,
          status: true,
          milestones: { where: { isFirst: true }, select: { kind: true } },
        },
      });
      if (!child) throw notFound("SUBJECT_NOT_FOUND");
      const recorded = new Set(child.milestones.map((m) => m.kind));
      return suggestChildMilestones(child.status === "born" ? child.birthDate : null, recorded);
    }),

  /** 값, 기록일, "처음" 표시 수정(작성자 또는 parent). kind와 대상은 바꾸지 않는다 */
  update: spaceProcedure
    .input(
      z.object({
        milestoneId: entityId,
        value: z.unknown().optional(),
        recordedAt: isoDate.optional(),
        first: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const milestone = await findEditable(ctx, input.milestoneId);
      if (input.recordedAt && !isNotFuture(input.recordedAt)) throw inputError("DATE_IN_FUTURE");
      const value =
        input.value === undefined
          ? undefined
          : parseValue(milestone.childId ? "child" : "pet", milestone.kind, input.value).value;
      return ctx.prisma.$transaction(async (tx) => {
        if (input.first && !milestone.isFirst) {
          await checkFirst(
            tx,
            { childId: milestone.childId, petId: milestone.petId },
            milestone.kind,
            milestone.id,
          );
        }
        return tx.milestone.update({
          where: { id: milestone.id },
          data: { value, recordedAt: input.recordedAt, isFirst: input.first },
          select: milestoneSelect,
        });
      });
    }),

  delete: spaceProcedure
    .input(z.object({ milestoneId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const milestone = await findEditable(ctx, input.milestoneId);
      await ctx.prisma.milestone.deleteMany({ where: { id: milestone.id } });
      return { ok: true };
    }),
});
