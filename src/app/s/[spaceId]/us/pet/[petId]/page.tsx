import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { DeleteSubject } from "@/components/us/delete-subject";
import { MemorialPanel, Section } from "@/components/us/member-manage";
import { PetCover } from "@/components/us/pet-cover";
import { PetForm, type PetValues } from "@/components/us/pet-form";
import { buttonClass } from "@/components/ui/button";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { dateOnlyKey, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/** 반려동물 정보 고치기(parent): 커버 사진, 이름, 종, 품종, 생일(짐작), 가족이 된 날, 별이 된 친구, 지우기 */
export default async function EditPetPage({ params }: PageProps<"/s/[spaceId]/us/pet/[petId]">) {
  const { spaceId, petId } = await params;
  const { role, caller } = await loadFamily(spaceId);
  if (role !== "parent") notFound();
  const [pets, memorials] = await Promise.all([
    caller.pet.list({ spaceId }),
    caller.memorial.list({ spaceId }),
  ]);
  const found = pets.find((p) => p.id === petId);
  if (!found) notFound();
  const memorial = memorials.find((m) => m.petId === found.id) ?? null;
  const todayKey = dayKey(new Date(), timeZone);
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
      <div className="flex flex-col gap-8 pt-2 pb-12">
        <Title size="title">{t("petForm.editTitle", { name: found.name })}</Title>
        <PetCover spaceId={spaceId} petId={found.id} name={found.name} coverUrl={found.coverUrl} />
        <Link
          href={`/s/${spaceId}/story?pet=${encodeURIComponent(found.id)}`}
          className={`${buttonClass()} self-start`}
        >
          {t("petForm.stories", { name: found.name })}
        </Link>
        <PetForm spaceId={spaceId} pet={pet} todayKey={todayKey} />
        <Section title={t("member.memorialTitle")} lead={t("petForm.memorialLead")}>
          <MemorialPanel
            spaceId={spaceId}
            target={{ type: "pet", petId: found.id }}
            memorial={
              memorial && {
                id: memorial.id,
                passedAt: memorial.passedAt ? dateOnlyKey(memorial.passedAt) : null,
                note: memorial.note,
              }
            }
            todayKey={todayKey}
          />
        </Section>
        <Section
          title={t("privacy.deleteTitle")}
          lead={t("privacy.petDeleteLead", { name: found.name })}
        >
          <DeleteSubject
            spaceId={spaceId}
            target={{ type: "pet", id: found.id }}
            name={found.name}
          />
        </Section>
      </div>
    </TabPage>
  );
}
