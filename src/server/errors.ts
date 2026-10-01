import { TRPCError } from "@trpc/server";

// 클라이언트가 문구 키로 바꿔 보여줄 수 있도록 메시지는 고정된 사유 코드로 둔다.
export type LimitReason =
  | "SPACE_CREATE_LIMIT"
  | "MEMBERSHIP_LIMIT"
  | "CHILD_LIMIT"
  | "MEMBER_ROLE_LIMIT"
  | "INVITE_ACTIVE_LIMIT"
  | "RATE_LIMITED";

export function limitError(reason: LimitReason) {
  return new TRPCError({
    code: reason === "RATE_LIMITED" ? "TOO_MANY_REQUESTS" : "PRECONDITION_FAILED",
    message: reason,
  });
}
