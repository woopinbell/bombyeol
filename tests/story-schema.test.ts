import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const user = await createUser(prisma, "부모");
  const grandma = await createUser(prisma, "김순자");
  const space = await prisma.space.create({ data: { name: "가족", createdById: user.id } });
  await prisma.member.create({ data: { spaceId: space.id, userId: user.id, role: "parent" } });
  const narrator = await prisma.member.create({
    data: { spaceId: space.id, userId: grandma.id, role: "grandparent", relationLabel: "할머니" },
  });
  const pet = await prisma.pet.create({
    data: { spaceId: space.id, name: "보리", species: "dog", createdById: user.id },
  });
  const story = await prisma.storyEntry.create({
    data: {
      spaceId: space.id,
      narratorMemberId: narrator.id,
      narratorName: "김순자",
      narratorLabel: "할머니",
      body: "어릴 적 살던 동네",
      createdById: grandma.id,
    },
  });
  return { user, grandma, space, narrator, pet, story };
}

describe("이야기(별) 스키마 체크 제약", () => {
  it("Reaction은 이야기를 대상으로 할 수 있고 대상은 여전히 정확히 하나다", async () => {
    const { user, space, story } = await family();
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
      prisma.reaction.create({ data: { ...base, storyEntryId: story.id, kind: "star" } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.reaction.create({
        data: { ...base, storyEntryId: story.id, momentId: moment.id, kind: "star" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.reaction.create({
        data: { ...base, storyEntryId: story.id, kind: "star", body: "x" },
      }),
    ).rejects.toThrow();
    // 이야기를 지우면 반응도 지워진다
    await prisma.storyEntry.delete({ where: { id: story.id } });
    expect(await prisma.reaction.count()).toBe(0);
  });

  it("물어보기는 질문 카드, 직접 쓴 질문 중 정확히 하나", async () => {
    const { user, space, narrator } = await family();
    const base = { spaceId: space.id, askedById: user.id, toMemberId: narrator.id };
    await expect(
      prisma.storyAsk.create({ data: { ...base, promptKey: "childhood_home" } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.storyAsk.create({ data: { ...base, question: "첫 직장은 어디였어요?" } }),
    ).resolves.toBeTruthy();
    await expect(prisma.storyAsk.create({ data: base })).rejects.toThrow();
    await expect(
      prisma.storyAsk.create({ data: { ...base, promptKey: "childhood_home", question: "x" } }),
    ).rejects.toThrow();
  });

  it("기념 프로필은 멤버, 반려동물 중 하나이고, 멤버가 사라져도 이야기, 기념 스냅샷은 남는다", async () => {
    const { user, space, narrator, pet, story } = await family();
    const base = { spaceId: space.id, createdById: user.id };
    await expect(
      prisma.memorialProfile.create({
        data: { ...base, memberId: narrator.id, petId: pet.id },
      }),
    ).rejects.toThrow();
    const memorial = await prisma.memorialProfile.create({
      data: { ...base, memberId: narrator.id, name: "김순자", relationLabel: "할머니" },
    });
    await prisma.member.delete({ where: { id: narrator.id } });
    await expect(
      prisma.memorialProfile.findUniqueOrThrow({ where: { id: memorial.id } }),
    ).resolves.toMatchObject({ memberId: null, name: "김순자" });
    await expect(
      prisma.storyEntry.findUniqueOrThrow({ where: { id: story.id } }),
    ).resolves.toMatchObject({ narratorMemberId: null, narratorName: "김순자" });
  });

  it("이야기 시기(연)는 상식 범위만", async () => {
    const { grandma, space } = await family();
    const base = { spaceId: space.id, body: "글", createdById: grandma.id };
    await expect(
      prisma.storyEntry.create({ data: { ...base, storyYear: 1968 } }),
    ).resolves.toBeTruthy();
    await expect(prisma.storyEntry.create({ data: { ...base, storyYear: 0 } })).rejects.toThrow();
  });
});
