import type { PrismaClient } from "@/generated/prisma/client";

export type Context = {
  prisma: PrismaClient;
  /** 로그인한 봄별 User.id. 비로그인은 null */
  userId: string | null;
  /** 레이트 리밋 키용 클라이언트 IP(Cloudflare cf-connecting-ip) */
  ip: string;
};

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "local";
}
