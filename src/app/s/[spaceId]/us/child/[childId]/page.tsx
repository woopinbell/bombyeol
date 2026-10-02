import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { ChildForm, MarkBornForm, type ChildValues } from "@/components/us/child-form";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { childName, dateOnlyKey, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/** 아이 정보 고치기(parent): 이름, 태명, 날짜. 곧 태어날 아이는 아래에서 태어났어요로 바꾼다 */
export default async function EditChildPage({
  params,
}: PageProps<"/s/[spaceId]/us/child/[childId]">) {
  const { spaceId, childId } = await params;
  const { role, space } = await loadFamily(spaceId);
  const found = space.children.find((c) => c.id === childId);
  if (role !== "parent" || !found) notFound();
  const date = found.status === "expecting" ? found.dueDate : found.birthDate;
  const child: ChildValues = {
    id: found.id,
    name: found.name,
    nickname: found.nickname,
    status: found.status,
    date: date ? dateOnlyKey(date) : null,
  };
  const todayKey = dayKey(new Date(), timeZone);
  const t = await getTranslations();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2">
        <Title size="title">{t("childForm.editTitle", { name: childName(found) })}</Title>
        <ChildForm spaceId={spaceId} child={child} todayKey={todayKey} />
        {child.status === "expecting" ? (
          <div className="mt-6 border-t-(length:--bw-hair) border-line pt-8">
            <MarkBornForm spaceId={spaceId} child={child} todayKey={todayKey} />
          </div>
        ) : null}
      </div>
    </TabPage>
  );
}
