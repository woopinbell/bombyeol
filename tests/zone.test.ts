import { describe, expect, it } from "vitest";
import { zonedInstant, zoneOffsetMinutes } from "../src/lib/zone";

describe("시간대 차이", () => {
  it("서울은 +9시간, UTC는 0, 뉴욕은 여름과 겨울이 다르다", () => {
    const at = new Date("2026-10-03T12:34:56Z");
    expect(zoneOffsetMinutes("Asia/Seoul", at)).toBe(540);
    expect(zoneOffsetMinutes("UTC", at)).toBe(0);
    expect(zoneOffsetMinutes("America/New_York", at)).toBe(-240);
    expect(zoneOffsetMinutes("America/New_York", new Date("2026-01-15T00:00:00Z"))).toBe(-300);
  });

  it("적은 날짜, 시각을 그 시간대의 순간으로 읽는다", () => {
    expect(zonedInstant("2026-10-20", "18:30", "Asia/Seoul").toISOString()).toBe(
      "2026-10-20T09:30:00.000Z",
    );
    expect(zonedInstant("2026-10-21", "00:10", "Asia/Seoul").toISOString()).toBe(
      "2026-10-20T15:10:00.000Z",
    );
    expect(zonedInstant("2026-07-01", "09:00", "America/New_York").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
  });
});
