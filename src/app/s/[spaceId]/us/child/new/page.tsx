import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { ChildForm } from "@/components/us/child-form";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/**
 * 아이 더하기(parent). 가족 만들기 뒤에 둘째, 셋째를 더하거나 첫 아이를 나중에 등록한다.
 * 이 가족에서 처음 아이를 등록하는 엄마 아빠는 아이 정보 동의(법정대리인)를 함께 한다.
 */
export default async function NewChildPage({ params }: PageProps<"/s/[spaceId]/us/child/new">) {
  const { spaceId } = await params;
  const { role, caller } = await loadFamily(spaceId);
  if (role !== "parent") notFound();
  // 이 가족에서 아직 아이 정보 동의를 하지 않은 엄마 아빠에게만 동의 칸을 보인다
  const { space } = await caller.consent.status({ spaceId });
  const needsConsent = !space?.find((c) => c.kind === "child_data")?.granted;
  const t = await getTranslations();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2">
        <Title size="title">{t("childForm.newTitle")}</Title>
        <ChildForm
          spaceId={spaceId}
          todayKey={dayKey(new Date(), timeZone)}
          needsConsent={needsConsent}
        />
      </div>
    </TabPage>
  );
}
