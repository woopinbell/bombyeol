import { describe, expect, it } from "vitest";
import {
  appendPage,
  dayKey,
  groupByDay,
  parseWho,
  type FeedMilestone,
  type FeedMoment,
} from "@/lib/today-feed";

const moment = (id: string, takenAt: string) => ({ id, takenAt: new Date(takenAt) }) as FeedMoment;
const milestone = (id: string, recordedAt: string) =>
  ({ id, recordedAt: new Date(`${recordedAt}T00:00:00Z`) }) as FeedMilestone;
const tz = "Asia/Seoul";

describe("오늘 피드 날짜별 장", () => {
  it("한국 시간 자정을 기준으로 날짜를 나눈다", () => {
    expect(dayKey(new Date("2026-10-01T14:59:00Z"), tz)).toBe("2026-10-01");
    expect(dayKey(new Date("2026-10-01T15:00:00Z"), tz)).toBe("2026-10-02");
  });

  it("최신 날짜부터, 한 장 안에 그 날의 기록과 마일스톤을 모은다", () => {
    const days = groupByDay(
      [
        moment("a", "2026-10-02T03:00:00Z"),
        moment("b", "2026-10-01T16:00:00Z"),
        moment("c", "2026-09-30T03:00:00Z"),
      ],
      [milestone("m1", "2026-10-01"), milestone("m2", "2026-10-02")],
      { timeZone: tz, hasMore: false },
    );
    expect(
      days.map((d) => [d.key, d.moments.map((m) => m.id), d.milestones.map((m) => m.id)]),
    ).toEqual([
      ["2026-10-02", ["a", "b"], ["m2"]],
      ["2026-10-01", [], ["m1"]],
      ["2026-09-30", ["c"], []],
    ]);
  });

  it("더 볼 기록이 남았으면 불러온 가장 오래된 날보다 앞선 마일스톤은 아직 넣지 않는다", () => {
    const moments = [moment("a", "2026-10-02T03:00:00Z")];
    const milestones = [milestone("old", "2026-09-01"), milestone("same", "2026-10-02")];
    expect(
      groupByDay(moments, milestones, { timeZone: tz, hasMore: true }).map((d) => d.key),
    ).toEqual(["2026-10-02"]);
    expect(
      groupByDay(moments, milestones, { timeZone: tz, hasMore: false }).map((d) => d.key),
    ).toEqual(["2026-10-02", "2026-09-01"]);
  });

  it("기록이 없어도 마일스톤만으로 장이 생긴다", () => {
    expect(
      groupByDay([], [milestone("m", "2026-10-02")], { timeZone: tz, hasMore: false }),
    ).toHaveLength(1);
  });

  it("다음 페이지에 같은 기록이 다시 와도 한 번만 넣는다", () => {
    const first = [moment("a", "2026-10-02T03:00:00Z"), moment("b", "2026-10-01T03:00:00Z")];
    const next = [moment("b", "2026-10-01T03:00:00Z"), moment("c", "2026-09-30T03:00:00Z")];
    expect(appendPage(first, next).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("누구의 기록 고르기", () => {
  const space = {
    children: [{ id: "kid" }],
    pets: [{ id: "dog" }],
  } as Parameters<typeof parseWho>[1];

  it("이 가족의 아이, 반려동물만 받고 나머지는 모두로 본다", () => {
    expect(parseWho("child:kid", space)).toEqual({ type: "child", childId: "kid" });
    expect(parseWho("pet:dog", space)).toEqual({ type: "pet", petId: "dog" });
    expect(parseWho("child:other", space)).toEqual({ type: "all" });
    expect(parseWho("pet:kid", space)).toEqual({ type: "all" });
    expect(parseWho(["child:kid"], space)).toEqual({ type: "all" });
    expect(parseWho(undefined, space)).toEqual({ type: "all" });
  });
});
