import { TRPCError } from "@trpc/server";
import { notFound, redirect } from "next/navigation";
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
  const space = await caller.space.get({ spaceId }).catch((error) => {
    // 세션은 남았는데 계정이 지워진 경우: 다시 로그인하게 한다
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=${encodeURIComponent(`/s/${spaceId}`)}`);
    }
    // 멤버가 아니거나 없는 Space, 잘못된 주소는 있는지도 드러내지 않는다
    if (error instanceof TRPCError && ["NOT_FOUND", "BAD_REQUEST"].includes(error.code)) {
      notFound();
    }
    throw error;
  });
  return { caller, space, role: space.myRole, userId };
});

export type Family = Awaited<ReturnType<typeof loadFamily>>;
