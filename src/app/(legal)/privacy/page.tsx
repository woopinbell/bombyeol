import { PRIVACY_MD } from "@/content/legal/privacy";
import { LegalPage } from "../legal-page";

/** 개인정보 처리방침(공개) */
export default async function PrivacyPage({ searchParams }: PageProps<"/privacy">) {
  return <LegalPage markdown={PRIVACY_MD} back={(await searchParams).back} other="terms" />;
}
