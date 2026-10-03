"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { registerPushToken, unregisterPushToken } from "@/app/s/[spaceId]/us/settings/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { canInstall, promptInstall, subscribeInstallPrompt } from "@/lib/install-prompt";
import {
  dropPushToken,
  fetchPushToken,
  isStandalone,
  pushSupport,
  readStoredPush,
  writeStoredPush,
  type PushSupport,
} from "@/lib/push-client";

type View = PushSupport | "denied" | "on" | "off";

const noop = () => () => {};

/** 지금 이 기기의 알림 상태(브라우저에서만 안다 - 서버 렌더와 하이드레이션 때는 null) */
function readView(): View {
  const support = pushSupport();
  if (support !== "ok") return support;
  if (Notification.permission === "denied") return "denied";
  return readStoredPush() && Notification.permission === "granted" ? "on" : "off";
}

/**
 * 알림 설정(ARCHITECTURE §7, PRIVACY §3): 이 기기에서 웹푸시 받기, 끄기. 알림은 계정 단위가 아니라 기기마다 켠다.
 * 아이폰은 홈 화면에 추가한 앱에서만 되므로 그 방법을 먼저 알린다. 안드로이드 크롬은 설치 요청이 있으면 [홈 화면에 추가].
 * 알림 문구에는 이름, 내용을 넣지 않는다는 것을 함께 밝힌다.
 */
export function NotificationSettings() {
  const t = useTranslations("settings.push");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const initial = useSyncExternalStore(noop, readView, () => null);
  const [chosen, setChosen] = useState<View | null>(null);
  const view = chosen ?? initial;
  const [working, setWorking] = useState(false);
  const installable = useSyncExternalStore(subscribeInstallPrompt, canInstall, () => false);
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);

  const fail = (key: ErrorKey | null) => toast({ message: key ? errors(key) : t("failed") });

  const turnOn = async () => {
    setWorking(true);
    try {
      // 권한 창은 누른 순간에 띄워야 한다(브라우저 규칙)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setChosen(permission === "denied" ? "denied" : "off");
        return;
      }
      const token = await fetchPushToken();
      const result = await registerPushToken(token);
      if ("error" in result) return fail(result.error);
      writeStoredPush({ token, syncedAt: Date.now() });
      setChosen("on");
      toast({ message: t("onDone") });
    } catch {
      fail(null);
    } finally {
      setWorking(false);
    }
  };

  const turnOff = async () => {
    const stored = readStoredPush();
    setWorking(true);
    try {
      if (stored) {
        const result = await unregisterPushToken(stored.token);
        if ("error" in result) return fail(result.error);
      }
      writeStoredPush(null);
      await dropPushToken().catch(() => undefined);
      setChosen("off");
      toast({ message: t("offDone") });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p>{t("lead")}</p>
      {view === "ios-install" ? (
        <div className="flex flex-col gap-2 rounded-md border-(length:--bw) border-line-strong p-4">
          <p className="font-bold">{t("iosTitle")}</p>
          <ol className="flex list-decimal flex-col gap-1 pl-6">
            <li>{t("iosStep1")}</li>
            <li>{t("iosStep2")}</li>
            <li>{t("iosStep3")}</li>
          </ol>
        </div>
      ) : view === "unsupported" || view === "unconfigured" ? (
        <p className="text-fg-muted">{t(view)}</p>
      ) : view === "denied" ? (
        <p role="status" className="font-bold">
          {t("denied")}
        </p>
      ) : view === "on" ? (
        <>
          <p role="status" className="font-bold">
            {t("enabled")}
          </p>
          <Button className="self-start" onClick={turnOff} disabled={working} aria-busy={working}>
            {working ? t("working") : t("off")}
          </Button>
        </>
      ) : view === "off" ? (
        <Button
          variant="primary"
          size="elder"
          block
          onClick={turnOn}
          disabled={working}
          aria-busy={working}
        >
          {working ? t("working") : t("on")}
        </Button>
      ) : null}
      {view && view !== "unconfigured" ? (
        <p className="text-caption text-fg-muted">{t("perDevice")}</p>
      ) : null}
      {installable && !standalone ? (
        <div className="flex flex-col gap-2 border-t-(length:--bw-hair) border-line pt-4">
          <p>{t("installLead")}</p>
          <Button className="self-start" onClick={() => void promptInstall()}>
            {t("install")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
