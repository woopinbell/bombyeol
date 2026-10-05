import { TERMS_MD } from "@/content/legal/terms";
import { LegalPage } from "../legal-page";

/** 이용약관(공개) */
export default async function TermsPage({ searchParams }: PageProps<"/terms">) {
  return <LegalPage markdown={TERMS_MD} back={(await searchParams).back} other="privacy" />;
}
