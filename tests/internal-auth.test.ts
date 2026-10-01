import { describe, expect, it } from "vitest";
import { internalToken, safeEqual } from "@/server/internal-auth";

describe("Cron 내부 호출 토큰", () => {
  it("같은 시크릿이면 같은 토큰, 다르면 다른 토큰", async () => {
    const a = await internalToken("secret-a");
    expect(await internalToken("secret-a")).toBe(a);
    expect(await internalToken("secret-b")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("safeEqual은 길이가 달라도 false", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
