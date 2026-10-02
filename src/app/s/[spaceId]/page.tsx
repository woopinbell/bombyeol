import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { Lead, Title } from "@/components/ui/screen";
import { loadFamily } from "@/server/family";

/** 오늘(봄) 탭. 피드는 다음 단계에서 채운다 */
export default async function TodayPage({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const { space } = await loadFamily(spaceId);
  const t = await getTranslations("home");
  return (
    <TabPage header={<TabTitle>{space.name}</TabTitle>}>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <Title size="title">{t("emptyTitle")}</Title>
        <Lead>{t("emptyLead")}</Lead>
      </div>
    </TabPage>
  );
}
