import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STORY_CATEGORIES, STORY_PROMPTS } from "@/lib/story-prompts";
import ko from "../messages/ko.json";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("질문 카드 카탈로그", () => {
  it("모든 카드·카테고리에 한국어 문구가 있고 남는 문구가 없다", () => {
    expect(Object.keys(ko.story.prompts).sort()).toEqual(Object.keys(STORY_PROMPTS).sort());
    expect(Object.keys(ko.story.categories).sort()).toEqual([...STORY_CATEGORIES].sort());
  });

  it("모든 카테고리에 카드가 하나 이상 있다", () => {
    const used = new Set(Object.values(STORY_PROMPTS));
    expect(STORY_CATEGORIES.filter((c) => !used.has(c))).toEqual([]);
  });
});

describe("story.prompts", () => {
  it("카테고리로 거르고, 어르신이 답한 카드에 표시한다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const grandparent = await addMember(prisma, spaceId, "grandparent");
    const narrator = await prisma.member.findFirstOrThrow({ where: { role: "grandparent" } });
    await prisma.storyEntry.create({
      data: {
        spaceId,
        narratorMemberId: narrator.id,
        promptKey: "food_signature",
        body: "된장찌개",
        createdById: narrator.userId,
      },
    });

    const food = await grandparent.story.prompts({ spaceId, category: "food" });
    expect(food.map((p) => p.key)).toEqual([
      "food_mothers_dish",
      "food_signature",
      "food_hungry_days",
    ]);
    expect(food.every((p) => !p.answered)).toBe(true);

    const mine = await api.story.prompts({ spaceId, narratorMemberId: narrator.id });
    expect(mine).toHaveLength(Object.keys(STORY_PROMPTS).length);
    expect(mine.filter((p) => p.answered).map((p) => p.key)).toEqual(["food_signature"]);
  });

  it("다른 Space의 멤버로는 조회할 수 없다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const other = await mediaSetup(prisma);
    const otherMember = await prisma.member.findFirstOrThrow({
      where: { spaceId: other.spaceId },
    });
    await expect(
      api.story.prompts({ spaceId, narratorMemberId: otherMember.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
