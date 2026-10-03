// 봄별 서비스 워커(ARCHITECTURE §7): 웹푸시를 받아 알림으로 보이고, 누르면 그 화면을 연다.
// FCM이 보낸 메시지를 직접 다룬다(Firebase SDK를 여기서 불러오지 않는다 - 설정값, 외부 스크립트 없음).
// 오프라인 캐시는 두지 않는다(fetch 핸들러 없음): 가족 기록은 늘 서버의 최신 상태를 본다.

const ICON = "/brand/icon/icon-192.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** 같은 출처의 경로만 연다(알림 데이터가 다른 사이트로 보내지 못하게) */
function safePath(link) {
  try {
    const url = new URL(link, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // FCM HTTP v1: { notification: { title, body }, data: { type, id, link }, fcmOptions: { link } }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const link = safePath(data.link || (payload.fcmOptions && payload.fcmOptions.link) || "/");
  event.waitUntil(
    self.registration.showNotification(notification.title || "봄별", {
      body: notification.body || "",
      icon: ICON,
      lang: "ko",
      // 같은 기록의 알림은 하나로 합친다
      tag: link,
      data: { link },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safePath((event.notification.data && event.notification.data.link) || "/");
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(path).catch(() => self.clients.openWindow(path));
      }
      return self.clients.openWindow(path);
    })(),
  );
});
