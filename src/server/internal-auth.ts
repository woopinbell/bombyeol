// Cron(scheduled) → Next 내부 경로 호출 인증. 별도 Secret 없이 AUTH_SECRET에서 용도별 키를 유도한다.
// 경로는 공개 URL이기도 하므로 이 토큰 없이는 거부한다.
const LABEL = "bombyeol:internal:cleanup";

export async function internalToken(authSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(LABEL));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 길이와 무관한 상수 시간 비교 */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export const INTERNAL_CLEANUP_PATH = "/api/internal/cleanup";
