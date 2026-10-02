import { getTranslations } from "next-intl/server";
import { Screen, Title } from "@/components/ui/screen";
import { Steps } from "@/components/ui/steps";
import { safeNext } from "@/lib/safe-next";
import { TextSizeChoice } from "./text-size-choice";

/** 어르신 합류 마지막 단계(3/3): 글자 크기. 기기 설정이라 로그인과 상관없다. */
export default async function TextSizePage({ searchParams }: PageProps<"/start/text-size">) {
  const next = safeNext((await searchParams).next);
  const t = await getTranslations("onboarding");
  return (
    <Screen top={<Steps current={3} total={3} label={t("steps.last")} />}>
      <Title>{t("textSize.title")}</Title>
      <TextSizeChoice next={next} />
    </Screen>
  );
}
