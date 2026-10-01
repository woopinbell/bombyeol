import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function confirmedAsset(bytes = 1000) {
  const ctx = await mediaSetup(prisma);
  const { assetId } = await ctx.api.media.requestUpload({
    spaceId: ctx.spaceId,
    kind: "image",
    contentType: "image/jpeg",
    bytes,
  });
  ctx.storage.upload(`pending/${ctx.spaceId}/${assetId}`, bytes, "image/jpeg");
  await ctx.api.media.confirm({ spaceId: ctx.spaceId, assetId });
  return { ...ctx, assetId, finalKey: `spaces/${ctx.spaceId}/${assetId}` };
}

describe("media.delete (G-05)", () => {
  it("R2 객체를 지우고 자산을 deleted로 바꾼다", async () => {
    const { api, storage, spaceId, assetId, finalKey } = await confirmedAsset();
    await expect(api.media.delete({ spaceId, assetId })).resolves.toEqual({ ok: true });
    expect(storage.objects.has(finalKey)).toBe(false);
    expect(storage.deleted).toContain(finalKey);
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.status).toBe("deleted");
    const usage = await prisma.usageCounter.findFirstOrThrow({ where: { spaceId } });
    expect(Number(usage.bytesDeleted)).toBe(1000);
  });

  it("삭제하면 그만큼 다시 올릴 수 있다(G-03 총량에서 빠짐)", async () => {
    const big = TIER_LIMITS.free.maxUploadBytes.video;
    const { api, parent, spaceId, assetId } = await confirmedAsset(1000);
    // 나머지 공간을 confirmed 자산으로 채운다(파일 하나 크기 상한 이하로 나눠서)
    const rest = TIER_LIMITS.free.storageBytes - 1000;
    const rows = Array.from({ length: Math.floor(rest / big) }, () => big);
    if (rest % big) rows.push(rest % big);
    await prisma.mediaAsset.createMany({
      data: rows.map((bytes) => ({
        spaceId,
        uploadedById: parent.id,
        kind: "video" as const,
        contentType: "video/mp4",
        bytes,
        status: "confirmed" as const,
      })),
    });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 1000 }),
    ).rejects.toMatchObject({ message: "STORAGE_LIMIT" });
    await api.media.delete({ spaceId, assetId });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 1000 }),
    ).resolves.toHaveProperty("assetId");
  });

  it("저장소 삭제가 실패하면 DB를 바꾸지 않는다(재시도 가능)", async () => {
    const { api, storage, spaceId, assetId } = await confirmedAsset();
    storage.delete = async () => {
      throw new Error("R2 DELETE 실패: 500");
    };
    await expect(api.media.delete({ spaceId, assetId })).rejects.toThrow();
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.status).toBe("confirmed");
  });

  it("parent는 다른 멤버가 올린 자산을 지울 수 있고, 다른 멤버는 남의 자산을 지울 수 없다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const grandma = await prisma.user.create({ data: { name: "할머니" } });
    const uncle = await prisma.user.create({ data: { name: "삼촌" } });
    await prisma.member.createMany({
      data: [
        { spaceId, userId: grandma.id, role: "grandparent" },
        { spaceId, userId: uncle.id, role: "grandparent" },
      ],
    });
    const grandmaApi = callerFor(prisma, grandma.id, "203.0.113.5", storage);
    const { assetId } = await grandmaApi.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 10,
    });
    storage.upload(`pending/${spaceId}/${assetId}`, 10, "image/jpeg");
    await grandmaApi.media.confirm({ spaceId, assetId });

    await expect(
      callerFor(prisma, uncle.id, "203.0.113.6", storage).media.delete({ spaceId, assetId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.media.delete({ spaceId, assetId })).resolves.toEqual({ ok: true });
  });

  it("다른 Space의 자산은 지울 수 없다", async () => {
    const { assetId } = await confirmedAsset();
    const other = await mediaSetup(prisma);
    await expect(other.api.media.delete({ spaceId: other.spaceId, assetId })).rejects.toMatchObject(
      {
        message: "ASSET_INVALID",
      },
    );
  });
});
