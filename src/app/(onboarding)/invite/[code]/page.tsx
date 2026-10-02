import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";
import { Steps } from "@/components/ui/steps";
import { toErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";
import { JoinForm } from "./join-form";

/**
 * 초대 링크로 들어온 어르신(DESIGN §9.5): 1 로그인 → 2 가족 확인, 부를 이름 → 3 글자 크기.
 * 로그인 전에는 가족 이름을 보여주지 않는다(invite.preview는 로그인 필요, 코드 탐색 방지).
 */
export default async function InviteCodePage({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const t = await getTranslations("onboarding");
  const session = await auth();

  if (!session?.userId) {
    return (
      <Screen
        top={<Steps current={1} total={3} label={t("steps.twoLeft")} />}
        actions={<SocialSignIn next={`/invite/${encodeURIComponent(code)}`} />}
      >
        <Title>{t("join.welcomeTitle")}</Title>
        <Lead>{t("join.welcomeLead")}</Lead>
      </Screen>
    );
  }

  const caller = await serverCaller();
  const preview = await caller.invite.preview({ code }).catch((e: unknown) => toErrorKey(e));
  if (typeof preview === "string") {
    // 이미 가족인 사람이 링크를 다시 누른 경우는 수락에서 걸러지고, 여기서는 쓸 수 없는 초대만 안내한다
    if (preview === "SIGN_IN_REQUIRED") redirect(`/login?next=/invite/${encodeURIComponent(code)}`);
    const te = await getTranslations("errors");
    return (
      <Screen
        actions={
          <>
            <Link
              href="/invite"
              className={buttonClass({ variant: "primary", size: "elder", block: true })}
            >
              {t("join.enterCode")}
            </Link>
            <Link href="/" className={buttonClass({ variant: "text", block: true })}>
              {t("join.home")}
            </Link>
          </>
        }
      >
        <Title>{t("join.invalidTitle")}</Title>
        <Lead>{te(preview)}</Lead>
      </Screen>
    );
  }

  return (
    <Screen top={<Steps current={2} total={3} label={t("steps.oneLeft")} />}>
      <Title>{t("join.title", { family: preview.spaceName })}</Title>
      <Lead>{t("join.lead")}</Lead>
      <JoinForm code={code} relationLabel={preview.relationLabel} />
    </Screen>
  );
}
