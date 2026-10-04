"use server";

import { signIn, signOut } from "@/auth";
import { safeNext } from "@/lib/safe-next";

const PROVIDERS = ["kakao", "google"] as const;

/** 로그인 시작(Auth.js). 레이트 리밋은 /api/auth 라우트가 건다(G-07). */
export async function signInWith(formData: FormData) {
  const provider = formData.get("provider");
  if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) return;
  await signIn(provider as string, { redirectTo: safeNext(formData.get("next")) });
}

/** 로그아웃: 이 기기의 세션만 지운다. 푸시 토큰 해제는 화면이 먼저 한다(src/components/auth/sign-out.tsx) */
export async function signOutNow() {
  await signOut({ redirectTo: "/login" });
}
