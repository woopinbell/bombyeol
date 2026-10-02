import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { requireSignedIn } from "@/server/session";
import { serverCaller } from "@/server/trpc/server-caller";

/**
 * 가족 홈(온보딩이 끝나면 오는 곳). 오늘, 이야기, 우리 탭 화면은 Phase 3~5 UI에서 채운다 -
 * 지금은 가족 이름과 빈 상태, 부모에게는 초대 바로가기만. 멤버가 아니면 있는지도 드러내지 않는다(404).
 */
export default async function FamilyHome({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  await requireSignedIn(`/s/${spaceId}`);
  const caller = await serverCaller();
  const [space, mine] = await Promise.all([
    caller.space.get({ spaceId }).catch(() => null),
    caller.space.list(),
  ]);
  if (!space) notFound();
  const myRole = mine.find((m) => m.space.id === spaceId)?.role;
  const t = await getTranslations("home");
  return (
    <Screen
      top={<p className="text-title-s font-bold">{space.name}</p>}
      actions={
        myRole === "parent" ? (
          <Link
            href={`/start/invite/${space.id}`}
            className={buttonClass({ size: "elder", block: true })}
          >
            {t("invite")}
          </Link>
        ) : null
      }
    >
      <Title size="title">{t("emptyTitle")}</Title>
      <Lead>{t("emptyLead")}</Lead>
    </Screen>
  );
}
