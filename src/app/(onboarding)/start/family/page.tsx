import { getTranslations } from "next-intl/server";
import { Screen, Title } from "@/components/ui/screen";
import { Steps } from "@/components/ui/steps";
import { requireSignedIn } from "@/server/session";
import { FamilyForm } from "./family-form";

/** 가족 만들기(1/2) - 다음은 할머니, 할아버지 초대 */
export default async function FamilyPage() {
  await requireSignedIn("/start/family");
  const t = await getTranslations("onboarding");
  return (
    <Screen top={<Steps current={1} total={2} label={t("steps.oneLeft")} />}>
      <Title>{t("family.title")}</Title>
      <FamilyForm />
    </Screen>
  );
}
