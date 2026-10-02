import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const space = (spaceId = "s1") => ({
  kind: "space" as const,
  spaceId,
  userId: "u1",
  spaceCreatedById: "u1",
  purgeAfter: later,
});

describe("DeletionRequest 스키마", () => {
  it("Space당 진행 중인 삭제 요청은 하나뿐 - 취소, 완료된 요청은 여러 개 있어도 된다", async () => {
    const first = await prisma.deletionRequest.create({ data: space() });
    await expect(prisma.deletionRequest.create({ data: space() })).rejects.toThrow();
    await prisma.deletionRequest.update({
      where: { id: first.id },
      data: { canceledAt: new Date(), canceledById: "u1" },
    });
    await expect(prisma.deletionRequest.create({ data: space() })).resolves.toBeTruthy();
    await expect(prisma.deletionRequest.create({ data: space("s2") })).resolves.toBeTruthy();
  });

  it("종류별 필수 필드를 체크 제약으로 강제한다", async () => {
    await expect(
      prisma.deletionRequest.create({ data: { ...space(), spaceCreatedById: null } }),
    ).rejects.toThrow();
    await expect(
      prisma.deletionRequest.create({ data: { kind: "account", purgeAfter: new Date() } }),
    ).rejects.toThrow();
    await expect(
      prisma.deletionRequest.create({
        data: { kind: "account", userId: "u1", spaceId: "s1", purgeAfter: new Date() },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.deletionRequest.create({
        data: { kind: "account", userId: "u1", purgeAfter: new Date() },
      }),
    ).resolves.toBeTruthy();
  });
});
