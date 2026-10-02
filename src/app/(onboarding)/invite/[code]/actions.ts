"use server";

import { redirect } from "next/navigation";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

export type JoinFormState = { attempt: number; error?: ErrorKey; relationLabel?: string };

/** 초대 수락(1회용). 이미 가족이면 바로 가족 홈으로, 성공하면 글자 크기 단계로. */
export async function joinFamily(prev: JoinFormState, form: FormData): Promise<JoinFormState> {
  const code = String(form.get("code") ?? "");
  const relationLabel = String(form.get("relationLabel") ?? "").trim();
  let alreadyMember = false;
  try {
    const caller = await serverCaller();
    await caller.invite.accept({ code, relationLabel: relationLabel || undefined });
  } catch (e) {
    const error = toErrorKey(e);
    if (error !== "ALREADY_MEMBER") return { attempt: prev.attempt + 1, error, relationLabel };
    alreadyMember = true;
  }
  // redirect는 try 밖에서(Next: redirect는 오류를 던져 이동한다)
  redirect(alreadyMember ? "/" : "/start/text-size?next=/");
}
