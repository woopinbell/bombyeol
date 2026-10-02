import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { requireSignedIn } from "@/server/session";

/** 초대 코드를 말로 전해 받은 경우: 코드를 넣으면 초대 링크 화면으로(자바스크립트 없이 GET 폼) */
export default async function InviteEntryPage({ searchParams }: PageProps<"/invite">) {
  await requireSignedIn("/invite");
  const raw = (await searchParams).code;
  const code = typeof raw === "string" ? raw.replace(/\s+/g, "").toUpperCase() : "";
  if (code) redirect(`/invite/${encodeURIComponent(code.slice(0, 32))}`);
  const t = await getTranslations("onboarding.code");
  return (
    <Screen>
      <Title>{t("title")}</Title>
      <Lead>{t("lead")}</Lead>
      <form method="get" className="flex flex-1 flex-col gap-6">
        <Field
          elder
          label={t("label")}
          name="code"
          required
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="[&_input]:tracking-[0.2em] [&_input]:uppercase"
        />
        <div className="mt-auto">
          <button
            type="submit"
            data-press=""
            className={buttonClass({ variant: "primary", size: "elder", block: true })}
          >
            {t("submit")}
          </button>
        </div>
      </form>
    </Screen>
  );
}
