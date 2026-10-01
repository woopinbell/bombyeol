import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, STORY_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { exhaustRateLimit } from "./helpers/rate";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 부모 + 할머니(김순자) + 할아버지 + 삼촌(relative) */
async function family() {
  const setup = await mediaSetup(prisma);
  const join = async (name: string, role: "grandparent" | "relative", label: string) => {
    const user = await prisma.user.create({ data: { name } });
    const member = await prisma.member.create({
      data: { spaceId: setup.spaceId, userId: user.id, role, relationLabel: label },
    });
    return { user, member, api: callerFor(prisma, user.id, "203.0.113.9", setup.storage) };
  };
  const grandma = await join("김순자", "grandparent", "할머니");
  const grandpa = await join("박영수", "grandparent", "할아버지");
  const uncle = await join("김삼촌", "relative", "삼촌");
  const parentMember = await prisma.member.findFirstOrThrow({
    where: { spaceId: setup.spaceId, role: "parent" },
  });
  return { ...setup, grandma, grandpa, uncle, parentMember };
}

describe("story 쓰기·대필", () => {
  it("어르신이 질문 카드에 직접 답하면 카테고리는 카드를 따르고 대필자는 없다", async () => {
    const { spaceId, grandma } = await family();
    const story = await grandma.api.story.create({
      spaceId,
      promptKey: "food_signature",
      category: "work", // 카드가 있으면 무시
      body: "  된장찌개는 멸치 육수부터.  ",
      storyYear: 1975,
    });
    expect(story).toMatchObject({
      promptKey: "food_signature",
      category: "food",
      body: "된장찌개는 멸치 육수부터.",
      storyYear: 1975,
      narrator: { memberId: grandma.member.id, name: "김순자", label: "할머니" },
      scribe: null,
    });
  });

  it("가족 대필: 화자(어르신)와 대필자를 함께 기록한다", async () => {
    const { api, spaceId, grandma, grandpa, parentMember } = await family();
    const byParent = await api.story.create({
      spaceId,
      narratorMemberId: grandma.member.id,
      title: "시집오던 날",
      category: "love",
      body: "할머니 말씀: 가마 타고 왔지.",
    });
    expect(byParent).toMatchObject({
      category: "love",
      narrator: { memberId: grandma.member.id, name: "김순자", label: "할머니" },
      scribe: { memberId: parentMember.id, name: "부모" },
    });
    // 어르신끼리 대필도 된다
    const bySpouse = await grandpa.api.story.create({
      spaceId,
      narratorMemberId: grandma.member.id,
      body: "할아버지가 받아 적음",
    });
    expect(bySpouse.scribe).toMatchObject({ memberId: grandpa.member.id, name: "박영수" });
  });

  it("부모는 자기 이야기를 쓸 수 있지만 어르신이 아닌 사람의 이야기는 대필할 수 없다", async () => {
    const { api, spaceId, grandma, uncle, parentMember } = await family();
    await expect(api.story.create({ spaceId, body: "내 어린 시절" })).resolves.toMatchObject({
      narrator: { memberId: parentMember.id },
      scribe: null,
    });
    await expect(
      grandma.api.story.create({ spaceId, narratorMemberId: parentMember.id, body: "x" }),
    ).rejects.toMatchObject({ message: "NARRATOR_INVALID" });
    await expect(
      api.story.create({ spaceId, narratorMemberId: uncle.member.id, body: "x" }),
    ).rejects.toMatchObject({ message: "NARRATOR_INVALID" });
  });

  it("relative는 이야기를 쓰거나 대필할 수 없다(열람·반응만)", async () => {
    const { spaceId, grandma, uncle } = await family();
    await expect(uncle.api.story.create({ spaceId, body: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      uncle.api.story.create({ spaceId, narratorMemberId: grandma.member.id, body: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("없는 카드·다른 Space의 화자·반려동물·미래 연도는 거부한다", async () => {
    const { api, spaceId, grandma } = await family();
    const other = await mediaSetup(prisma);
    const otherMember = await prisma.member.findFirstOrThrow({
      where: { spaceId: other.spaceId },
    });
    const otherPet = await other.api.pet.create({
      spaceId: other.spaceId,
      name: "남의 개",
      species: "dog",
    });
    await expect(
      grandma.api.story.create({ spaceId, promptKey: "no_such_card", body: "x" }),
    ).rejects.toMatchObject({ message: "PROMPT_INVALID" });
    await expect(
      api.story.create({ spaceId, narratorMemberId: otherMember.id, body: "x" }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
    await expect(
      grandma.api.story.create({ spaceId, petId: otherPet.id, body: "x" }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
    await expect(
      grandma.api.story.create({ spaceId, body: "x", storyYear: new Date().getFullYear() + 2 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      grandma.api.story.create({ spaceId, body: "x".repeat(STORY_POLICY.bodyMaxChars + 1) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("G-07: 이야기 쓰기는 사용자당 리밋이 있다", async () => {
    const { spaceId, grandma } = await family();
    await exhaustRateLimit(prisma, `story-write:${grandma.user.id}`, RATE_LIMITS.storyWritePerUser);
    await expect(grandma.api.story.create({ spaceId, body: "x" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});

describe("story 고치기·지우기·목록", () => {
  it("고치기는 쓴 사람 또는 화자 본인만, 카드 답의 카테고리는 바꿀 수 없다", async () => {
    const { api, spaceId, grandma, grandpa } = await family();
    const scribed = await api.story.create({
      spaceId,
      narratorMemberId: grandma.member.id,
      promptKey: "holidays_chuseok",
      body: "송편",
    });
    await expect(
      grandma.api.story.update({ spaceId, storyId: scribed.id, body: "송편을 빚었지" }),
    ).resolves.toMatchObject({ body: "송편을 빚었지" });
    await expect(
      api.story.update({ spaceId, storyId: scribed.id, storyYear: 1962, title: "추석" }),
    ).resolves.toMatchObject({ storyYear: 1962, title: "추석" });
    await expect(
      grandpa.api.story.update({ spaceId, storyId: scribed.id, body: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.story.update({ spaceId, storyId: scribed.id, category: "food" }),
    ).rejects.toMatchObject({ message: "PROMPT_INVALID" });
  });

  it("지우기는 쓴 사람·화자·parent만", async () => {
    const { api, spaceId, grandma, grandpa, uncle } = await family();
    const story = await grandpa.api.story.create({ spaceId, body: "내 이야기" });
    await expect(uncle.api.story.delete({ spaceId, storyId: story.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(grandma.api.story.delete({ spaceId, storyId: story.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(api.story.delete({ spaceId, storyId: story.id })).resolves.toEqual({ ok: true });
    await expect(api.story.get({ spaceId, storyId: story.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("목록은 최신순으로 페이지를 넘기고 화자·카테고리·반려동물로 거른다", async () => {
    const { api, spaceId, grandma, grandpa, uncle } = await family();
    const pet = await api.pet.create({ spaceId, name: "누렁이", species: "dog" });
    for (let i = 0; i < STORY_POLICY.pageSize; i++) {
      await grandma.api.story.create({ spaceId, body: `이야기 ${i}` });
    }
    await grandpa.api.story.create({ spaceId, promptKey: "work_first_job", body: "공장" });
    await grandpa.api.story.create({ spaceId, body: "옛날 강아지", petId: pet.id });

    const first = await uncle.api.story.list({ spaceId });
    expect(first.items).toHaveLength(STORY_POLICY.pageSize);
    expect(first.items[0].body).toBe("옛날 강아지");
    const second = await uncle.api.story.list({ spaceId, cursor: first.nextCursor! });
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();

    const byGrandpa = await uncle.api.story.list({
      spaceId,
      narratorMemberId: grandpa.member.id,
    });
    expect(byGrandpa.items).toHaveLength(2);
    const work = await uncle.api.story.list({ spaceId, category: "work" });
    expect(work.items.map((s) => s.body)).toEqual(["공장"]);
    const aboutPet = await uncle.api.story.list({ spaceId, petId: pet.id });
    expect(aboutPet.items.map((s) => s.body)).toEqual(["옛날 강아지"]);
  });

  it("다른 Space의 이야기는 보이지 않는다", async () => {
    const { spaceId, grandma } = await family();
    const story = await grandma.api.story.create({ spaceId, body: "우리 집 이야기" });
    const other = await mediaSetup(prisma);
    await expect(
      other.api.story.get({ spaceId: other.spaceId, storyId: story.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      other.api.story.delete({ spaceId: other.spaceId, storyId: story.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
