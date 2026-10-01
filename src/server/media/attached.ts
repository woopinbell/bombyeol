import type { Prisma } from "@/generated/prisma/client";

/** 기록(Moment)에 붙은 파일 id(원본·썸네일) — 대상 단위 삭제에서 purging으로 넘긴다 */
export async function momentAssetIds(db: Prisma.TransactionClient, where: Prisma.MomentWhereInput) {
  const rows = await db.momentMedia.findMany({
    where: { moment: where },
    select: { assetId: true, thumbnailAssetId: true },
  });
  return rows.flatMap((r) => (r.thumbnailAssetId ? [r.assetId, r.thumbnailAssetId] : [r.assetId]));
}
