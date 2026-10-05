import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { serverCaller } from "@/server/trpc/server-caller";

/** 로그인이 필요한 화면: 없으면 로그인으로 보내고 끝나면 돌아오게 한다. 권한 검사 자체는 tRPC 프로시저가 한다. */
export async function requireSignedIn(next: string): Promise<string> {
  const session = await auth();
  if (!session?.userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session.userId;
}

/** 가입 동의(약관, 처리방침)가 현재 버전으로 다 있는지. 계정이 지워졌으면(조회 실패) 빠진 것으로 보지 않는다 - 그 처리는 다음 화면이 */
export async function accountConsentMissing(): Promise<boolean> {
  const caller = await serverCaller();
  const status = await caller.consent.status({}).catch(() => null);
  return Boolean(status?.account.some((c) => !c.granted));
}

/** 로그인 + 가입 동의가 필요한 화면: 동의 전이면 동의 화면을 거쳐 돌아오게 한다 */
export async function requireAgreed(next: string): Promise<string> {
  const userId = await requireSignedIn(next);
  if (await accountConsentMissing()) redirect(`/agree?next=${encodeURIComponent(next)}`);
  return userId;
}
