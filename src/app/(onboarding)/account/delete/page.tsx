import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AccountDelete } from "@/components/auth/account-delete";
import { BackLink } from "@/components/family/back-link";
import { buttonClass } from "@/components/ui/button";
import { Screen, Title } from "@/components/ui/screen";
import { serverCaller } from "@/server/trpc/server-caller";

const PATH = "/account/delete";

/**
 * 계정 지우기(PRIVACY §2.5, 스토어 요건의 웹 삭제 주소). 로그인하지 않아도 무엇이 지워지고 남는지와 방법을 보여 주고,
 * 로그인하면 이 화면에서 바로 지운다. 앱 안에서는 우리 > 설정 > 내 계정에서 온다.
 */
export default async function AccountDeletePage({ searchParams }: PageProps<"/account/delete">) {
  const { done } = await searchParams;
  const t = await getTranslations("privacy.account");
  const legal = await getTranslations("legal");
  const session = await auth();
  // 세션이 남아도 이미 지운 계정이면 user.me가 거부한다 - 로그인 전처럼 보여 준다
  const caller = session?.userId ? await serverCaller() : null;
  const me = caller ? await caller.user.me().catch(() => null) : null;
  const spaces = me && caller ? await caller.space.list() : [];

  if (done === "1" && !me) {
    return (
      <Screen
        actions={
          <Link href="/login" className={buttonClass({ block: true })}>
            {t("toLogin")}
          </Link>
        }
      >
        <Title size="title">{t("doneTitle")}</Title>
        <p>{t("doneLead")}</p>
      </Screen>
    );
  }

  return (
    <Screen
      top={
        me && spaces[0] ? (
          <BackLink href={`/s/${spaces[0].space.id}/us/settings`}>{t("back")}</BackLink>
        ) : undefined
      }
      actions={
        me ? (
          <AccountDelete />
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(PATH)}`}
            className={buttonClass({ variant: "primary", block: true })}
          >
            {t("signIn")}
          </Link>
        )
      }
    >
      <Title size="title">{t("title")}</Title>
      <p>{me ? t("leadSignedIn") : t("leadSignedOut")}</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-title-s font-heavy">{t("removedTitle")}</h2>
        <p className="text-fg-muted">{t("removed")}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-title-s font-heavy">{t("keptTitle")}</h2>
        <p className="text-fg-muted">{t("kept")}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-title-s font-heavy">{t("beforeTitle")}</h2>
        <p className="text-fg-muted">{t("alone")}</p>
        <p className="text-fg-muted">{t("lastParent")}</p>
        <p className="text-fg-muted">{t("again")}</p>
      </section>
      <Link
        href={`/privacy?back=${encodeURIComponent(PATH)}#s4`}
        className="inline-flex min-h-(--touch) items-center self-start font-bold underline"
      >
        {legal("toPrivacy")}
      </Link>
      {spaces.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title-s font-heavy">{t("familiesTitle")}</h2>
          <ul className="flex flex-col gap-1">
            {spaces.map((s) => (
              <li key={s.space.id} className="font-bold">
                {s.space.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Screen>
  );
}
