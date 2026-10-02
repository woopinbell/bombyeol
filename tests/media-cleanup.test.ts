import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIA_POLICY } from "@/lib/plan";
import { CLEANUP_POLICY, runCleanup } from "@/server/jobs/cleanup";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const DAY = 24 * 60 * 60 * 1000;

describe("runCleanup (G-05, G-15, G-17)", () => {
  it("pendingTtl이 지난 업로드만 객체를 지우고 deleted로 바꾼다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const fresh = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 10,
    });
    const stale = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 10,
    });
    storage.upload(`pending/${spaceId}/${stale.assetId}`, 10, "image/jpeg");
    await prisma.mediaAsset.update({
      where: { id: stale.assetId },
      data: { createdAt: new Date(Date.now() - (MEDIA_POLICY.pendingTtlSec + 60) * 1000) },
    });

    const result = await runCleanup(prisma, storage);
    expect(result.abandonedCleaned).toBe(1);
    expect(storage.objects.has(`pending/${spaceId}/${stale.assetId}`)).toBe(false);
    const rows = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.find((r) => r.id === stale.assetId)?.status).toBe("deleted");
    expect(rows.find((r) => r.id === fresh.assetId)?.status).toBe("pending");
  });

  it("저장소 삭제가 실패한 업로드는 pending으로 남겨 다음 실행에서 다시 시도한다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const { assetId } = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 10,
    });
    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: { createdAt: new Date(Date.now() - (MEDIA_POLICY.pendingTtlSec + 60) * 1000) },
    });
    storage.delete = async () => {
      throw new Error("R2 DELETE 실패: 500");
    };
    expect((await runCleanup(prisma, storage)).abandonedCleaned).toBe(0);
    expect((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } })).status).toBe(
      "pending",
    );
  });

  it("보관 기간이 지난 레이트 리밋 카운터, 초대 실패 기록을 지운다(G-17)", async () => {
    const { parent, storage } = await mediaSetup(prisma);
    const old = new Date(Date.now() - (CLEANUP_POLICY.counterRetentionDays + 1) * DAY);
    await prisma.rateCounter.createMany({
      data: [
        { key: "old", windowStart: old, count: 1 },
        { key: "new", windowStart: new Date(), count: 1 },
      ],
    });
    await prisma.inviteCodeAttempt.createMany({
      data: [
        { userId: parent.id, ip: "x", createdAt: old },
        { userId: parent.id, ip: "x" },
      ],
    });
    const result = await runCleanup(prisma, storage);
    expect(result).toMatchObject({ rateCountersDeleted: 1, inviteAttemptsDeleted: 1 });
    expect(await prisma.rateCounter.count()).toBe(1);
    expect(await prisma.inviteCodeAttempt.count()).toBe(1);
  });

  it("G-15: 하루 발급이 기준을 넘는 Space를 경고 로그로 남긴다(spaceId만)", async () => {
    const { storage, spaceId } = await mediaSetup(prisma);
    const today = new Date().toISOString().slice(0, 10);
    await prisma.usageCounter.create({
      data: {
        spaceId,
        periodKey: today,
        uploadUrlsIssued: CLEANUP_POLICY.uploadUrlsWarnPerDay + 1,
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await runCleanup(prisma, storage);
    expect(result.surgingSpaces).toBe(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`space=${spaceId}`));
    warn.mockRestore();
  });
});
