"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { requestOrigin } from "@/server/request-origin";
import { serverCaller } from "@/server/trpc/server-caller";

export type InviteFormState = {
  attempt: number;
  error?: ErrorKey;
  relation?: string;
  invite?: { code: string; link: string; relationLabel: string | null; expiresAt: string };
};

/** 어르신 초대 만들기(parent). 링크는 같은 코드를 쓴다: /invite/{code} */
export async function createInvite(
  prev: InviteFormState,
  form: FormData,
): Promise<InviteFormState> {
  const spaceId = String(form.get("spaceId") ?? "");
  const choice = String(form.get("relation") ?? "").trim();
  const relationLabel = (
    choice === "custom" ? String(form.get("relationCustom") ?? "") : choice
  ).trim();
  try {
    const caller = await serverCaller();
    const invite = await caller.invite.create({
      spaceId,
      role: "grandparent",
      relationLabel: relationLabel || undefined,
    });
    return {
      attempt: prev.attempt + 1,
      relation: choice,
      invite: {
        code: invite.code,
        link: `${await requestOrigin()}/invite/${invite.code}`,
        relationLabel: invite.relationLabel,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    return { attempt: prev.attempt + 1, relation: choice, error: toErrorKey(error) };
  }
}
