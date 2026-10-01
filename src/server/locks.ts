import type { Prisma } from "@/generated/prisma/client";

/**
 * 트랜잭션 범위 advisory lock. 같은 키의 "개수 확인 → 생성"을 직렬화해
 * 동시 요청으로 상한(G-11)을 넘는 것을 막는다.
 */
export async function lockKey(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${key}))`;
}
