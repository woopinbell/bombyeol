import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MEDIA_POLICY, RATE_LIMITS, TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const free = TIER_LIMITS.free;

describe("media.requestUpload", () => {
  it("pending 자산을 만들고 길이·타입을 서명한 URL을 pending/ 키로 발급한다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const res = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 1000,
    });
    const key = `pending/${spaceId}/${res.assetId}`;
    expect(res.uploadUrl).toBe(`memory://put/${key}`);
    expect(storage.signed.get(key)).toEqual({ bytes: 1000, contentType: "image/jpeg" });
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: res.assetId } });
    expect(asset).toMatchObject({ status: "pending", bytes: 1000, kind: "image" });
    const usage = await prisma.usageCounter.findFirstOrThrow({ where: { spaceId } });
    expect(usage.uploadUrlsIssued).toBe(1);
  });

  it("G-01: 서명과 다른 크기·타입의 업로드는 저장소가 거부한다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const { assetId } = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/png",
      bytes: 1000,
    });
    const key = `pending/${spaceId}/${assetId}`;
    expect(storage.upload(key, 5000, "image/png")).toBe(false);
    expect(storage.upload(key, 1000, "application/zip")).toBe(false);
    expect(storage.upload(key, 1000, "image/png")).toBe(true);
  });

  it("G-01: 종류별 크기 상한(경계값)", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    await expect(
      api.media.requestUpload({
        spaceId,
        kind: "image",
        contentType: "image/jpeg",
        bytes: free.maxUploadBytes.image,
      }),
    ).resolves.toHaveProperty("assetId");
    await expect(
      api.media.requestUpload({
        spaceId,
        kind: "image",
        contentType: "image/jpeg",
        bytes: free.maxUploadBytes.image + 1,
      }),
    ).rejects.toMatchObject({ message: "FILE_TOO_LARGE" });
    await expect(
      api.media.requestUpload({
        spaceId,
        kind: "video",
        contentType: "video/mp4",
        bytes: free.maxUploadBytes.video + 1,
      }),
    ).rejects.toMatchObject({ message: "FILE_TOO_LARGE" });
  });

  it("G-01: 허용하지 않은 형식과 종류·형식 불일치를 거부한다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    await expect(
      // @ts-expect-error 화이트리스트 밖 형식
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/svg+xml", bytes: 10 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "video/mp4", bytes: 10 }),
    ).rejects.toMatchObject({ message: "UNSUPPORTED_TYPE" });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("G-03: confirmed + 진행 중 업로드 합계가 Space 상한을 넘으면 거부한다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    await prisma.mediaAsset.create({
      data: {
        spaceId,
        uploadedById: parent.id,
        kind: "video",
        contentType: "video/mp4",
        bytes: free.storageBytes - 1500,
        status: "confirmed",
      },
    });
    await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 1000,
    });
    // 남은 500바이트 초과
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 501 }),
    ).rejects.toMatchObject({ message: "STORAGE_LIMIT" });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 500 }),
    ).resolves.toHaveProperty("assetId");
  });

  it("G-03: 버려진(pendingTtl 지난) 업로드와 삭제된 자산은 총량에서 빠진다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    const old = new Date(Date.now() - (MEDIA_POLICY.pendingTtlSec + 60) * 1000);
    // 파일 하나는 최대 수백 MB이므로 여러 개로 Space 상한을 채운다
    const big = free.maxUploadBytes.video;
    const count = Math.ceil(free.storageBytes / big);
    const row = {
      spaceId,
      uploadedById: parent.id,
      kind: "video" as const,
      contentType: "video/mp4",
      bytes: big,
    };
    await prisma.mediaAsset.createMany({
      data: [
        ...Array.from({ length: count }, () => ({ ...row, createdAt: old })),
        ...Array.from({ length: count }, () => ({ ...row, status: "deleted" as const })),
      ],
    });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 1000 }),
    ).resolves.toHaveProperty("assetId");
  });

  it("G-04: Space당 미확정 업로드 수 상한", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    for (let i = 0; i < MEDIA_POLICY.pendingPerSpace; i++) {
      await api.media.requestUpload({
        spaceId,
        kind: "image",
        contentType: "image/jpeg",
        bytes: 10,
      });
    }
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 10 }),
    ).rejects.toMatchObject({ message: "PENDING_LIMIT" });
  });

  it("G-04: 동시 요청도 미확정 상한을 넘지 않는다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const n = MEDIA_POLICY.pendingPerSpace + 5;
    const results = await Promise.allSettled(
      Array.from({ length: n }, () =>
        api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 10 }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(
      MEDIA_POLICY.pendingPerSpace,
    );
  });

  it("G-04: 사용자당 발급 횟수 제한", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    const windowStart = new Date(
      Date.now() - (Date.now() % (RATE_LIMITS.uploadIssuePerUser.windowSec * 1000)),
    );
    await prisma.rateCounter.create({
      data: {
        key: `upload-user:${parent.id}`,
        windowStart,
        count: RATE_LIMITS.uploadIssuePerUser.limit,
      },
    });
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 10 }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("멤버가 아니면 다른 Space에 업로드 URL을 받을 수 없다", async () => {
    const { spaceId } = await mediaSetup(prisma);
    const stranger = await prisma.user.create({ data: { name: "남" } });
    await expect(
      callerFor(prisma, stranger.id).media.requestUpload({
        spaceId,
        kind: "image",
        contentType: "image/jpeg",
        bytes: 10,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
