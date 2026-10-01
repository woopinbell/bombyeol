// 내부 경로(Cron 정리·배포 스모크) 호출 인증. 별도 Secret 없이 AUTH_SECRET에서 용도별 키를 유도한다.
// 경로는 공개 URL이기도 하므로 이 토큰 없이는 거부한다.
export type InternalPurpose = "cleanup" | "smoke";

export async function internalToken(authSecret: string, purpose: InternalPurpose): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`bombyeol:internal:${purpose}`),
  );
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

/** 요청의 Bearer 토큰이 해당 용도 토큰과 같은지 */
export async function isInternalRequest(
  req: Request,
  authSecret: string | undefined,
  purpose: InternalPurpose,
): Promise<boolean> {
  if (!authSecret) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return safeEqual(given, await internalToken(authSecret, purpose));
}
