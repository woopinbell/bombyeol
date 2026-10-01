import type { PrismaClient } from "@/generated/prisma/client";
import { mediaError } from "@/server/errors";

/**
 * G-02: 콘텐츠를 참조하는 mutation(moment·story 등)은 이 함수로 자산을 검증한다.
 * 같은 Space의 confirmed 자산만 통과하고, 키 문자열은 받지 않는다(ID만).
 */
export async function requireConfirmedAssets(
  prisma: Pick<PrismaClient, "mediaAsset">,
  spaceId: string,
  assetIds: string[],
) {
  const unique = [...new Set(assetIds)];
  if (unique.length === 0) return [];
  const found = await prisma.mediaAsset.findMany({
    where: { id: { in: unique }, spaceId, status: "confirmed" },
    select: { id: true, kind: true, bytes: true },
  });
  if (found.length !== unique.length) throw mediaError("ASSET_INVALID");
  return found;
}
