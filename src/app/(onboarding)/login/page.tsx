import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { safeNext } from "@/lib/safe-next";

/** 로그인(DESIGN §9.5): 이메일·비밀번호 없음, 카카오 한 번. 가입은 로그인과 같다 — 가족 합류는 초대로만. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  const session = await auth();
  if (session?.userId) redirect(next);
  const t = await getTranslations("auth");
  return (
    <Screen
      actions={
        <>
          <SocialSignIn next={next} />
          <Link href="/invite" className={buttonClass({ variant: "text", block: true })}>
            {t("haveCode")}
          </Link>
        </>
      }
    >
      <Logo alt={t("logoAlt")} />
      <Title>{t("title")}</Title>
      <Lead>{t("lead")}</Lead>
      <p className="text-body text-fg-muted">{t("inviteNote")}</p>
    </Screen>
  );
}
