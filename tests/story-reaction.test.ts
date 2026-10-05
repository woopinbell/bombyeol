import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const grandma = await addMember(prisma, setup.spaceId, "grandparent", setup.storage);
  const relative = await addMember(prisma, setup.spaceId, "relative", setup.storage);
  const story = await grandma.story.create({
    spaceId: setup.spaceId,
    promptKey: "childhood_play",
    body: "고무줄놀이를 제일 잘했지",
  });
  return {
    ...setup,
    grandma,
    relative,
    storyId: story.id,
    target: { type: "story", storyEntryId: story.id } as const,
  };
}

describe("story 세대 교차 반응", () => {
  it("별 하나는 토글이고 이야기 목록, 상세에 요약이 나온다", async () => {
    const { api, grandma, relative, spaceId, storyId, target } = await family();
    await expect(relative.reaction.toggleStar({ spaceId, target })).resolves.toEqual({
      starred: true,
      stars: 1,
    });
    await expect(api.reaction.toggleStar({ spaceId, target })).resolves.toEqual({
      starred: true,
      stars: 2,
    });
    await expect(api.reaction.toggleStar({ spaceId, target })).resolves.toEqual({
      starred: false,
      stars: 1,
    });
    await relative.reaction.addComment({ spaceId, target, body: "할머니 최고!" });
    await grandma.reaction.addComment({ spaceId, target, body: "고맙다 우리 강아지" });

    const forGrandma = await grandma.story.list({ spaceId });
    expect(forGrandma.items[0].reactions).toEqual({ stars: 1, comments: 2, starredByMe: false });
    const forRelative = await relative.story.get({ spaceId, storyId });
    expect(forRelative.reactions).toEqual({ stars: 1, comments: 2, starredByMe: true });

    const comments = await grandma.reaction.listComments({ spaceId, target });
    expect(comments.items.map((c) => c.body)).toEqual(["할머니 최고!", "고맙다 우리 강아지"]);
  });

  it("setStar는 원하는 상태로 맞추고 여러 번 보내도 같다, 이야기에만", async () => {
    const { relative, spaceId, target } = await family();
    for (const [starred, stars] of [
      [true, 1],
      [true, 1],
      [false, 0],
      [false, 0],
    ] as const) {
      await expect(relative.reaction.setStar({ spaceId, target, starred })).resolves.toEqual({
        starred,
        stars,
      });
    }
    await Promise.all(
      Array.from({ length: 5 }, () =>
        relative.reaction.setStar({ spaceId, target, starred: true }),
      ),
    );
    expect(await prisma.reaction.count({ where: { kind: "star" } })).toBe(1);
  });

  it("좋아요는 오늘 기록에, 별 하나는 이야기에만", async () => {
    const { api, spaceId, target } = await family();
    const diary = await api.moment.createDiary({
      spaceId,
      subject: { type: "family" },
      body: "가족 나들이",
    });
    await expect(
      // @ts-expect-error 이야기에는 좋아요가 없다
      api.reaction.toggleLike({ spaceId, target }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.reaction.toggleStar({
        spaceId,
        // @ts-expect-error 오늘 기록에는 별 하나가 없다
        target: { type: "moment", momentId: diary.id },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("동시에 여러 번 눌러도 별 하나 행은 최대 하나다", async () => {
    const { relative, spaceId, target } = await family();
    await Promise.all(
      Array.from({ length: 5 }, () => relative.reaction.toggleStar({ spaceId, target })),
    );
    expect(await prisma.reaction.count({ where: { kind: "star" } })).toBe(1);
  });

  it("다른 Space의 이야기에는 반응할 수 없다", async () => {
    const { spaceId, target } = await family();
    const other = await mediaSetup(prisma);
    await expect(
      other.api.reaction.toggleStar({ spaceId: other.spaceId, target }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      other.api.reaction.addComment({ spaceId: other.spaceId, target, body: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(spaceId).not.toBe(other.spaceId);
  });

  it("G-07: 별 하나는 사용자당 리밋이 있다", async () => {
    const { parent, api, spaceId, target } = await family();
    await exhaustRateLimit(prisma, `star:${parent.id}`, RATE_LIMITS.starPerUser);
    await expect(api.reaction.toggleStar({ spaceId, target })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("이야기를 지우면 반응도 함께 지워진다", async () => {
    const { api, relative, spaceId, storyId, target } = await family();
    await relative.reaction.toggleStar({ spaceId, target });
    await relative.reaction.addComment({ spaceId, target, body: "좋아요" });
    await api.story.delete({ spaceId, storyId });
    expect(await prisma.reaction.count()).toBe(0);
  });

  it("이야기 모음 합계: 이야기 수와 받은 별 수, 화자로 거르고 다른 가족은 세지 않는다", async () => {
    const { api, grandma, relative, spaceId, target } = await family();
    await relative.reaction.toggleStar({ spaceId, target });
    await api.reaction.toggleStar({ spaceId, target });
    // 부모 자신의 이야기(별 하나)
    const mine = await api.story.create({ spaceId, body: "엄마의 어린 시절" });
    await grandma.reaction.toggleStar({
      spaceId,
      target: { type: "story", storyEntryId: mine.id },
    });
    // 댓글은 별이 아니다
    await relative.reaction.addComment({ spaceId, target, body: "좋아요" });
    // 다른 가족의 이야기와 별은 세지 않는다
    const other = await mediaSetup(prisma);
    const theirs = await other.api.story.create({ spaceId: other.spaceId, body: "다른 집" });
    await other.api.reaction.toggleStar({
      spaceId: other.spaceId,
      target: { type: "story", storyEntryId: theirs.id },
    });

    await expect(relative.story.summary({ spaceId })).resolves.toEqual({ stories: 2, stars: 3 });
    const grandmaMember = await prisma.member.findFirstOrThrow({
      where: { spaceId, role: "grandparent" },
    });
    await expect(
      api.story.summary({ spaceId, narratorMemberId: grandmaMember.id }),
    ).resolves.toEqual({ stories: 1, stars: 2 });
    await expect(other.api.story.summary({ spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // 반려동물로 거르기(목록과 같은 기준): 그 반려동물에 붙인 이야기와 그 이야기가 받은 별만
    const pet = await api.pet.create({ spaceId, name: "초코", species: "dog" });
    const aboutPet = await api.story.create({ spaceId, body: "초코와 산책", petId: pet.id });
    await relative.reaction.toggleStar({
      spaceId,
      target: { type: "story", storyEntryId: aboutPet.id },
    });
    await expect(api.story.summary({ spaceId, petId: pet.id })).resolves.toEqual({
      stories: 1,
      stars: 1,
    });
  });
});
