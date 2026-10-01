import { TRPCError } from "@trpc/server";

// 클라이언트가 문구 키로 바꿔 보여줄 수 있도록 메시지는 고정된 사유 코드로 둔다.
export type LimitReason =
  | "SPACE_CREATE_LIMIT"
  | "MEMBERSHIP_LIMIT"
  | "CHILD_LIMIT"
  | "MEMBER_ROLE_LIMIT"
  | "INVITE_ACTIVE_LIMIT"
  | "FILE_TOO_LARGE"
  | "STORAGE_LIMIT"
  | "PENDING_LIMIT"
  | "RATE_LIMITED";

export type InviteFailure = "INVITE_INVALID" | "ALREADY_MEMBER";

export function limitError(reason: LimitReason) {
  return new TRPCError({
    code: reason === "RATE_LIMITED" ? "TOO_MANY_REQUESTS" : "PRECONDITION_FAILED",
    message: reason,
  });
}

export function inviteError(reason: InviteFailure) {
  return new TRPCError({
    code: reason === "INVITE_INVALID" ? "NOT_FOUND" : "CONFLICT",
    message: reason,
  });
}

export type MediaFailure = "UPLOAD_NOT_FOUND" | "UPLOAD_MISMATCH" | "ASSET_INVALID";

export function mediaError(reason: MediaFailure) {
  return new TRPCError({
    code: reason === "UPLOAD_MISMATCH" ? "BAD_REQUEST" : "NOT_FOUND",
    message: reason,
  });
}

/** 같은 Space에 없는 대상(아이·반려동물·기록 등). 존재 여부를 드러내지 않는다 */
export function notFound(reason: "SUBJECT_NOT_FOUND" | "ITEM_NOT_FOUND") {
  return new TRPCError({ code: "NOT_FOUND", message: reason });
}

export type InputFailure =
  "NAME_REQUIRED" | "DATE_IN_FUTURE" | "USE_MARK_BORN" | "CHILD_ALREADY_BORN";

/** 스키마로 표현하기 어려운 입력 규칙 위반 */
export function inputError(reason: InputFailure) {
  return new TRPCError({
    code: reason === "CHILD_ALREADY_BORN" ? "CONFLICT" : "BAD_REQUEST",
    message: reason,
  });
}
