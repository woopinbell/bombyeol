import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MEDIA_POLICY, TIER_LIMITS } from "@/lib/plan";
import { fitsStorage, spaceUsage } from "@/server/media/usage";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";
import { createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("Space 사용량 (G-03, G-15)", () => {
  it("confirmed와 진행 중 업로드를 나눠 집계하고, 버려진, 삭제된 자산은 빼며, 다른 Space와 섞지 않는다", async () => {
    const { parent, spaceId } = await mediaSetup(prisma);
    const other = await mediaSetup(prisma);
    const row = {
      spaceId,
      uploadedById: parent.id,
      kind: "image" as const,
      contentType: "image/jpeg",
    };
    const old = new Date(Date.now() - (MEDIA_POLICY.pendingTtlSec + 60) * 1000);
    await prisma.mediaAsset.createMany({
      data: [
        { ...row, bytes: 100, status: "confirmed" },
        { ...row, bytes: 200, status: "confirmed" },
        { ...row, bytes: 30 },
        { ...row, bytes: 999, createdAt: old },
        { ...row, bytes: 999, status: "deleted" },
        {
          ...row,
          spaceId: other.spaceId,
          uploadedById: other.parent.id,
          bytes: 999,
          status: "confirmed",
        },
      ],
    });
    const usage = await spaceUsage(prisma, spaceId);
    expect(usage).toEqual({
      tier: "free",
      confirmedBytes: 300,
      confirmedCount: 2,
      pendingBytes: 30,
      pendingCount: 1,
      limitBytes: TIER_LIMITS.free.storageBytes,
    });
  });

  it("fitsStorage 경계값", () => {
    const usage = {
      tier: "free" as const,
      confirmedBytes: 60,
      confirmedCount: 1,
      pendingBytes: 30,
      pendingCount: 1,
      limitBytes: 100,
    };
    expect(fitsStorage(usage, 10)).toBe(true);
    expect(fitsStorage(usage, 11)).toBe(false);
  });

  it("media.usage는 멤버 누구나 볼 수 있고 비멤버는 못 본다", async () => {
    const { spaceId } = await mediaSetup(prisma);
    const grandma = await createUser(prisma, "할머니");
    await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent" } });
    await expect(callerFor(prisma, grandma.id).media.usage({ spaceId })).resolves.toMatchObject({
      confirmedBytes: 0,
      limitBytes: TIER_LIMITS.free.storageBytes,
    });
    const stranger = await createUser(prisma, "남");
    await expect(callerFor(prisma, stranger.id).media.usage({ spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
