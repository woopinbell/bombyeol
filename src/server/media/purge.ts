import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";
import { periodKey } from "./usage";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 큰 삭제(아이, 반려동물, 계정)에서 붙은 파일을 purging으로 표시한다. 기록은 바로 지우고
 * R2 객체는 정리 Cron이 나눠 지운다(한 요청의 하위 요청 한도). 자산 행이 남아 있으므로
 * "DB만 지워지고 파일이 추적되지 않는" 상태는 생기지 않는다(G-05). 사용량에서는 바로 빠진다(G-03).
 */
export async function markPurging(db: Db, spaceId: string, assetIds: string[], now = new Date()) {
  if (assetIds.length === 0) return 0;
  const confirmed = await db.mediaAsset.aggregate({
    where: { id: { in: assetIds }, spaceId, status: "confirmed" },
    _sum: { bytes: true },
  });
  const { count } = await db.mediaAsset.updateMany({
    where: { id: { in: assetIds }, spaceId, status: { in: ["pending", "confirmed"] } },
    data: { status: "purging" },
  });
  const bytes = confirmed._sum.bytes ?? 0;
  if (bytes > 0) {
    await db.usageCounter.upsert({
      where: { spaceId_periodKey: { spaceId, periodKey: periodKey(now) } },
      create: { spaceId, periodKey: periodKey(now), bytesDeleted: bytes },
      update: { bytesDeleted: { increment: bytes } },
    });
  }
  return count;
}

/**
 * purging 자산의 R2 객체를 오래된 것부터 최대 limit개 지우고 deleted로 바꾼다.
 * 확정된 적 있으면 최종 키, 아니면 업로드 키(pending/은 수명주기 규칙이 최종 안전망).
 * 객체 삭제가 실패한 자산은 purging으로 남아 다음 실행에서 다시 시도한다.
 */
export async function purgeAssets(
  prisma: PrismaClient,
  storage: MediaStorage,
  limit: number,
  now = new Date(),
) {
  if (limit <= 0) return { attempted: 0, purged: 0 };
  const assets = await prisma.mediaAsset.findMany({
    where: { status: "purging" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, spaceId: true, confirmedAt: true },
  });
  let purged = 0;
  for (const asset of assets) {
    try {
      await storage.delete(
        asset.confirmedAt
          ? mediaKeys.final(asset.spaceId, asset.id)
          : mediaKeys.pending(asset.spaceId, asset.id),
      );
    } catch {
      continue;
    }
    const { count } = await prisma.mediaAsset.updateMany({
      where: { id: asset.id, status: "purging" },
      data: { status: "deleted", deletedAt: now },
    });
    purged += count;
  }
  // attempted: 보낸 삭제 요청 수(실패 포함) - 같은 실행의 남은 하위 요청 몫 계산용
  return { attempted: assets.length, purged };
}
