import Link from "next/link";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { CONSENT_VERSIONS } from "@/lib/consents";

/**
 * 아이 정보 등록 동의(법정대리인, PRIVACY §2): 켜면 폼이 지금 보여준 동의 버전(childDataConsent)을 보낸다.
 * 서버는 이 가족에서 이 엄마 아빠의 동의가 없으면 아이 등록을 받지 않는다(CHILD_CONSENT_REQUIRED).
 */
export function ChildConsentField({ back }: { back: string }) {
  const t = useTranslations("childConsent");
  return (
    <div className="flex flex-col rounded-md border-(length:--bw) border-line-strong px-4 py-2">
      <Checkbox
        name="childDataConsent"
        value={CONSENT_VERSIONS.child_data}
        label={t("label")}
        hint={t("hint")}
      />
      <Link
        href={`/privacy?back=${encodeURIComponent(back)}#s2`}
        className="ml-9 inline-flex min-h-(--touch) items-center self-start font-bold underline"
      >
        {t("read")}
      </Link>
    </div>
  );
}
