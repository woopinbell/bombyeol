import { describe, expect, it } from "vitest";
import {
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
} from "@/server/invite-code";

describe("초대코드", () => {
  it("6자이고 허용 문자만 쓴다", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      for (const ch of code) expect(INVITE_ALPHABET).toContain(ch);
    }
  });

  it("헷갈리는 문자(0, O, 1, I, L)를 쓰지 않는다", () => {
    for (const ch of "0O1IL") expect(INVITE_ALPHABET).not.toContain(ch);
  });

  it("입력은 대소문자, 공백, 하이픈을 무시하고, 형식이 틀리면 null", () => {
    expect(normalizeInviteCode(" abc-def ")).toBe("ABCDEF");
    expect(normalizeInviteCode("ABCDE")).toBeNull();
    expect(normalizeInviteCode("ABCDE0")).toBeNull();
  });
});
