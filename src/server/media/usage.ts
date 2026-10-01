import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { MEDIA_POLICY, TIER_LIMITS, tierOf } from "@/lib/plan";

type Db = Pick<PrismaClient, "mediaAsset"> | Prisma.TransactionClient;

/** UTC 날짜 키(UsageCounter.periodKey) */
export function periodKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

/** 아직 버려지지 않은 pending 업로드(pendingTtl 안) */
export function openPendingWhere(spaceId: string, now: Date): Prisma.MediaAssetWhereInput {
  return {
    spaceId,
    status: "pending",
    createdAt: { gt: new Date(now.getTime() - MEDIA_POLICY.pendingTtlSec * 1000) },
  };
}

/**
 * Space 저장 사용량과 한도(G-03). 한도 판정은 confirmed + 진행 중 업로드 합계로 한다
 * (URL만 받아 두고 한도를 넘기는 우회 차단). UsageCounter는 집계·감시용이고 판정에 쓰지 않는다.
 */
export async function spaceUsage(db: Db, spaceId: string, now = new Date()) {
  const [confirmed, pending] = await Promise.all([
    db.mediaAsset.aggregate({
      where: { spaceId, status: "confirmed" },
      _sum: { bytes: true },
      _count: true,
    }),
    db.mediaAsset.aggregate({
      where: openPendingWhere(spaceId, now),
      _sum: { bytes: true },
      _count: true,
    }),
  ]);
  const tier = tierOf();
  return {
    tier,
    confirmedBytes: confirmed._sum.bytes ?? 0,
    confirmedCount: confirmed._count,
    pendingBytes: pending._sum.bytes ?? 0,
    pendingCount: pending._count,
    limitBytes: TIER_LIMITS[tier].storageBytes,
  };
}

/** 새 업로드(bytes)를 받아도 한도 안인지 */
export function fitsStorage(usage: Awaited<ReturnType<typeof spaceUsage>>, bytes: number) {
  return usage.confirmedBytes + usage.pendingBytes + bytes <= usage.limitBytes;
}
