import { notFound } from "next/navigation";
import { cache } from "react";
import { requireSignedIn } from "@/server/session";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 가족 홈 화면들이 함께 쓰는 조회: 로그인 확인, Space 상세, 내 역할. 한 요청 안에서는 한 번만 부른다(cache).
 * 멤버가 아니면 있는지도 드러내지 않는다(404).
 */
export const loadFamily = cache(async (spaceId: string) => {
  const userId = await requireSignedIn(`/s/${spaceId}`);
  const caller = await serverCaller();
  const [space, mine] = await Promise.all([
    caller.space.get({ spaceId }).catch(() => null),
    caller.space.list(),
  ]);
  const membership = mine.find((m) => m.space.id === spaceId);
  if (!space || !membership) notFound();
  return { caller, space, role: membership.role, userId };
});

export type Family = Awaited<ReturnType<typeof loadFamily>>;
