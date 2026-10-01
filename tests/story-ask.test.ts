import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, STORY_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { exhaustRateLimit } from "./helpers/rate";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

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
  return { ...setup, grandma, grandpa, uncle };
}

describe("story 물어보기", () => {
  it("parent가 어르신께 카드를 보내고, 어르신이 답하면 닫힌다", async () => {
    const { api, spaceId, grandma, parent } = await family();
    const ask = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      promptKey: "grandchildren_birth",
    });
    expect(ask).toMatchObject({
      promptKey: "grandchildren_birth",
      question: null,
      entryId: null,
      askedBy: { id: parent.id, name: "부모" },
      to: { memberId: grandma.member.id, label: "할머니", name: "김순자" },
    });
    const inbox = await grandma.api.story.asks({ spaceId, toMemberId: grandma.member.id });
    expect(inbox.map((a) => a.id)).toEqual([ask.id]);

    const story = await grandma.api.story.create({
      spaceId,
      askId: ask.id,
      promptKey: "food_signature", // 물어보기의 카드가 우선
      body: "네가 태어난 날 눈이 왔단다.",
    });
    expect(story).toMatchObject({
      promptKey: "grandchildren_birth",
      category: "grandchildren",
      narrator: { memberId: grandma.member.id },
      scribe: null,
      ask: { id: ask.id, promptKey: "grandchildren_birth", question: null },
    });
    expect(await grandma.api.story.asks({ spaceId, toMemberId: grandma.member.id })).toEqual([]);
    expect(await api.story.asks({ spaceId })).toEqual([]);
    const list = await api.story.list({ spaceId });
    expect(list.items[0].ask).toMatchObject({ id: ask.id, promptKey: "grandchildren_birth" });
  });

  it("직접 쓴 질문도 보낼 수 있고, 가족이 대신 받아 적으면 화자는 질문받은 어르신이다", async () => {
    const { api, spaceId, grandma, parent } = await family();
    const ask = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      question: "엄마 어릴 때 제일 개구쟁이 짓은요?",
    });
    const story = await api.story.create({ spaceId, askId: ask.id, body: "담 넘다 걸렸지" });
    const parentMember = await prisma.member.findFirstOrThrow({ where: { userId: parent.id } });
    expect(story).toMatchObject({
      promptKey: null,
      narrator: { memberId: grandma.member.id },
      scribe: { memberId: parentMember.id },
      ask: { question: "엄마 어릴 때 제일 개구쟁이 짓은요?" },
    });
  });

  it("이미 답한 물어보기·질문받지 않은 화자로는 답할 수 없다", async () => {
    const { api, spaceId, grandma, grandpa } = await family();
    const ask = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      promptKey: "love_wedding",
    });
    // 질문받지 않은 어르신을 화자로 답할 수 없다(대신 받아 적는 것은 된다 — 화자는 할머니)
    await expect(
      grandpa.api.story.create({
        spaceId,
        askId: ask.id,
        narratorMemberId: grandpa.member.id,
        body: "내 이야기로",
      }),
    ).rejects.toMatchObject({ message: "NARRATOR_INVALID" });
    await grandma.api.story.create({ spaceId, askId: ask.id, body: "봄날이었지" });
    await expect(
      grandma.api.story.create({ spaceId, askId: ask.id, body: "또 답" }),
    ).rejects.toMatchObject({ message: "ASK_ANSWERED" });
  });

  it("동시에 답해도 물어보기에는 이야기 하나만 붙는다", async () => {
    const { api, spaceId, grandma } = await family();
    const ask = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      promptKey: "places_hometown",
    });
    const results = await Promise.allSettled([
      grandma.api.story.create({ spaceId, askId: ask.id, body: "하나" }),
      api.story.create({ spaceId, askId: ask.id, body: "둘" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.storyEntry.count()).toBe(1);
  });

  it("같은 카드를 다시 보내면 열린 물어보기를 돌려준다", async () => {
    const { api, spaceId, grandma } = await family();
    const input = { spaceId, toMemberId: grandma.member.id, promptKey: "youth_dream" };
    const first = await api.story.ask(input);
    const again = await api.story.ask(input);
    expect(again.id).toBe(first.id);
    expect(await prisma.storyAsk.count()).toBe(1);
  });

  it("parent만 보내고, 받는 분은 같은 Space의 어르신이어야 한다", async () => {
    const { api, spaceId, grandma, grandpa, uncle } = await family();
    await expect(
      grandpa.api.story.ask({ spaceId, toMemberId: grandma.member.id, question: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      uncle.api.story.ask({ spaceId, toMemberId: grandma.member.id, question: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.story.ask({ spaceId, toMemberId: uncle.member.id, question: "x" }),
    ).rejects.toMatchObject({ message: "NARRATOR_INVALID" });
    const other = await mediaSetup(prisma);
    const otherMember = await prisma.member.findFirstOrThrow({
      where: { spaceId: other.spaceId },
    });
    await expect(
      api.story.ask({ spaceId, toMemberId: otherMember.id, question: "x" }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
  });

  it("카드와 질문 중 정확히 하나, 없는 카드는 거부", async () => {
    const { api, spaceId, grandma } = await family();
    const toMemberId = grandma.member.id;
    await expect(api.story.ask({ spaceId, toMemberId })).rejects.toMatchObject({
      message: "QUESTION_REQUIRED",
    });
    await expect(
      api.story.ask({ spaceId, toMemberId, promptKey: "youth_dream", question: "x" }),
    ).rejects.toMatchObject({ message: "QUESTION_REQUIRED" });
    await expect(
      api.story.ask({ spaceId, toMemberId, promptKey: "no_such_card" }),
    ).rejects.toMatchObject({ message: "PROMPT_INVALID" });
  });

  it("G-07: 사용자당 리밋과 어르신당 열린 물어보기 상한", async () => {
    const { api, spaceId, grandma, parent } = await family();
    const toMemberId = grandma.member.id;
    await prisma.storyAsk.createMany({
      data: Array.from({ length: STORY_POLICY.openAsksPerMember }, (_, i) => ({
        spaceId,
        askedById: parent.id,
        toMemberId,
        question: `질문 ${i}`,
      })),
    });
    await expect(api.story.ask({ spaceId, toMemberId, question: "하나 더" })).rejects.toMatchObject(
      { message: "ASK_OPEN_LIMIT" },
    );
    await prisma.rateCounter.deleteMany();
    await exhaustRateLimit(prisma, `story-ask:${parent.id}`, RATE_LIMITS.storyAskPerUser);
    await expect(api.story.ask({ spaceId, toMemberId, question: "또" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("거두기는 보낸 사람 또는 parent만, 답한 이야기는 남는다", async () => {
    const { api, spaceId, grandma, uncle } = await family();
    const ask = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      promptKey: "work_proud",
    });
    await expect(uncle.api.story.cancelAsk({ spaceId, askId: ask.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const story = await grandma.api.story.create({ spaceId, askId: ask.id, body: "상 받은 날" });
    await api.story.cancelAsk({ spaceId, askId: ask.id });
    await expect(api.story.get({ spaceId, storyId: story.id })).resolves.toMatchObject({
      ask: null,
    });
  });
});
