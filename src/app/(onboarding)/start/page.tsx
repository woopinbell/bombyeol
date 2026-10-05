import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { requireAgreed } from "@/server/session";

/** 아직 가족이 없을 때: 부모는 가족 만들기, 초대받은 분은 초대 코드(어르신을 가족 만들기로 밀지 않는다) */
export default async function StartPage() {
  await requireAgreed("/start");
  const t = await getTranslations("onboarding.start");
  return (
    <Screen
      actions={
        <>
          <Link
            href="/invite"
            className={buttonClass({ variant: "primary", size: "elder", block: true })}
          >
            {t("haveInvite")}
          </Link>
          <Link href="/start/family" className={buttonClass({ size: "elder", block: true })}>
            {t("createFamily")}
          </Link>
        </>
      }
    >
      <Title>{t("title")}</Title>
      <Lead>{t("lead")}</Lead>
    </Screen>
  );
}
