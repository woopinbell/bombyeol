import type { PrismaClient } from "@/generated/prisma/client";

export type RateLimitRule = {
  /** 창 안에서 허용하는 최대 횟수 */
  limit: number;
  /** 고정 창 길이(초) */
  windowSec: number;
};

/**
 * DB 고정 창 카운터(S-6: 비용 게이트는 바인딩이 아니라 DB로 정확히 센다).
 * 호출할 때마다 weight(기본 1)만큼 증가시키고, 한도를 넘었으면 false를 돌려준다(여러 건을 한 번에 세는 일괄 요청용).
 */
export async function hitRateLimit(
  prisma: PrismaClient,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
  weight = 1,
): Promise<boolean> {
  const windowMs = rule.windowSec * 1000;
  const windowStart = new Date(now.getTime() - (now.getTime() % windowMs));
  const row = await prisma.rateCounter.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: weight },
    update: { count: { increment: weight } },
  });
  return row.count <= rule.limit;
}
