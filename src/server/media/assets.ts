import {
  Prisma,
  type MediaKind,
  type MediaStatus,
  type PrismaClient,
} from "@/generated/prisma/client";
import { mediaError } from "@/server/errors";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";
import { periodKey } from "./usage";

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

/** 자산이 어딘가(반려동물 커버·Moment 첨부·이야기 사진 등)에 붙어 있지 않은 조건 */
export const unattachedAssetWhere = {
  petCover: { is: null },
  momentMedia: { is: null },
  momentThumb: { is: null },
  storyPhoto: { is: null },
} satisfies Prisma.MediaAssetWhereInput;

/**
 * 새로 붙일 자산 검증: requireConfirmedAssets(G-02)에 더해 종류가 맞고 아직 다른 곳에 붙지 않았어야 한다.
 * 자산 하나는 한 곳에만 붙는다 — 삭제 연쇄(G-05)가 다른 기록의 파일을 지우지 않도록.
 */
export async function requireAttachableAssets(
  prisma: Pick<PrismaClient, "mediaAsset">,
  spaceId: string,
  assetIds: string[],
  kinds: readonly MediaKind[] = ["image", "video"],
) {
  const found = await requireConfirmedAssets(prisma, spaceId, assetIds);
  if (found.some((a) => !kinds.includes(a.kind))) throw mediaError("ASSET_INVALID");
  const free = await prisma.mediaAsset.count({
    where: { id: { in: found.map((a) => a.id) }, ...unattachedAssetWhere },
  });
  if (free !== found.length) throw mediaError("ASSET_IN_USE");
  return found;
}

/** 동시에 같은 자산을 붙이려 해 unique 제약에 걸리면 ASSET_IN_USE로 돌려준다 */
export async function withAttachConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw mediaError("ASSET_IN_USE");
    }
    throw e;
  }
}

/**
 * 자산 삭제(G-05): R2 객체를 먼저 지우고 성공했을 때만 DB를 바꾼다
 * (실패하면 그대로 오류 → 재시도. "DB만 지워지고 파일이 남는" 상태를 만들지 않는다).
 */
export async function removeAsset(
  prisma: PrismaClient | Prisma.TransactionClient,
  storage: MediaStorage,
  spaceId: string,
  asset: { id: string; bytes: number; status: MediaStatus },
) {
  await storage.delete(mediaKeys.final(spaceId, asset.id));
  await storage.delete(mediaKeys.pending(spaceId, asset.id));

  const now = new Date();
  const { count } = await prisma.mediaAsset.updateMany({
    where: { id: asset.id, status: asset.status },
    data: { status: "deleted", deletedAt: now },
  });
  if (count === 1 && asset.status === "confirmed") {
    await prisma.usageCounter.upsert({
      where: { spaceId_periodKey: { spaceId, periodKey: periodKey(now) } },
      create: { spaceId, periodKey: periodKey(now), bytesDeleted: asset.bytes },
      update: { bytesDeleted: { increment: asset.bytes } },
    });
  }
}
