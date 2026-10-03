"use server";

import { TRPCError } from "@trpc/server";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

type Done = { ok: true } | { error: ErrorKey };

/** 초대 거두기(parent, 프로시저가 검사). 그새 쓰였거나 거둔 초대면 할 일이 없으니 된 것으로 본다 */
export async function revokeInvite(spaceId: string, inviteId: string): Promise<Done> {
  try {
    const caller = await serverCaller();
    await caller.invite.revoke({ spaceId, inviteId });
    return { ok: true };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return { ok: true };
    return { error: toErrorKey(error) };
  }
}

/** 이 기기의 푸시 토큰 등록, 갱신(계정 단위 - 어느 가족의 알림인지는 발송 때 멤버십으로 정한다) */
export async function registerPushToken(token: string): Promise<Done> {
  try {
    const caller = await serverCaller();
    await caller.push.register({ token });
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

/** 이 기기 알림 끄기: 내 토큰만 지운다(없어도 된 것으로 본다) */
export async function unregisterPushToken(token: string): Promise<Done> {
  try {
    const caller = await serverCaller();
    await caller.push.unregister({ token });
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}
