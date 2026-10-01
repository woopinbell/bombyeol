import type { PrismaClient } from "@/generated/prisma/client";
import { MEDIA_POLICY, PUSH_POLICY } from "@/lib/plan";
import { purgeAssets } from "@/server/media/purge";
import { periodKey } from "@/server/media/usage";
import { purgeDueSpaces } from "./space-purge";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const CLEANUP_POLICY = {
  /**
   * 한 번의 실행에서 보내는 R2 삭제 요청 수 — Workers 하위 요청 한도(무료 50) 안.
   * 삭제된 기록의 파일(purging)을 먼저, 남는 몫으로 버려진 업로드를 지운다(pending/은 수명주기 규칙이 안전망).
   * 유료 플랜(1000)으로 바꾸면 올린다.
   */
  r2DeletesPerRun: 40,
  /** RateCounter·InviteCodeAttempt 보관 기간(가장 긴 판정 창보다 길게, G-17) */
  counterRetentionDays: 2,
  /** G-15: 하루 업로드 URL 발급이 이 수를 넘으면 경고 로그 */
  uploadUrlsWarnPerDay: 300,
} as const;

/**
 * 정기 정리(Cron, G-05·G-15·G-17).
 * - 유예가 끝난 Space 삭제: 숨기고 파일을 purging으로, 파일이 다 지워지면 행 삭제(G-06)
 * - 지워진 기록에 붙어 있던 파일(purging): 객체를 지우고 deleted로(G-05)
 * - pendingTtl이 지난 미확정 업로드: 객체를 지우고 deleted로(수명주기 규칙의 보조)
 * - 판정 창이 지난 레이트 리밋 카운터·초대 실패 기록 삭제
 * - 오래 갱신되지 않은 푸시 토큰 삭제(G-17)
 * - 업로드 발급 급증 Space를 로그로 남긴다(개인정보 없이 spaceId만)
 */
export async function runCleanup(prisma: PrismaClient, storage: MediaStorage, now = new Date()) {
  const spaces = await purgeDueSpaces(prisma, now);
  const purge = await purgeAssets(prisma, storage, CLEANUP_POLICY.r2DeletesPerRun, now);
  const budget = CLEANUP_POLICY.r2DeletesPerRun - purge.attempted;
  const abandonedBefore = new Date(now.getTime() - MEDIA_POLICY.pendingTtlSec * 1000);
  const abandoned =
    budget > 0
      ? await prisma.mediaAsset.findMany({
          where: { status: "pending", createdAt: { lt: abandonedBefore } },
          select: { id: true, spaceId: true },
          orderBy: { createdAt: "asc" },
          take: budget,
        })
      : [];
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
  const staleBefore = new Date(now.getTime() - PUSH_POLICY.tokenStaleDays * DAY_MS);
  const [counters, attempts, tokens] = await Promise.all([
    prisma.rateCounter.deleteMany({ where: { windowStart: { lt: retentionBefore } } }),
    prisma.inviteCodeAttempt.deleteMany({ where: { createdAt: { lt: retentionBefore } } }),
    prisma.pushToken.deleteMany({ where: { lastSeenAt: { lt: staleBefore } } }),
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
    ...spaces,
    purged: purge.purged,
    abandonedCleaned,
    rateCountersDeleted: counters.count,
    inviteAttemptsDeleted: attempts.count,
    pushTokensDeleted: tokens.count,
    surgingSpaces: surging.length,
  };
}
