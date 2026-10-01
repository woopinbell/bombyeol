#!/usr/bin/env node
// 스테이징 배포 스모크. AUTH_SECRET(스테이징 Worker와 같은 값)으로 내부 토큰을 만들어 호출한다.
//   사용: node scripts/smoke-staging.mjs [기본 URL]
import { webcrypto } from "node:crypto";

const base = process.argv[2] ?? "https://bombyeol-staging.seungwoo7050.workers.dev";
const secret = process.env.AUTH_SECRET;
if (!secret) {
  console.error("AUTH_SECRET이 없습니다.");
  process.exit(2);
}
const key = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const mac = await webcrypto.subtle.sign(
  "HMAC",
  key,
  new TextEncoder().encode("bombyeol:internal:smoke"),
);
const token = Buffer.from(mac).toString("hex");

const health = await fetch(`${base}/api/trpc/health`);
console.log("health", health.status);
const res = await fetch(`${base}/api/internal/smoke`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
});
console.log("smoke", res.status, res.ok ? JSON.stringify(await res.json()) : "");
