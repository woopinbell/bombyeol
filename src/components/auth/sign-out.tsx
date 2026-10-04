"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { signOutNow } from "@/app/(onboarding)/login/actions";
import { unregisterPushToken } from "@/app/s/[spaceId]/us/settings/actions";
import { Button } from "@/components/ui/button";
import { dropPushToken, readStoredPush, writeStoredPush } from "@/lib/push-client";

/**
 * 로그아웃(이 기기만). 이 기기로 받던 알림을 먼저 끈다 - 다음에 이 기기를 쓰는 사람이 앞 사람의 알림을
 * 받지 않게(토큰 해제 실패는 로그아웃을 막지 않는다, 서버의 60일 정리와 다음 등록 때 옮기기가 남은 몫을 맡는다).
 * 화면 설정(글자 크기 등)은 기기 설정이라 그대로 둔다.
 */
export function SignOut() {
  const t = useTranslations("privacy.account");
  const [pending, start] = useTransition();
  return (
    <Button
      className="self-start"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const stored = readStoredPush();
          if (stored) {
            await unregisterPushToken(stored.token).catch(() => undefined);
            writeStoredPush(null);
            await dropPushToken().catch(() => undefined);
          }
          await signOutNow();
        })
      }
    >
      {t("signOut")}
    </Button>
  );
}
