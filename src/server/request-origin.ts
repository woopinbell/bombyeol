import { headers } from "next/headers";

/** 지금 요청의 사이트 주소(초대 링크, 알림 링크용). 프록시 뒤에서도 바깥 주소를 쓴다. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
