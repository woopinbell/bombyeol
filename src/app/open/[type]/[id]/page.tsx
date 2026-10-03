import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import { OPEN_LINK_TYPES } from "@/server/routers/push";
import { requireSignedIn } from "@/server/session";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 알림, 공유 링크의 입구(`/open/{종류}/{id}`, ARCHITECTURE §7): 로그인 뒤 그 기록이 있는 화면으로 보낸다.
 * 지워졌거나 볼 수 없는 기록이면 첫 화면으로(있는지 드러내지 않는다).
 */
export default async function OpenPage({ params }: PageProps<"/open/[type]/[id]">) {
  const { type, id } = await params;
  await requireSignedIn(`/open/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
  const kind = OPEN_LINK_TYPES.find((t) => t === type);
  if (!kind) redirect("/");
  const caller = await serverCaller();
  const target = await caller.push.openLink({ type: kind, id }).catch((error) => {
    if (error instanceof TRPCError && ["NOT_FOUND", "BAD_REQUEST"].includes(error.code)) {
      return null;
    }
    throw error;
  });
  redirect(target?.path ?? "/");
}
