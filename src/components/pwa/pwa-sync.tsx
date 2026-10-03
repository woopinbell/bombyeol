"use client";

import { useEffect } from "react";
import { registerPushToken, unregisterPushToken } from "@/app/s/[spaceId]/us/settings/actions";
import { listenInstallPrompt } from "@/lib/install-prompt";
import {
  PUSH_REFRESH_MS,
  fetchPushToken,
  pushSupport,
  readStoredPush,
  registerServiceWorker,
  writeStoredPush,
} from "@/lib/push-client";

/**
 * 가족 홈을 열 때 한 번: 서비스 워커 등록(설치 가능 조건), 설치 요청 붙잡기,
 * 이 기기에서 켜 둔 알림이 있으면 하루에 한 번 토큰을 서버와 맞춘다. 권한이 사라졌으면 서버에서도 지운다.
 * 화면에 아무것도 그리지 않는다. 실패는 조용히 넘긴다(다음에 다시 맞춘다).
 */
export function PwaSync() {
  useEffect(() => {
    const stop = listenInstallPrompt();
    if ("serviceWorker" in navigator) registerServiceWorker().catch(() => undefined);
    const stored = readStoredPush();
    if (stored && pushSupport() === "ok") {
      void (async () => {
        if (Notification.permission !== "granted") {
          writeStoredPush(null);
          await unregisterPushToken(stored.token);
          return;
        }
        if (Date.now() - stored.syncedAt < PUSH_REFRESH_MS) return;
        const token = await fetchPushToken();
        const result = await registerPushToken(token);
        if ("error" in result) return;
        if (token !== stored.token) await unregisterPushToken(stored.token);
        writeStoredPush({ token, syncedAt: Date.now() });
      })().catch(() => undefined);
    }
    return stop;
  }, []);
  return null;
}
