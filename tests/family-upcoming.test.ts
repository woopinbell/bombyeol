import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const KST = 540;

describe("family.upcoming 우리 탭 카드", () => {
  it("다가오는 생일, 입양기념일, 기일, 등록한 기념일을 남은 날 순으로, 예정일은 넣지 않는다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    await api.child.create({ spaceId, child: { name: "봄이", birthDate: "2024-10-10" } });
    await api.child.create({ spaceId, child: { nickname: "콩이", dueDate: "2026-10-15" } });
    const pet = await api.pet.create({
      spaceId,
      name: "보리",
      species: "dog",
      birthDate: "2020-10-05",
      birthDateEstimated: true,
      adoptedAt: "2021-11-20",
    });
    const star = await api.pet.create({
      spaceId,
      name: "나비",
      species: "cat",
      birthDate: "2010-10-06",
    });
    const memorial = await api.memorial.mark({
      spaceId,
      target: { type: "pet", petId: star.id },
      passedAt: "2025-10-20",
    });
    const birthday = await api.calendar.create({
      spaceId,
      title: "할머니 생신",
      kind: "birthday",
      when: { allDay: true, startDate: "1950-10-03" },
      recurrence: "yearly",
    });
    // 모임은 카드가 아니라 D-day로
    await api.calendar.create({
      spaceId,
      title: "가을 소풍",
      kind: "gathering",
      when: { allDay: true, startDate: "2026-10-04" },
    });

    const uncle = await addMember(prisma, spaceId, "relative", storage);
    const { cards } = await uncle.family.upcoming({
      spaceId,
      today: "2026-10-01",
      utcOffsetMinutes: KST,
    });
    expect(cards.map((c) => [c.type, c.name, c.years, c.daysUntil])).toEqual([
      ["event", "할머니 생신", 76, 2],
      ["pet_birthday", "보리", 6, 4],
      ["child_birthday", "봄이", 2, 9],
      ["memorial", "나비", 1, 19],
    ]);
    expect(cards[0]).toMatchObject({ id: birthday.id, date: d("2026-10-03") });
    expect(cards[1]).toMatchObject({ id: pet.id, estimated: true });
    expect(cards[3]).toMatchObject({ id: memorial.id });

    // 범위를 넓히면 입양기념일도 나온다
    const wide = await uncle.family.upcoming({ spaceId, today: "2026-10-01", days: 60 });
    expect(wide.cards.find((c) => c.type === "pet_adoption")).toMatchObject({
      name: "보리",
      years: 5,
      daysUntil: 50,
    });
  });

  it("다음 가족 모임 D-day: 지난 모임은 빼고, 시각 있는 모임은 현지 날짜로 센다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const gathering = (title: string, when: Parameters<typeof api.calendar.create>[0]["when"]) =>
      api.calendar.create({ spaceId, title, kind: "gathering", when });
    await gathering("지난 모임", { allDay: true, startDate: "2026-09-20" });
    await gathering("가을 소풍", { allDay: true, startDate: "2026-10-25" });
    // UTC 10월 1일 16:00 = 한국 10월 2일 01:00
    const late = await gathering("야간 출발", {
      allDay: false,
      startsAt: new Date("2026-10-01T16:00:00Z"),
    });

    const kst = await api.family.upcoming({ spaceId, today: "2026-10-01", utcOffsetMinutes: KST });
    expect(kst.nextGathering).toEqual({
      eventId: late.id,
      title: "야간 출발",
      date: d("2026-10-02"),
      allDay: false,
      daysUntil: 1,
    });
    const utc = await api.family.upcoming({ spaceId, today: "2026-10-01" });
    expect(utc.nextGathering).toMatchObject({ title: "야간 출발", daysUntil: 0 });

    // 진행 중인 며칠짜리 모임은 오늘(0일)
    await gathering("추석 여행", { allDay: true, startDate: "2026-09-30", endDate: "2026-10-03" });
    const during = await api.family.upcoming({ spaceId, today: "2026-10-01" });
    expect(during.nextGathering).toMatchObject({ title: "추석 여행", daysUntil: 0 });
  });

  it("모임이 없으면 D-day가 비어 있다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    await expect(api.family.upcoming({ spaceId, today: "2026-10-01" })).resolves.toEqual({
      nextGathering: null,
      cards: [],
    });
  });
});
