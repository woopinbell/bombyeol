import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { PetForm } from "@/components/us/pet-form";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/** 반려동물 더하기(parent) */
export default async function NewPetPage({ params }: PageProps<"/s/[spaceId]/us/pet/new">) {
  const { spaceId } = await params;
  const { role } = await loadFamily(spaceId);
  if (role !== "parent") notFound();
  const t = await getTranslations();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2">
        <Title size="title">{t("petForm.newTitle")}</Title>
        <PetForm spaceId={spaceId} todayKey={dayKey(new Date(), timeZone)} />
      </div>
    </TabPage>
  );
}
