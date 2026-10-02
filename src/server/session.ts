import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** 로그인이 필요한 화면: 없으면 로그인으로 보내고 끝나면 돌아오게 한다. 권한 검사 자체는 tRPC 프로시저가 한다. */
export async function requireSignedIn(next: string): Promise<string> {
  const session = await auth();
  if (!session?.userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session.userId;
}
