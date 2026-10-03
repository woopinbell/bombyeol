import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { Title } from "@/components/ui/screen";
import { ExportPanel } from "@/components/us/export-panel";
import { loadFamily } from "@/server/family";

/** 가족 앨범 내려받기(parent, Space 삭제 유예 중에도 - PRIVACY §5). ZIP은 브라우저가 만든다 */
export default async function ExportPage({ params }: PageProps<"/s/[spaceId]/us/export">) {
  const { spaceId } = await params;
  const { role, space } = await loadFamily(spaceId);
  if (role !== "parent") notFound();
  const t = await getTranslations("privacy.export");
  const back = await getTranslations("usTab");
  return (
    <TabPage
      header={<BackLink href={`/s/${spaceId}/us/settings`}>{back("settingsBack")}</BackLink>}
    >
      <div className="flex flex-col gap-6 pt-2 pb-12">
        <Title size="title">{t("title")}</Title>
        <p>{t("lead")}</p>
        <div className="flex flex-col gap-2 text-fg-muted">
          <p>{t("tip1")}</p>
          <p>{t("tip2")}</p>
          <p>{t("tip3")}</p>
        </div>
        <ExportPanel spaceId={spaceId} spaceName={space.name} />
      </div>
    </TabPage>
  );
}
