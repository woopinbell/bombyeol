import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { localRangeWindows, occurrencesIn } from "@/lib/calendar";
import { EVENT_POLICY, RATE_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const KST = 540;

describe("캘린더 회차 계산", () => {
  it("현지 날짜 범위: 종일은 날짜 그대로, 시각 있는 일정은 현지 자정을 UTC로", () => {
    expect(localRangeWindows(d("2026-10-01"), d("2026-10-31"), KST)).toEqual({
      allDay: { from: d("2026-10-01"), to: d("2026-11-01") },
      timed: {
        from: new Date("2026-09-30T15:00:00Z"),
        to: new Date("2026-10-31T15:00:00Z"),
      },
    });
  });

  it("매년 반복은 처음 해부터 펼치고 길이를 유지한다(2월 29일은 평년에 28일)", () => {
    const window = { from: d("2027-01-01"), to: d("2028-01-01") };
    expect(
      occurrencesIn(
        { startsAt: d("2024-02-29"), endsAt: d("2024-03-01"), recurrence: "yearly" },
        window,
      ),
    ).toEqual([{ startsAt: d("2027-02-28"), endsAt: d("2027-03-01") }]);
    expect(
      occurrencesIn({ startsAt: d("2028-05-05"), endsAt: null, recurrence: "yearly" }, window),
    ).toEqual([]);
    // 해를 넘기는 일정은 앞 해의 회차가 범위에 걸칠 수 있다
    expect(
      occurrencesIn(
        { startsAt: d("2020-12-30"), endsAt: d("2021-01-02"), recurrence: "yearly" },
        window,
      ),
    ).toEqual([
      { startsAt: d("2026-12-30"), endsAt: d("2027-01-02") },
      { startsAt: d("2027-12-30"), endsAt: d("2028-01-02") },
    ]);
  });
});

describe("calendar 가족 캘린더", () => {
  it("종일, 시각 있는 일정을 만들고 현지 날짜 범위로 조회한다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const allDay = (title: string, startDate: string) =>
      api.calendar.create({
        spaceId,
        title,
        kind: "other",
        when: { allDay: true, startDate },
      });
    await allDay("첫날", "2026-10-01");
    await allDay("마지막 날", "2026-10-31");
    await allDay("다음 달", "2026-11-01");
    // 한국 시각 10월 1일 01:00 = UTC 9월 30일 16:00
    const dinner = await api.calendar.create({
      spaceId,
      title: "저녁 모임",
      kind: "gathering",
      when: { allDay: false, startsAt: new Date("2026-09-30T16:00:00Z") },
    });
    expect(dinner).toMatchObject({ allDay: false, recurrence: "none", endsAt: null });

    const october = await api.calendar.list({
      spaceId,
      from: "2026-10-01",
      to: "2026-10-31",
      utcOffsetMinutes: KST,
    });
    expect(october.map((e) => e.title)).toEqual(["첫날", "저녁 모임", "마지막 날"]);
    // UTC 기준 10월에는 그 저녁 모임이 9월 30일이다
    const utc = await api.calendar.list({ spaceId, from: "2026-10-01", to: "2026-10-31" });
    expect(utc.map((e) => e.title)).toEqual(["첫날", "마지막 날"]);
  });

  it("매년 반복 일정은 범위 안의 회차로, 며칠짜리 일정은 걸치기만 해도 나온다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const birthday = await api.calendar.create({
      spaceId,
      title: "할머니 생신",
      kind: "birthday",
      when: { allDay: true, startDate: "1950-10-09" },
      recurrence: "yearly",
    });
    await api.calendar.create({
      spaceId,
      title: "추석 여행",
      kind: "gathering",
      when: { allDay: true, startDate: "2026-09-28", endDate: "2026-10-02" },
    });
    const list = await api.calendar.list({ spaceId, from: "2026-10-01", to: "2026-10-31" });
    expect(list.map((e) => [e.title, e.startsAt])).toEqual([
      ["추석 여행", d("2026-09-28")],
      ["할머니 생신", d("2026-10-09")],
    ]);
    expect(list[1]).toMatchObject({ id: birthday.id, recurrence: "yearly" });
  });

  it("쓰기는 parent, grandparent, 고치기, 지우기는 만든 사람 또는 parent", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const grandma = await addMember(prisma, spaceId, "grandparent", storage);
    const uncle = await addMember(prisma, spaceId, "relative", storage);
    const input = {
      spaceId,
      title: "가족 모임",
      kind: "gathering",
      when: { allDay: true, startDate: "2026-11-01" },
    } as const;
    await expect(uncle.calendar.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const mine = await grandma.calendar.create(input);
    const parents = await api.calendar.create(input);

    await expect(
      grandma.calendar.update({ spaceId, eventId: parents.id, title: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(uncle.calendar.delete({ spaceId, eventId: mine.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      grandma.calendar.update({
        spaceId,
        eventId: mine.id,
        when: { allDay: false, startsAt: new Date("2026-11-01T03:00:00Z") },
        note: "점심",
      }),
    ).resolves.toMatchObject({ allDay: false, note: "점심" });
    await expect(
      api.calendar.update({ spaceId, eventId: mine.id, recurrence: "yearly" }),
    ).resolves.toMatchObject({ recurrence: "yearly" });
    await api.calendar.delete({ spaceId, eventId: mine.id });
    expect(await prisma.familyEvent.count()).toBe(1);

    const other = await mediaSetup(prisma);
    await expect(
      other.api.calendar.delete({ spaceId: other.spaceId, eventId: parents.id }),
    ).rejects.toMatchObject({ message: "ITEM_NOT_FOUND" });
  });

  it("끝이 시작보다 앞서거나 너무 긴 일정, 범위는 받지 않는다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const base = { spaceId, title: "x", kind: "other" } as const;
    await expect(
      api.calendar.create({
        ...base,
        when: { allDay: true, startDate: "2026-10-05", endDate: "2026-10-04" },
      }),
    ).rejects.toMatchObject({ message: "EVENT_RANGE_INVALID" });
    await expect(
      api.calendar.create({
        ...base,
        when: { allDay: true, startDate: "2026-10-01", endDate: "2026-12-01" },
      }),
    ).rejects.toMatchObject({ message: "EVENT_RANGE_INVALID" });
    await expect(
      api.calendar.list({ spaceId, from: "2026-01-01", to: "2027-06-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.calendar.list({ spaceId, from: "2026-10-02", to: "2026-10-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("G-11: Space당 일정 수 상한", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    const input = {
      spaceId,
      title: "x",
      kind: "other",
      when: { allDay: true, startDate: "2026-10-01" },
    } as const;
    await prisma.familyEvent.createMany({
      data: Array.from({ length: EVENT_POLICY.maxPerSpace }, () => ({
        spaceId,
        title: "x",
        kind: "other" as const,
        startsAt: d("2026-10-01"),
        allDay: true,
        createdById: parent.id,
      })),
    });
    await expect(api.calendar.create(input)).rejects.toMatchObject({ message: "EVENT_LIMIT" });
  });

  it("G-07: 일정 쓰기 리밋", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    const input = {
      spaceId,
      title: "x",
      kind: "other",
      when: { allDay: true, startDate: "2026-10-01" },
    } as const;
    await exhaustRateLimit(prisma, `event-write:${parent.id}`, RATE_LIMITS.eventWritePerUser);
    await expect(api.calendar.create(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
