"use server";

import { signIn } from "@/auth";
import { safeNext } from "@/lib/safe-next";

const PROVIDERS = ["kakao", "google"] as const;

/** 로그인 시작(Auth.js). 레이트 리밋은 /api/auth 라우트가 건다(G-07). */
export async function signInWith(formData: FormData) {
  const provider = formData.get("provider");
  if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) return;
  await signIn(provider as string, { redirectTo: safeNext(formData.get("next")) });
}
