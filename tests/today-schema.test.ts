import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const user = await prisma.user.create({ data: { name: "부모" } });
  const space = await prisma.space.create({ data: { name: "가족", createdById: user.id } });
  const child = await prisma.child.create({
    data: { spaceId: space.id, nickname: "봄이", status: "expecting", createdById: user.id },
  });
  const pet = await prisma.pet.create({
    data: { spaceId: space.id, name: "보리", species: "dog", createdById: user.id },
  });
  return { user, space, child, pet };
}

describe("오늘(봄) 스키마 체크 제약", () => {
  it("Moment는 아이·반려동물 중 최대 하나만 대상으로 한다", async () => {
    const { user, space, child, pet } = await family();
    const base = {
      spaceId: space.id,
      kind: "media" as const,
      takenAt: new Date(),
      createdById: user.id,
    };
    await expect(prisma.moment.create({ data: base })).resolves.toBeTruthy();
    await expect(
      prisma.moment.create({ data: { ...base, childId: child.id } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.moment.create({ data: { ...base, childId: child.id, petId: pet.id } }),
    ).rejects.toThrow();
  });

  it("Milestone은 아이·반려동물 중 정확히 하나를 대상으로 한다", async () => {
    const { user, space, child, pet } = await family();
    const base = {
      spaceId: space.id,
      kind: "first_step",
      value: {},
      recordedAt: new Date("2026-10-01"),
      createdById: user.id,
    };
    await expect(
      prisma.milestone.create({ data: { ...base, petId: pet.id } }),
    ).resolves.toBeTruthy();
    await expect(prisma.milestone.create({ data: base })).rejects.toThrow();
    await expect(
      prisma.milestone.create({ data: { ...base, childId: child.id, petId: pet.id } }),
    ).rejects.toThrow();
  });

  it("Reaction은 대상이 정확히 하나이고 댓글만 본문을 가진다", async () => {
    const { user, space } = await family();
    const moment = await prisma.moment.create({
      data: {
        spaceId: space.id,
        kind: "diary",
        body: "글",
        takenAt: new Date(),
        createdById: user.id,
      },
    });
    const base = { spaceId: space.id, createdById: user.id };
    await expect(
      prisma.reaction.create({ data: { ...base, momentId: moment.id, kind: "like" } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.reaction.create({
        data: { ...base, momentId: moment.id, kind: "comment", body: "축하해" },
      }),
    ).resolves.toBeTruthy();
    await expect(prisma.reaction.create({ data: { ...base, kind: "like" } })).rejects.toThrow();
    await expect(
      prisma.reaction.create({ data: { ...base, momentId: moment.id, kind: "comment" } }),
    ).rejects.toThrow();
    await expect(
      prisma.reaction.create({ data: { ...base, momentId: moment.id, kind: "like", body: "x" } }),
    ).rejects.toThrow();
    // 대상을 지우면 반응도 지워진다
    await prisma.moment.delete({ where: { id: moment.id } });
    expect(await prisma.reaction.count()).toBe(0);
  });
});
