"use server";

import { redirect } from "next/navigation";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { safeNext } from "@/lib/safe-next";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 가입 동의(이용약관, 개인정보 처리방침): 화면이 보여준 버전으로 둘 다 남기고 원래 가려던 곳으로.
 * 버전이 그사이 바뀌었으면 CONSENT_VERSION_STALE - 화면을 다시 읽게 한다.
 */
export async function agreeToTerms(
  versions: { terms: string; privacy: string },
  next: string,
): Promise<{ error: ErrorKey }> {
  try {
    const caller = await serverCaller();
    await caller.consent.grantAccount({ kind: "terms", version: versions.terms });
    await caller.consent.grantAccount({ kind: "privacy", version: versions.privacy });
  } catch (error) {
    return { error: toErrorKey(error) };
  }
  redirect(safeNext(next));
}
