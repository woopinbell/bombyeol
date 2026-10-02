import { redirect } from "next/navigation";
import { requireSignedIn } from "@/server/session";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 첫 화면 라우팅: 비로그인 → 로그인, 가족 없음 → 시작(가족 만들기 또는 초대 코드), 가족 있음 → 가족 홈.
 * 가족이 여럿이면 먼저 함께한 가족(가족 고르기는 우리 탭 UI 때).
 */
export default async function Home() {
  await requireSignedIn("/");
  const spaces = await (await serverCaller()).space.list();
  if (spaces.length === 0) redirect("/start");
  redirect(`/s/${spaces[0].space.id}`);
}
