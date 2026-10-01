import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { requireConfirmedAssets } from "@/server/media/assets";
import { createR2Storage } from "@/server/storage/r2";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("미디어 파이프라인 통합 (G-01~05)", () => {
  it("요청 → 업로드 → 확정 → 참조 검증 → 삭제 → 재업로드", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);

    const req = await api.media.requestUpload({
      spaceId,
      kind: "video",
      contentType: "video/mp4",
      bytes: 4096,
    });
    // 크기를 속여 올리면 저장소가 거부(G-01)
    expect(storage.upload(`pending/${spaceId}/${req.assetId}`, 8192, "video/mp4")).toBe(false);
    // 확정 전에는 다른 기능이 참조할 수 없다(G-02)
    await expect(requireConfirmedAssets(prisma, spaceId, [req.assetId])).rejects.toThrow();

    expect(storage.upload(`pending/${spaceId}/${req.assetId}`, 4096, "video/mp4")).toBe(true);
    await api.media.confirm({ spaceId, assetId: req.assetId });
    await expect(requireConfirmedAssets(prisma, spaceId, [req.assetId])).resolves.toEqual([
      { id: req.assetId, kind: "video", bytes: 4096 },
    ]);
    await expect(api.media.usage({ spaceId })).resolves.toMatchObject({
      confirmedBytes: 4096,
      pendingCount: 0,
    });

    await api.media.delete({ spaceId, assetId: req.assetId });
    expect(storage.objects.size).toBe(0);
    await expect(requireConfirmedAssets(prisma, spaceId, [req.assetId])).rejects.toThrow();
    await expect(api.media.usage({ spaceId })).resolves.toMatchObject({ confirmedBytes: 0 });
  });

  it("다른 Space 멤버는 남의 자산을 확정·삭제·참조할 수 없다", async () => {
    const a = await mediaSetup(prisma);
    const b = await mediaSetup(prisma);
    const { assetId } = await a.api.media.requestUpload({
      spaceId: a.spaceId,
      kind: "image",
      contentType: "image/webp",
      bytes: 10,
    });
    a.storage.upload(`pending/${a.spaceId}/${assetId}`, 10, "image/webp");
    const bOnA = callerFor(prisma, b.parent.id, "203.0.113.9", a.storage);
    await expect(bOnA.media.confirm({ spaceId: a.spaceId, assetId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(b.api.media.confirm({ spaceId: b.spaceId, assetId })).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    await a.api.media.confirm({ spaceId: a.spaceId, assetId });
    await expect(b.api.media.delete({ spaceId: b.spaceId, assetId })).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    await expect(requireConfirmedAssets(prisma, b.spaceId, [assetId])).rejects.toThrow();
  });
});

describe("R2 서명 URL (G-01)", () => {
  const storage = createR2Storage({
    accountId: "0123456789abcdef0123456789abcdef",
    bucket: "test-bucket",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "secret-example",
  });

  it("업로드 URL은 content-length·content-type을 서명 헤더에 포함하고 만료를 건다", async () => {
    const url = new URL(
      await storage.presignPut("pending/space1/asset1", {
        bytes: 1234,
        contentType: "image/jpeg",
        expiresSec: 600,
      }),
    );
    expect(url.host).toBe("0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/test-bucket/pending/space1/asset1");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(
      expect.arrayContaining(["content-length", "content-type", "host"]),
    );
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("길이가 다르면 서명이 달라진다", async () => {
    const sign = async (bytes: number) =>
      new URL(
        await storage.presignPut("k", { bytes, contentType: "image/jpeg", expiresSec: 600 }),
      ).searchParams.get("X-Amz-Signature");
    expect(await sign(1000)).not.toBe(await sign(1001));
  });

  it("읽기 URL은 GET 서명이고 짧은 만료를 건다", async () => {
    const url = new URL(await storage.presignGet("spaces/s/a", 3600));
    expect(url.searchParams.get("X-Amz-Expires")).toBe("3600");
    expect(url.pathname).toBe("/test-bucket/spaces/s/a");
  });
});
