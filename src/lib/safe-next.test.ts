import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext — 열린 리다이렉트 방지", () => {
  it("같은 사이트의 화면 경로만 통과", () => {
    expect(safeNext("/invite/ABC123")).toBe("/invite/ABC123");
    expect(safeNext("/s/1?x=1")).toBe("/s/1?x=1");
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/api/auth/signout",
    "",
    null,
    42,
  ])("%s → 기본 경로", (value) => {
    expect(safeNext(value)).toBe("/");
  });
});
