import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { localRangeWindows, occurrencesIn } from "@/lib/calendar";
import { EVENT_POLICY, RATE_LIMITS } from "@/lib/plan";
import { inputError, limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import type { Context } from "@/server/trpc/context";
import { spaceProcedure, spaceRoleProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isoDate } from "./inputs";

const DAY_MS = 24 * 60 * 60 * 1000;

const title = z.string().trim().min(1).max(EVENT_POLICY.titleMaxChars);
const note = z.string().trim().min(1).max(EVENT_POLICY.noteMaxChars);
const kind = z.enum(["gathering", "birthday", "anniversary", "other"]);
const recurrence = z.enum(["none", "yearly"]);
const instant = z.date().refine((d) => d.getUTCFullYear() >= 1900 && d.getUTCFullYear() <= 2200, {
  message: "DATE_OUT_OF_RANGE",
});

/**
 * 언제: 종일 일정은 날짜(YYYY-MM-DD, 끝 날짜 포함)로, 시각 있는 일정은 순간으로 받는다.
 * 종일 일정은 UTC 자정으로 저장해 시간대 변환 없이 날짜로 보여준다.
 */
const when = z.discriminatedUnion("allDay", [
  z.object({ allDay: z.literal(true), startDate: isoDate, endDate: isoDate.optional() }),
  z.object({ allDay: z.literal(false), startsAt: instant, endsAt: instant.optional() }),
]);

function toTiming(input: z.infer<typeof when>) {
  const timing = input.allDay
    ? { allDay: true, startsAt: input.startDate, endsAt: input.endDate ?? null }
    : { allDay: false, startsAt: input.startsAt, endsAt: input.endsAt ?? null };
  if (timing.endsAt) {
    const span = timing.endsAt.getTime() - timing.startsAt.getTime();
    if (span < 0 || span > EVENT_POLICY.maxSpanDays * DAY_MS) {
      throw inputError("EVENT_RANGE_INVALID");
    }
  }
  return timing;
}

const eventSelect = {
  id: true,
  title: true,
  kind: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  recurrence: true,
  note: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.FamilyEventSelect;

type SpaceCtx = Context & { userId: string; member: { role: string; spaceId: string } };

async function checkWriteLimit(ctx: SpaceCtx) {
  const ok = await hitRateLimit(
    ctx.prisma,
    `event-write:${ctx.userId}`,
    RATE_LIMITS.eventWritePerUser,
  );
  if (!ok) throw limitError("RATE_LIMITED");
}

/** 고치기, 지우기: 만든 사람 또는 parent */
async function findOwnEvent(ctx: SpaceCtx, eventId: string) {
  const event = await ctx.prisma.familyEvent.findFirst({
    where: { id: eventId, spaceId: ctx.member.spaceId },
    select: { id: true, createdById: true },
  });
  if (!event) throw notFound("ITEM_NOT_FOUND");
  if (event.createdById !== ctx.userId && ctx.member.role !== "parent") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return event;
}

/**
 * 가족 캘린더(PRD §4.4): 생일, 기념일, 가족 모임. 쓰기는 parent, grandparent(relative는 열람 - Phase 3 원칙).
 * 정시 알림은 없다 - 다가오는 일정은 조회 시점에 계산한다(family.upcoming).
 */
export const calendarRouter = router({
  /** 일정 만들기. Space당 일정 수 상한(G-11), 쓰기 리밋(G-07) */
  create: spaceRoleProcedure("parent", "grandparent")
    .input(
      z.object({
        title,
        kind,
        when,
        recurrence: recurrence.default("none"),
        note: note.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const timing = toTiming(input.when);
      await checkWriteLimit(ctx);
      const spaceId = ctx.member.spaceId;
      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-events:${spaceId}`);
        const count = await tx.familyEvent.count({ where: { spaceId } });
        if (count >= EVENT_POLICY.maxPerSpace) throw limitError("EVENT_LIMIT");
        return tx.familyEvent.create({
          data: {
            spaceId,
            title: input.title,
            kind: input.kind,
            ...timing,
            recurrence: input.recurrence,
            note: input.note,
            createdById: ctx.userId,
          },
          select: eventSelect,
        });
      });
    }),

  /** 고치기(만든 사람 또는 parent). 시간을 바꿀 때는 when 전체를 다시 보낸다 */
  update: spaceProcedure
    .input(
      z.object({
        eventId: entityId,
        title: title.optional(),
        kind: kind.optional(),
        when: when.optional(),
        recurrence: recurrence.optional(),
        note: note.nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await findOwnEvent(ctx, input.eventId);
      const timing = input.when ? toTiming(input.when) : {};
      await checkWriteLimit(ctx);
      return ctx.prisma.familyEvent.update({
        where: { id: event.id },
        data: {
          title: input.title,
          kind: input.kind,
          ...timing,
          recurrence: input.recurrence,
          note: input.note,
        },
        select: eventSelect,
      });
    }),

  /** 지우기(만든 사람 또는 parent) */
  delete: spaceProcedure.input(z.object({ eventId: entityId })).mutation(async ({ ctx, input }) => {
    const event = await findOwnEvent(ctx, input.eventId);
    await ctx.prisma.familyEvent.deleteMany({ where: { id: event.id } });
    return { ok: true };
  }),

  /**
   * 기간 안의 일정(모든 멤버): 클라이언트의 현지 날짜 범위(from~to 포함)와 UTC 차이(분, 한국 +540).
   * 매년 반복 일정은 범위 안의 회차로 펼친다 - 회차의 startsAt, endsAt을 돌려준다. 시작 순.
   */
  list: spaceProcedure
    .input(
      z
        .object({
          from: isoDate,
          to: isoDate,
          utcOffsetMinutes: z
            .number()
            .int()
            .min(-14 * 60)
            .max(14 * 60)
            .default(0),
        })
        .refine(
          ({ from, to }) =>
            to >= from && to.getTime() - from.getTime() < EVENT_POLICY.maxRangeDays * DAY_MS,
          { message: "RANGE_INVALID" },
        ),
    )
    .query(async ({ ctx, input }) => {
      const windows = localRangeWindows(input.from, input.to, input.utcOffsetMinutes);
      const lo = new Date(Math.min(windows.allDay.from.getTime(), windows.timed.from.getTime()));
      const hi = new Date(Math.max(windows.allDay.to.getTime(), windows.timed.to.getTime()));
      const rows = await ctx.prisma.familyEvent.findMany({
        where: {
          spaceId: ctx.member.spaceId,
          OR: [
            { recurrence: "yearly" },
            {
              startsAt: { lt: hi },
              OR: [{ endsAt: { gte: lo } }, { endsAt: null, startsAt: { gte: lo } }],
            },
          ],
        },
        select: eventSelect,
      });
      // 종일 일정은 그 날 현지 자정에 있는 것으로 보고 시각 있는 일정과 함께 시작 순으로 놓는다
      const sortKey = (e: { allDay: boolean; startsAt: Date }) =>
        e.startsAt.getTime() - (e.allDay ? input.utcOffsetMinutes * 60 * 1000 : 0);
      return rows
        .flatMap((row) =>
          occurrencesIn(row, row.allDay ? windows.allDay : windows.timed).map((span) => ({
            ...row,
            ...span,
          })),
        )
        .sort((a, b) => sortKey(a) - sortKey(b) || a.id.localeCompare(b.id));
    }),
});
