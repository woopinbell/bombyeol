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
