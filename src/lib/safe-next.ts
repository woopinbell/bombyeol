/**
 * 로그인, 온보딩 뒤 돌아갈 경로. 같은 사이트의 화면 경로만 허용한다(외부 주소, API로 보내는 열린 리다이렉트 방지).
 */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > 200) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}
