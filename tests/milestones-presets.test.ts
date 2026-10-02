import { describe, expect, it } from "vitest";
import { ageInMonths, milestonePreset, suggestChildMilestones } from "@/lib/milestones";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("마일스톤 프리셋", () => {
  it("만 개월 수는 날짜가 지나야 한 달을 센다", () => {
    expect(ageInMonths(d("2026-01-15"), d("2026-07-14"))).toBe(5);
    expect(ageInMonths(d("2026-01-15"), d("2026-07-15"))).toBe(6);
    expect(ageInMonths(d("2026-01-15"), d("2025-12-01"))).toBe(0);
  });

  it("나이 창에 들어온 기록하지 않은 '처음'을 먼저 제안한다", () => {
    const birth = d("2026-01-01");
    expect(suggestChildMilestones(birth, new Set(), d("2026-07-10"))).toEqual([
      "roll",
      "sit",
      "tooth",
      "crawl",
      "height",
      "weight",
    ]);
    expect(suggestChildMilestones(birth, new Set(["roll", "sit"]), d("2026-07-10"))).toEqual([
      "tooth",
      "crawl",
      "height",
      "weight",
    ]);
    expect(suggestChildMilestones(birth, new Set(), d("2026-02-01"))).toEqual(["height", "weight"]);
    expect(suggestChildMilestones(null, new Set())).toEqual([]);
  });

  it("대상별 프리셋만 허용하고 상속 키는 프리셋이 아니다", () => {
    expect(milestonePreset("child", "step")).not.toBeNull();
    expect(milestonePreset("child", "adoption")).toBeNull();
    expect(milestonePreset("pet", "adoption")).not.toBeNull();
    expect(milestonePreset("pet", "toString")).toBeNull();
  });
});
