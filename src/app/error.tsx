"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";

/**
 * 화면을 그리다 난 예기치 않은 오류. 기술 문구 대신 한 문장 + [다시 해 보기](주) + [처음 화면으로].
 * 오류 내용은 콘솔에만 남긴다(사용자에게 digest 같은 값을 보이지 않는다).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Screen
      actions={
        <>
          <Button variant="primary" block onClick={() => retry()}>
            {t("retry")}
          </Button>
          <Link href="/" className={buttonClass({ variant: "text", block: true })}>
            {t("home")}
          </Link>
        </>
      }
    >
      <Title size="title">{t("title")}</Title>
      <Lead>{t("lead")}</Lead>
    </Screen>
  );
}
