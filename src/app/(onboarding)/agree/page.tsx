import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AgreeForm } from "@/components/auth/agree-form";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { safeNext } from "@/lib/safe-next";
import { accountConsentMissing, requireSignedIn } from "@/server/session";

/**
 * 첫 로그인 뒤(또는 약관이 바뀐 뒤) 동의 화면. 이미 동의했으면 가려던 곳으로.
 * 가족 만들기, 합류는 서버도 이 동의를 확인한다(TERMS_REQUIRED).
 */
export default async function AgreePage({ searchParams }: PageProps<"/agree">) {
  const next = safeNext((await searchParams).next);
  await requireSignedIn(`/agree?next=${encodeURIComponent(next)}`);
  if (!(await accountConsentMissing())) redirect(next);
  const t = await getTranslations("agree");
  return (
    <Screen>
      <Title size="title">{t("title")}</Title>
      <Lead>{t("lead")}</Lead>
      <div className="flex flex-col gap-2 text-fg-muted">
        <p>{t("point1")}</p>
        <p>{t("point2")}</p>
        <p>{t("point3")}</p>
      </div>
      <AgreeForm
        versions={{ terms: CONSENT_VERSIONS.terms, privacy: CONSENT_VERSIONS.privacy }}
        next={next}
      />
    </Screen>
  );
}
