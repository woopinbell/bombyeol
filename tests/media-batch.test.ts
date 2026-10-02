import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MEDIA_POLICY, TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const jpeg = (bytes = 100) => ({
  kind: "image" as const,
  contentType: "image/jpeg" as const,
  bytes,
});

describe("media 일괄 올리기", () => {
  it("여러 건을 한 번에 발급하고 한 번에 확인한다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const tickets = await api.media.requestUploads({ spaceId, items: [jpeg(100), jpeg(200)] });
    expect(tickets).toHaveLength(2);
    expect(tickets[1].uploadUrl).toBe(`memory://put/pending/${spaceId}/${tickets[1].assetId}`);
    tickets.forEach((t, i) =>
      storage.upload(`pending/${spaceId}/${t.assetId}`, [100, 200][i], "image/jpeg"),
    );
    await expect(
      api.media.confirmMany({ spaceId, assetIds: tickets.map((t) => t.assetId) }),
    ).resolves.toEqual({ confirmed: 2 });
    const statuses = await prisma.mediaAsset.findMany({
      where: { spaceId },
      select: { status: true },
    });
    expect(statuses.every((a) => a.status === "confirmed")).toBe(true);
  });

  it("G-03, G-04: 한도와 미확정 수는 묶음 전체로 세고, 넘으면 하나도 발급하지 않는다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    await api.media.requestUploads({
      spaceId,
      items: Array.from({ length: MEDIA_POLICY.pendingPerSpace - 1 }, () => jpeg()),
    });
    await expect(
      api.media.requestUploads({ spaceId, items: [jpeg(), jpeg()] }),
    ).rejects.toMatchObject({ message: "PENDING_LIMIT" });
    expect(await prisma.mediaAsset.count({ where: { spaceId } })).toBe(
      MEDIA_POLICY.pendingPerSpace - 1,
    );

    await prisma.mediaAsset.deleteMany({ where: { spaceId } });
    await prisma.mediaAsset.create({
      data: {
        spaceId,
        uploadedById: parent.id,
        kind: "video",
        contentType: "video/mp4",
        bytes: TIER_LIMITS.free.storageBytes - 1000,
        status: "confirmed",
      },
    });
    await expect(
      api.media.requestUploads({ spaceId, items: [jpeg(600), jpeg(600)] }),
    ).rejects.toMatchObject({ message: "STORAGE_LIMIT" });
    expect(await prisma.mediaAsset.count({ where: { spaceId, status: "pending" } })).toBe(0);
  });

  it("G-01: 묶음 안 하나라도 형식, 크기가 틀리면 거부", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    await expect(
      api.media.requestUploads({
        spaceId,
        items: [jpeg(), { kind: "image", contentType: "video/mp4", bytes: 10 }],
      }),
    ).rejects.toMatchObject({ message: "UNSUPPORTED_TYPE" });
    await expect(
      api.media.requestUploads({
        spaceId,
        items: [jpeg(TIER_LIMITS.free.maxUploadBytes.image + 1)],
      }),
    ).rejects.toMatchObject({ message: "FILE_TOO_LARGE" });
  });

  it("G-02: 확인은 올라오지 않은 파일이 섞이면 실패하고, 한 번에 받는 수에 상한이 있다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const [a, b] = await api.media.requestUploads({ spaceId, items: [jpeg(), jpeg()] });
    storage.upload(`pending/${spaceId}/${a.assetId}`, 100, "image/jpeg");
    await expect(
      api.media.confirmMany({ spaceId, assetIds: [a.assetId, b.assetId] }),
    ).rejects.toMatchObject({ message: "UPLOAD_NOT_FOUND" });
    await expect(
      api.media.confirmMany({
        spaceId,
        assetIds: Array.from({ length: MEDIA_POLICY.confirmBatch + 1 }, (_, i) => `x${i}`),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
