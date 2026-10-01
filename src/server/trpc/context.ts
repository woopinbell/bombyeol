import type { PrismaClient } from "@/generated/prisma/client";
import type { PushDispatcher } from "@/server/push/dispatch";
import type { MediaStorage } from "@/server/storage/types";

export type Context = {
  prisma: PrismaClient;
  /** 로그인한 봄별 User.id. 비로그인은 null */
  userId: string | null;
  /** 레이트 리밋 키용 클라이언트 IP(Cloudflare cf-connecting-ip) */
  ip: string;
  /** 미디어 저장소(R2). 설정이 없으면 사용할 때 오류 */
  storage: MediaStorage;
  /** 알림(응답 뒤 발송). 발송 설정이 없으면 아무것도 하지 않는다 */
  push: PushDispatcher;
};

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "local";
}
