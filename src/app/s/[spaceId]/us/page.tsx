import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Lead } from "@/components/ui/screen";
import { loadFamily } from "@/server/family";

/** 우리 탭. 달력, 구성원 화면은 Phase 5 UI에서 채운다 - 지금은 초대 바로가기(부모)만 */
export default async function UsPage({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const { space, role } = await loadFamily(spaceId);
  const t = await getTranslations("usTab");
  return (
    <TabPage header={<TabTitle>{space.name}</TabTitle>}>
      <div className="flex flex-1 flex-col justify-center gap-6 pb-12">
        <Lead>{t("empty")}</Lead>
        {role === "parent" ? (
          <Link href={`/start/invite/${space.id}`} className={buttonClass({ block: true })}>
            {t("invite")}
          </Link>
        ) : null}
      </div>
    </TabPage>
  );
}
