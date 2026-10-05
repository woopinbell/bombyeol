import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";

/** 없는 주소, 지워진 기록(notFound()): 한 문장 + 처음 화면으로(DESIGN 9.1-8) */
export default async function NotFound() {
  const t = await getTranslations("errorPage");
  return (
    <Screen
      actions={
        <Link href="/" className={buttonClass({ variant: "primary", block: true })}>
          {t("home")}
        </Link>
      }
    >
      <Title size="title">{t("notFoundTitle")}</Title>
      <Lead>{t("notFoundLead")}</Lead>
    </Screen>
  );
}
