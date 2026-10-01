import type { PrismaClient } from "@/generated/prisma/client";
import type { MediaStorage } from "@/server/storage/types";

export type Context = {
  prisma: PrismaClient;
  /** 로그인한 봄별 User.id. 비로그인은 null */
  userId: string | null;
  /** 레이트 리밋 키용 클라이언트 IP(Cloudflare cf-connecting-ip) */
  ip: string;
  /** 미디어 저장소(R2). 설정이 없으면 사용할 때 오류 */
  storage: MediaStorage;
};

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "local";
}
