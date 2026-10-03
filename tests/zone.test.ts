import { describe, expect, it } from "vitest";
import { zoneOffsetMinutes } from "../src/lib/zone";

describe("시간대 차이", () => {
  it("서울은 +9시간, UTC는 0, 뉴욕은 여름과 겨울이 다르다", () => {
    const at = new Date("2026-10-03T12:34:56Z");
    expect(zoneOffsetMinutes("Asia/Seoul", at)).toBe(540);
    expect(zoneOffsetMinutes("UTC", at)).toBe(0);
    expect(zoneOffsetMinutes("America/New_York", at)).toBe(-240);
    expect(zoneOffsetMinutes("America/New_York", new Date("2026-01-15T00:00:00Z"))).toBe(-300);
  });
});
