import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { Icon } from "@/components/ui/icon";
import { Lead } from "@/components/ui/screen";
import { loadFamily } from "@/server/family";

/** 이야기(별) 탭. 화면은 Phase 4 UI에서 채운다 - 지금은 별 면 위 빈 화면 */
export default async function StoryPage({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  await loadFamily(spaceId);
  const t = await getTranslations("storyTab");
  return (
    <TabPage header={<TabTitle>{t("title")}</TabTitle>}>
      <div className="flex flex-1 flex-col justify-center gap-3 pb-12">
        <Icon name="spark" className="size-12 text-starlight-gold" />
        <Lead>{t("empty")}</Lead>
      </div>
    </TabPage>
  );
}
