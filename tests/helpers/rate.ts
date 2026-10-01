import type { PrismaClient } from "@/generated/prisma/client";
import type { RateLimitRule } from "@/server/rate-limit";

/** 현재 창의 카운터를 한도까지 채운다(다음 요청이 리밋에 걸리도록) */
export async function exhaustRateLimit(prisma: PrismaClient, key: string, rule: RateLimitRule) {
  const windowMs = rule.windowSec * 1000;
  const windowStart = new Date(Date.now() - (Date.now() % windowMs));
  await prisma.rateCounter.create({ data: { key, windowStart, count: rule.limit } });
}
