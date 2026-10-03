// 브라우저 쪽 웹푸시(ARCHITECTURE §7): 서비스 워커 등록, FCM 등록 토큰 받기, 이 기기의 알림 켜짐 기억.
// Firebase SDK는 알림을 켤 때와 토큰을 새로 맞출 때만 불러온다(첫 화면 번들에 넣지 않는다).
// 수신, 표시는 우리 서비스 워커(public/sw.js)가 직접 한다.

const SW_PATH = "/sw.js";
const STORE_KEY = "bombyeol.push";
/** 켜 둔 기기는 하루에 한 번 토큰을 서버와 맞춘다(토큰 교체, 60일 정리 G-17 대비, 등록 리밋 G-07 안) */
export const PUSH_REFRESH_MS = 24 * 60 * 60 * 1000;

function firebaseConfig() {
  // NEXT_PUBLIC_*는 빌드 때 그대로 박히므로 하나씩 적는다
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey || Object.values(config).some((v) => !v)) return null;
  return { config: config as Record<keyof typeof config, string>, vapidKey };
}

/**
 * 이 기기에서 알림을 받을 수 있나.
 * ios-install: 아이폰, 아이패드는 홈 화면에 추가한 앱에서만 웹푸시가 된다(iOS 16.4+).
 */
export type PushSupport = "ok" | "ios-install" | "unsupported" | "unconfigured";

export function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (!firebaseConfig()) return "unconfigured";
  if (isIos() && !isStandalone()) return "ios-install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return "ok";
}

export function registerServiceWorker() {
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

async function messaging() {
  const found = firebaseConfig();
  if (!found) throw new Error("push not configured");
  const [{ initializeApp, getApps }, { getMessaging }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  const app = getApps()[0] ?? initializeApp(found.config);
  return { messaging: getMessaging(app), vapidKey: found.vapidKey };
}

/** 알림 권한이 있는 상태에서 이 기기의 FCM 등록 토큰을 받는다(없으면 새로 만든다) */
export async function fetchPushToken() {
  const registration = await registerServiceWorker();
  const [{ getToken }, { messaging: m, vapidKey }] = await Promise.all([
    import("firebase/messaging"),
    messaging(),
  ]);
  return getToken(m, { vapidKey, serviceWorkerRegistration: registration });
}

/** 이 기기의 FCM 토큰을 버린다(알림 끄기). 실패해도 서버 해제는 따로 한다 */
export async function dropPushToken() {
  const [{ deleteToken }, { messaging: m }] = await Promise.all([
    import("firebase/messaging"),
    messaging(),
  ]);
  await deleteToken(m).catch(() => false);
}

/** 이 기기에 켜 둔 알림(서버에 등록한 토큰과 마지막으로 맞춘 때). 브라우저 저장소를 못 쓰면 없음 */
export type StoredPush = { token: string; syncedAt: number };

export function readStoredPush(): StoredPush | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredPush>) : null;
    return parsed?.token && typeof parsed.syncedAt === "number"
      ? { token: parsed.token, syncedAt: parsed.syncedAt }
      : null;
  } catch {
    return null;
  }
}

export function writeStoredPush(value: StoredPush | null) {
  try {
    if (value) localStorage.setItem(STORE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // 저장하지 못하면 다음에 다시 켜게 된다
  }
}
