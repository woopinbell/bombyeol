"use server";

import { signOut } from "@/auth";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 계정 지우기(즉시, 되돌릴 수 없음 - G-06). 처리 범위는 user.deleteAccount. 지운 뒤 이 기기의 세션도 지우고
 * 안내 화면으로(다른 기기의 세션은 서버가 다음 요청부터 막는다).
 */
export async function deleteMyAccount(): Promise<{ error: ErrorKey }> {
  try {
    const caller = await serverCaller();
    await caller.user.deleteAccount({ confirm: true });
  } catch (error) {
    return { error: toErrorKey(error) };
  }
  await signOut({ redirectTo: "/account/delete?done=1" });
  return { error: "UNKNOWN" };
}
