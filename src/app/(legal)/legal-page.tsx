import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { Screen } from "@/components/ui/screen";
import { safeNext } from "@/lib/safe-next";

/**
 * 약관, 처리방침 게시 화면(로그인 없이 볼 수 있다 - 스토어, 법령 요건). `back`으로 온 곳(동의 화면, 설정)에 돌아간다.
 */
export async function LegalPage({
  markdown,
  back,
  other,
}: {
  markdown: string;
  back: unknown;
  other: "terms" | "privacy";
}) {
  const t = await getTranslations("legal");
  const backTo = safeNext(back, "/");
  return (
    <Screen top={<BackLink href={backTo}>{t("back")}</BackLink>}>
      <LegalDoc
        markdown={markdown}
        notice={
          <p className="rounded-md border-(length:--bw) border-line-strong p-3 text-caption">
            {t("draftNotice")}
          </p>
        }
      />
      <Link
        href={`/${other}?back=${encodeURIComponent(backTo)}`}
        className="inline-flex min-h-(--touch) items-center self-start font-bold underline"
      >
        {t(other === "terms" ? "toTerms" : "toPrivacy")}
      </Link>
    </Screen>
  );
}
