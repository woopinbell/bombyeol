import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import ko from "../messages/ko.json";
import { ERROR_KEYS, toErrorKey } from "../src/lib/action-errors";
import { inviteError, limitError } from "../src/server/errors";

describe("서버 오류 → 문구 키", () => {
  it("모든 키에 문구가 있다", () => {
    for (const key of ERROR_KEYS) expect(ko.errors[key], key).toBeTruthy();
  });

  it("서버 사유 코드를 그대로 쓴다", () => {
    expect(toErrorKey(inviteError("INVITE_INVALID"))).toBe("INVITE_INVALID");
    expect(toErrorKey(limitError("RATE_LIMITED"))).toBe("RATE_LIMITED");
    expect(toErrorKey(limitError("SPACE_CREATE_LIMIT"))).toBe("SPACE_CREATE_LIMIT");
  });

  it("입력 검사 실패는 refine 사유 코드, 없으면 INVALID_INPUT", () => {
    const withIssue = new TRPCError({
      code: "BAD_REQUEST",
      cause: Object.assign(new Error("zod"), { issues: [{ message: "NAME_REQUIRED" }] }),
    });
    expect(toErrorKey(withIssue)).toBe("NAME_REQUIRED");
    expect(toErrorKey(new TRPCError({ code: "BAD_REQUEST", message: "[...]" }))).toBe(
      "INVALID_INPUT",
    );
  });

  it("로그인 만료·모르는 오류는 내부 내용을 드러내지 않는다", () => {
    expect(toErrorKey(new TRPCError({ code: "UNAUTHORIZED" }))).toBe("SIGN_IN_REQUIRED");
    expect(toErrorKey(new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "db down" }))).toBe(
      "UNKNOWN",
    );
    expect(toErrorKey(new Error("boom"))).toBe("UNKNOWN");
  });
});
