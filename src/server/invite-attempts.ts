import type { PrismaClient } from "@/generated/prisma/client";
import { INVITE_POLICY } from "@/lib/plan";

/**
 * 초대코드 brute-force 방지(G-07·G-11, hamkke InviteCodeAttempt 방식).
 * 실패만 기록하고, 사용자·IP 각각 최근 창 안의 실패 수가 한도에 이르면 더 시도하지 못한다.
 */
export async function isInviteAttemptBlocked(
  prisma: PrismaClient,
  userId: string,
  ip: string,
  now = new Date(),
): Promise<boolean> {
  const { failedAttemptsPerUser: perUser, failedAttemptsPerIp: perIp } = INVITE_POLICY;
  const [byUser, byIp] = await Promise.all([
    prisma.inviteCodeAttempt.count({
      where: { userId, createdAt: { gt: new Date(now.getTime() - perUser.windowSec * 1000) } },
    }),
    prisma.inviteCodeAttempt.count({
      where: { ip, createdAt: { gt: new Date(now.getTime() - perIp.windowSec * 1000) } },
    }),
  ]);
  return byUser >= perUser.limit || byIp >= perIp.limit;
}

export async function recordInviteFailure(prisma: PrismaClient, userId: string, ip: string) {
  await prisma.inviteCodeAttempt.create({ data: { userId, ip } });
}
