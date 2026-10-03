import { describe, expect, it } from "vitest";
import { monthRange, parseMonth } from "../src/lib/month";

describe("달력 한 달", () => {
  it("첫날, 마지막 날(윤년 2월 포함)과 앞뒤 달(해 넘김)", () => {
    expect(monthRange("2026-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      prev: "2026-09",
      next: "2026-11",
    });
    expect(monthRange("2028-02").to).toBe("2028-02-29");
    expect(monthRange("2026-01").prev).toBe("2025-12");
    expect(monthRange("2026-12").next).toBe("2027-01");
  });

  it("잘못된 값이면 오늘이 든 달", () => {
    expect(parseMonth("2026-03", "2026-10-03")).toBe("2026-03");
    for (const bad of ["2026-13", "26-03", "abcd-01", "1800-01", undefined, ["2026-03"]]) {
      expect(parseMonth(bad, "2026-10-03")).toBe("2026-10");
    }
  });
});
