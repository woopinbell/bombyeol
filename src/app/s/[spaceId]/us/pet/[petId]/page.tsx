import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { PetCover } from "@/components/us/pet-cover";
import { PetForm, type PetValues } from "@/components/us/pet-form";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { dateOnlyKey, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/** 반려동물 정보 고치기(parent): 커버 사진, 이름, 종, 품종, 생일(짐작), 가족이 된 날 */
export default async function EditPetPage({ params }: PageProps<"/s/[spaceId]/us/pet/[petId]">) {
  const { spaceId, petId } = await params;
  const { role, caller } = await loadFamily(spaceId);
  if (role !== "parent") notFound();
  const found = (await caller.pet.list({ spaceId })).find((p) => p.id === petId);
  if (!found) notFound();
  const pet: PetValues = {
    id: found.id,
    name: found.name,
    species: found.species,
    speciesLabel: found.speciesLabel,
    breed: found.breed,
    birthDate: found.birthDate ? dateOnlyKey(found.birthDate) : null,
    birthDateEstimated: found.birthDateEstimated,
    adoptedAt: found.adoptedAt ? dateOnlyKey(found.adoptedAt) : null,
  };
  const t = await getTranslations();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2">
        <Title size="title">{t("petForm.editTitle", { name: found.name })}</Title>
        <PetCover spaceId={spaceId} petId={found.id} name={found.name} coverUrl={found.coverUrl} />
        <PetForm spaceId={spaceId} pet={pet} todayKey={dayKey(new Date(), timeZone)} />
      </div>
    </TabPage>
  );
}
