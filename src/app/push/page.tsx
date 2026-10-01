"use client";

import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// S-5 스파이크 확인 화면(디자인 아님)
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function PushSpike() {
  const [token, setToken] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const add = (m: string) => setLog((l) => [...l, m]);

  async function register() {
    try {
      const perm = await Notification.requestPermission();
      add(`알림 권한: ${perm}`);
      if (perm !== "granted") return;
      const qs = new URLSearchParams(config as Record<string, string>).toString();
      const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`);
      const messaging = getMessaging(initializeApp(config));
      const t = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: reg,
      });
      setToken(t);
      add(`토큰 발급됨(${t.slice(0, 12)}…)`);
      onMessage(messaging, (p) => add(`포그라운드 수신: ${p.notification?.title ?? ""}`));
    } catch (e) {
      add(`오류: ${(e as Error).message}`);
    }
  }

  async function send(delaySec = 0) {
    if (delaySec) add(`${delaySec}초 뒤 발송 — 지금 홈 화면으로 나가세요`);
    const res = await fetch("/api/spike/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, delaySec }),
    });
    add(`발송 요청: ${res.status} ${await res.text()}`);
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.8 }}>
      <h1>봄별 S-5 푸시 스파이크</h1>
      <p>먼저 <a href="/">메인</a>에서 로그인한 뒤 진행하세요.</p>
      <button onClick={register}>1. 알림 허용 및 기기 등록</button>{" "}
      <button onClick={() => send()} disabled={!token}>2. 지금 보내기(포그라운드)</button>{" "}
      <button onClick={() => send(10)} disabled={!token}>3. 10초 뒤 보내기(백그라운드)</button>
      <ul>{log.map((m, i) => <li key={i}>{m}</li>)}</ul>
    </main>
  );
}
