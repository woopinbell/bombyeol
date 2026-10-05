import type { PrismaClient } from "@/generated/prisma/client";
import { nextAnniversary } from "@/lib/anniversary";
import { localRangeWindows, occurrencesIn } from "@/lib/calendar";
import { EVENT_POLICY } from "@/lib/plan";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Card = {
  type: "child_birthday" | "pet_birthday" | "pet_adoption" | "memorial" | "event";
  /** 아이, 반려동물, 기념 프로필, 일정 id */
  id: string;
  name: string | null;
  date: Date;
  /** 몇 번째(나이, 주년, 주기). 직접 등록한 일정은 처음 해부터 센다 */
  years: number | null;
  daysUntil: number;
  /** 반려동물 생일을 추정일로 입력했는지 */
  estimated?: boolean;
};

/** 시각 있는 일정의 현지 날짜(UTC 자정 기준)로 바꾼다 - D-day 계산은 현지 날짜끼리 */
export function localDate(at: Date, allDay: boolean, utcOffsetMinutes: number) {
  if (allDay) return at;
  const shifted = new Date(at.getTime() + utcOffsetMinutes * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/**
 * 앞으로 days일 안의 가족 일(DESIGN §9.4): 아이, 반려동물 생일, 가족이 된 날, 기일, 직접 등록한 생일, 기념일,
 * 그리고 가장 가까운 가족 모임. 우리 탭(family.upcoming)과 아침 알림(jobs/day-reminders)이 함께 쓴다.
 */
export async function upcomingFor(
  prisma: PrismaClient,
  spaceId: string,
  opts: { today?: Date; utcOffsetMinutes: number; days: number },
) {
  const offset = opts.utcOffsetMinutes;
  const today = opts.today ?? localDate(new Date(), false, offset);
  const daysFrom = (date: Date) => Math.round((date.getTime() - today.getTime()) / DAY_MS);
  const horizon = new Date(today.getTime() + (EVENT_POLICY.maxRangeDays - 1) * DAY_MS);
  const windows = localRangeWindows(today, horizon, offset);
  const lo = new Date(Math.min(windows.allDay.from.getTime(), windows.timed.from.getTime()));

  const [children, pets, memorials, events] = await Promise.all([
    prisma.child.findMany({
      where: { spaceId, status: "born", birthDate: { not: null } },
      select: { id: true, name: true, nickname: true, birthDate: true },
    }),
    prisma.pet.findMany({
      where: { spaceId, status: "living" },
      select: {
        id: true,
        name: true,
        birthDate: true,
        birthDateEstimated: true,
        adoptedAt: true,
      },
    }),
    prisma.memorialProfile.findMany({
      where: { spaceId, passedAt: { not: null } },
      select: { id: true, name: true, passedAt: true },
    }),
    prisma.familyEvent.findMany({
      where: {
        spaceId,
        OR: [
          { recurrence: "yearly" },
          { endsAt: { gte: lo } },
          { endsAt: null, startsAt: { gte: lo } },
        ],
      },
      select: {
        id: true,
        title: true,
        kind: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        recurrence: true,
      },
    }),
  ]);

  const cards: Card[] = [];
  const yearly = (
    type: Card["type"],
    id: string,
    name: string | null,
    since: Date | null,
    extra: Partial<Card> = {},
  ) => {
    const next = since && nextAnniversary(since, today);
    if (next && next.daysUntil < opts.days) {
      cards.push({
        type,
        id,
        name,
        date: next.date,
        years: next.years,
        daysUntil: next.daysUntil,
        ...extra,
      });
    }
  };
  for (const c of children) yearly("child_birthday", c.id, c.name ?? c.nickname, c.birthDate);
  for (const p of pets) {
    yearly("pet_birthday", p.id, p.name, p.birthDate, { estimated: p.birthDateEstimated });
    yearly("pet_adoption", p.id, p.name, p.adoptedAt);
  }
  for (const m of memorials) yearly("memorial", m.id, m.name, m.passedAt);

  // 직접 등록한 일정의 회차 - 진행 중인 며칠짜리 모임은 오늘(0일)로 본다
  const occurrences = events.flatMap((event) =>
    occurrencesIn(event, event.allDay ? windows.allDay : windows.timed).map((span) => {
      const date = localDate(span.startsAt, event.allDay, offset);
      return {
        event,
        date,
        daysUntil: Math.max(0, daysFrom(date)),
        years:
          event.recurrence === "yearly"
            ? span.startsAt.getUTCFullYear() - event.startsAt.getUTCFullYear()
            : null,
      };
    }),
  );
  for (const o of occurrences) {
    if (o.event.kind !== "birthday" && o.event.kind !== "anniversary") continue;
    if (o.daysUntil >= opts.days) continue;
    cards.push({
      type: "event",
      id: o.event.id,
      name: o.event.title,
      date: o.date,
      years: o.years,
      daysUntil: o.daysUntil,
    });
  }

  const gathering = occurrences
    .filter((o) => o.event.kind === "gathering")
    .sort((a, b) => a.daysUntil - b.daysUntil || a.date.getTime() - b.date.getTime())[0];
  return {
    nextGathering: gathering
      ? {
          eventId: gathering.event.id,
          title: gathering.event.title,
          date: gathering.date,
          allDay: gathering.event.allDay,
          daysUntil: gathering.daysUntil,
        }
      : null,
    cards: cards.sort((a, b) => a.daysUntil - b.daysUntil || a.type.localeCompare(b.type)),
  };
}
