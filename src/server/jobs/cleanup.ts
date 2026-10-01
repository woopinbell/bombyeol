import type { PrismaClient } from "@/generated/prisma/client";
import { MEDIA_POLICY } from "@/lib/plan";
import { periodKey } from "@/server/routers/media";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const CLEANUP_POLICY = {
  /** 한 번에 정리할 버려진 업로드 수(Cron CPU 상한) */
  abandonedBatch: 200,
  /** RateCounter·InviteCodeAttempt 보관 기간(가장 긴 판정 창보다 길게, G-17) */
  counterRetentionDays: 2,
  /** G-15: 하루 업로드 URL 발급이 이 수를 넘으면 경고 로그 */
  uploadUrlsWarnPerDay: 300,
} as const;

/**
 * 정기 정리(Cron, G-05·G-15·G-17).
 * - pendingTtl이 지난 미확정 업로드: 객체를 지우고 deleted로(수명주기 규칙의 보조)
 * - 판정 창이 지난 레이트 리밋 카운터·초대 실패 기록 삭제
 * - 업로드 발급 급증 Space를 로그로 남긴다(개인정보 없이 spaceId만)
 */
export async function runCleanup(prisma: PrismaClient, storage: MediaStorage, now = new Date()) {
  const abandonedBefore = new Date(now.getTime() - MEDIA_POLICY.pendingTtlSec * 1000);
  const abandoned = await prisma.mediaAsset.findMany({
    where: { status: "pending", createdAt: { lt: abandonedBefore } },
    select: { id: true, spaceId: true },
    orderBy: { createdAt: "asc" },
    take: CLEANUP_POLICY.abandonedBatch,
  });
  let abandonedCleaned = 0;
  for (const asset of abandoned) {
    try {
      await storage.delete(mediaKeys.pending(asset.spaceId, asset.id));
    } catch {
      continue; // 다음 실행에서 다시 시도(pending/ 수명주기 규칙이 최종 안전망)
    }
    const { count } = await prisma.mediaAsset.updateMany({
      where: { id: asset.id, status: "pending" },
      data: { status: "deleted", deletedAt: now },
    });
    abandonedCleaned += count;
  }

  const retentionBefore = new Date(now.getTime() - CLEANUP_POLICY.counterRetentionDays * DAY_MS);
  const [counters, attempts] = await Promise.all([
    prisma.rateCounter.deleteMany({ where: { windowStart: { lt: retentionBefore } } }),
    prisma.inviteCodeAttempt.deleteMany({ where: { createdAt: { lt: retentionBefore } } }),
  ]);

  const surging = await prisma.usageCounter.findMany({
    where: {
      periodKey: periodKey(now),
      uploadUrlsIssued: { gt: CLEANUP_POLICY.uploadUrlsWarnPerDay },
    },
    select: { spaceId: true, uploadUrlsIssued: true },
  });
  for (const row of surging) {
    console.warn(`[G-15] 업로드 URL 발급 급증 space=${row.spaceId} issued=${row.uploadUrlsIssued}`);
  }

  return {
    abandonedCleaned,
    rateCountersDeleted: counters.count,
    inviteAttemptsDeleted: attempts.count,
    surgingSpaces: surging.length,
  };
}
