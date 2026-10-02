import { TRPCError } from "@trpc/server";

/**
 * 서버 오류 → 화면 문구 키(messages/ko.json `errors.*`). 서버는 사유 코드만 보내고(src/server/errors.ts)
 * 문구는 화면이 고른다. 모르는 오류는 UNKNOWN(내부 내용을 그대로 보여주지 않는다).
 */
export const ERROR_KEYS = [
  "INVITE_INVALID",
  "ALREADY_MEMBER",
  "MEMBERSHIP_LIMIT",
  "MEMBER_ROLE_LIMIT",
  "SPACE_CREATE_LIMIT",
  "CHILD_LIMIT",
  "INVITE_ACTIVE_LIMIT",
  "RATE_LIMITED",
  "SPACE_DELETING",
  "NAME_REQUIRED",
  "ONE_DATE_REQUIRED",
  "DATE_IN_FUTURE",
  "INVALID_INPUT",
  "FILE_TOO_LARGE",
  "STORAGE_LIMIT",
  "PENDING_LIMIT",
  "UNSUPPORTED_TYPE",
  "UPLOAD_FAILED",
  "UPLOAD_MISMATCH",
  "MEDIA_REQUIRED",
  "BODY_REQUIRED",
  "MILESTONE_EXISTS",
  "MILESTONE_VALUE_INVALID",
  "MEMORIAL_READ_ONLY",
  "ITEM_NOT_FOUND",
  "SUBJECT_NOT_FOUND",
  "FORBIDDEN",
  "SIGN_IN_REQUIRED",
  "UNKNOWN",
] as const;
export type ErrorKey = (typeof ERROR_KEYS)[number];

const isKey = (value: unknown): value is ErrorKey =>
  typeof value === "string" && (ERROR_KEYS as readonly string[]).includes(value);

export function toErrorKey(error: unknown): ErrorKey {
  if (!(error instanceof TRPCError)) return "UNKNOWN";
  if (isKey(error.message)) return error.message;
  if (error.code === "BAD_REQUEST") {
    // 입력 검사(zod) 실패: refine에 붙인 사유 코드가 있으면 그것을 쓴다
    const issues = (error.cause as { issues?: { message?: string }[] } | undefined)?.issues ?? [];
    return issues.map((i) => i.message).find(isKey) ?? "INVALID_INPUT";
  }
  if (error.code === "UNAUTHORIZED") return "SIGN_IN_REQUIRED";
  if (error.code === "FORBIDDEN") return "FORBIDDEN";
  if (error.code === "TOO_MANY_REQUESTS") return "RATE_LIMITED";
  return "UNKNOWN";
}
