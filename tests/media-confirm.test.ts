import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MEDIA_POLICY } from "@/lib/plan";
import { requireConfirmedAssets } from "@/server/media/assets";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function uploaded(bytes = 1000, contentType: "image/jpeg" | "image/png" = "image/jpeg") {
  const ctx = await mediaSetup(prisma);
  const { assetId } = await ctx.api.media.requestUpload({
    spaceId: ctx.spaceId,
    kind: "image",
    contentType,
    bytes,
  });
  const pendingKey = `pending/${ctx.spaceId}/${assetId}`;
  return { ...ctx, assetId, pendingKey };
}

describe("media.confirm (G-02)", () => {
  it("선언과 같은 업로드를 확정하고 spaces/ 키로 옮긴 뒤 pending 객체를 지운다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    expect(storage.upload(pendingKey, 1000, "image/jpeg")).toBe(true);
    await expect(api.media.confirm({ spaceId, assetId })).resolves.toEqual({
      assetId,
      status: "confirmed",
    });
    expect(storage.objects.has(`spaces/${spaceId}/${assetId}`)).toBe(true);
    expect(storage.objects.has(pendingKey)).toBe(false);
    const usage = await prisma.usageCounter.findFirstOrThrow({ where: { spaceId } });
    expect(Number(usage.bytesConfirmed)).toBe(1000);
  });

  it("아직 업로드하지 않았으면 UPLOAD_NOT_FOUND이고 다시 시도할 수 있다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    await expect(api.media.confirm({ spaceId, assetId })).rejects.toMatchObject({
      message: "UPLOAD_NOT_FOUND",
    });
    storage.upload(pendingKey, 1000, "image/jpeg");
    await expect(api.media.confirm({ spaceId, assetId })).resolves.toHaveProperty(
      "status",
      "confirmed",
    );
  });

  it("저장된 크기·타입이 선언과 다르면 객체를 지우고 자산을 폐기한다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    storage.forcePut(pendingKey, 9_999_999, "image/jpeg");
    await expect(api.media.confirm({ spaceId, assetId })).rejects.toMatchObject({
      message: "UPLOAD_MISMATCH",
    });
    expect(storage.objects.has(pendingKey)).toBe(false);
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.status).toBe("deleted");
  });

  it("다른 사람이 올린 자산이나 다른 Space의 자산은 확정할 수 없다", async () => {
    const { storage, spaceId, assetId, pendingKey } = await uploaded();
    storage.upload(pendingKey, 1000, "image/jpeg");

    const grandma = await prisma.user.create({ data: { name: "할머니" } });
    await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent" } });
    await expect(
      callerFor(prisma, grandma.id, "203.0.113.2", storage).media.confirm({ spaceId, assetId }),
    ).rejects.toMatchObject({ message: "ASSET_INVALID" });

    const other = await mediaSetup(prisma);
    await expect(
      other.api.media.confirm({ spaceId: other.spaceId, assetId }),
    ).rejects.toMatchObject({ message: "ASSET_INVALID" });
  });

  it("pendingTtl이 지난 업로드는 확정할 수 없다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    storage.upload(pendingKey, 1000, "image/jpeg");
    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: { createdAt: new Date(Date.now() - (MEDIA_POLICY.pendingTtlSec + 1) * 1000) },
    });
    await expect(api.media.confirm({ spaceId, assetId })).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
  });

  it("두 번 확정해도 사용량은 한 번만 센다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    storage.upload(pendingKey, 1000, "image/jpeg");
    await api.media.confirm({ spaceId, assetId });
    await expect(api.media.confirm({ spaceId, assetId })).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    const usage = await prisma.usageCounter.findFirstOrThrow({ where: { spaceId } });
    expect(Number(usage.bytesConfirmed)).toBe(1000);
  });
});

describe("requireConfirmedAssets (G-02)", () => {
  it("자기 Space의 confirmed 자산만 통과한다", async () => {
    const { api, storage, spaceId, assetId, pendingKey } = await uploaded();
    await expect(requireConfirmedAssets(prisma, spaceId, [assetId])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    storage.upload(pendingKey, 1000, "image/jpeg");
    await api.media.confirm({ spaceId, assetId });
    await expect(requireConfirmedAssets(prisma, spaceId, [assetId, assetId])).resolves.toHaveLength(
      1,
    );

    const other = await mediaSetup(prisma);
    await expect(requireConfirmedAssets(prisma, other.spaceId, [assetId])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    await expect(requireConfirmedAssets(prisma, spaceId, [])).resolves.toEqual([]);
  });
});
