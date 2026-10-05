import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { MemberRole } from "@/generated/prisma/client";
import { CONSENT_VERSIONS } from "@/lib/consents";
import ko from "../messages/ko.json";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { FakeSender, giveToken, testPush, TEST_ORIGIN } from "./helpers/push";
import { callerFor } from "./helpers/trpc";
import { CHILD_CONSENT } from "./helpers/users";

// PRD §4.6 알림 연결. 수신자, 문구는 발송 시점(응답 뒤)에 DB에서 다시 정한다(ARCHITECTURE §7, PRIVACY §3).

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const { parent, storage, spaceId } = setup;
  const sender = new FakeSender();
  const push = testPush(prisma, sender);
  const api = callerFor(prisma, parent.id, "203.0.113.1", storage, push.dispatcher);
  const momToken = await giveToken(prisma, parent.id);
  const join = async (role: MemberRole) => {
    const user = await prisma.user.create({ data: { name: `${role}-이름` } });
    const member = await prisma.member.create({
      data: { spaceId, userId: user.id, role, relationLabel: "관계표시" },
    });
    const token = await giveToken(prisma, user.id);
    const caller = callerFor(prisma, user.id, "203.0.113.9", storage, push.dispatcher);
    return { userId: user.id, member, token, api: caller };
  };
  const dad = await join("parent");
  const grandma = await join("grandparent");
  const uncle = await join("relative");
  /** 응답 뒤 작업을 끝내고 이번에 보낸 것만 돌려준 뒤 기록을 비운다 */
  const sent = async () => {
    await push.flush();
    const out = sender.sent.splice(0);
    return { tokens: out.map((s) => s.token).sort(), messages: out.map((s) => s.message) };
  };
  return { ...setup, api, sender, momToken, dad, grandma, uncle, sent };
}

const sorted = (...tokens: string[]) => [...tokens].sort();

describe("새 사진, 일기 알림", () => {
  it("보낸 사람을 뺀 모든 멤버에게 고정 문구로 알린다", async () => {
    const f = await family();
    const asset = await uploadConfirmed(f.api, f.storage, f.spaceId);
    const moment = await f.api.moment.create({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "할머니 댁 마당에서",
      media: [{ assetId: asset }],
    });
    const { tokens, messages } = await f.sent();
    expect(tokens).toEqual(sorted(f.dad.token, f.grandma.token, f.uncle.token));
    expect(messages[0]).toMatchObject({
      title: ko.push.title,
      body: ko.push.body.moment,
      link: `${TEST_ORIGIN}/open/moment/${moment.id}`,
      data: { type: "moment", id: moment.id },
    });
    expect(JSON.stringify(messages)).not.toContain("마당");

    await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "일기",
    });
    expect((await f.sent()).tokens).toHaveLength(3);
  });

  it("응답 뒤 발송 전에 내보내진 멤버는 받지 않는다", async () => {
    const f = await family();
    await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "일기",
    });
    await prisma.member.delete({ where: { id: f.uncle.member.id } });
    expect((await f.sent()).tokens).toEqual(sorted(f.dad.token, f.grandma.token));
  });

  it("발송이 실패해도 기록 저장은 성공한다", async () => {
    const f = await family();
    f.sender.send = async () => {
      throw new Error("FCM down");
    };
    const diary = await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "일기",
    });
    expect(diary.id).toBeTruthy();
    await f.sent();
    expect(await prisma.moment.count()).toBe(1);
  });

  it("마일스톤은 알리지 않는다", async () => {
    const f = await family();
    const child = await f.api.child.create({
      spaceId: f.spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { name: "김봄", birthDate: "2026-01-01" },
    });
    await f.api.milestone.create({
      spaceId: f.spaceId,
      subject: { type: "child", childId: child.id },
      kind: "height",
      value: { value: 68.5 },
      recordedAt: "2026-07-01",
    });
    expect((await f.sent()).tokens).toEqual([]);
  });
});

describe("이야기, 물어보기 알림", () => {
  it("이야기는 쓴 사람을 뺀 모든 멤버에게 - 대필이면 화자 어르신도 받는다", async () => {
    const f = await family();
    await f.api.story.create({
      spaceId: f.spaceId,
      narratorMemberId: f.grandma.member.id,
      body: "시집오던 날 이야기",
    });
    const { tokens, messages } = await f.sent();
    expect(tokens).toEqual(sorted(f.dad.token, f.grandma.token, f.uncle.token));
    expect(messages[0].body).toBe(ko.push.body.story);
    expect(JSON.stringify(messages)).not.toContain("시집");
  });

  it("물어보기는 질문받은 어르신께만, 같은 카드를 다시 보내면 다시 알리지 않는다", async () => {
    const f = await family();
    const ask = {
      spaceId: f.spaceId,
      toMemberId: f.grandma.member.id,
      promptKey: "food_signature",
    };
    await f.api.story.ask(ask);
    const first = await f.sent();
    expect(first.tokens).toEqual([f.grandma.token]);
    expect(first.messages[0].body).toBe(ko.push.body.ask);
    await f.api.story.ask(ask);
    expect((await f.sent()).tokens).toEqual([]);
  });

  it("직접 쓴 질문의 내용은 알림에 실리지 않고, 발송 전에 답한 물어보기는 알리지 않는다", async () => {
    const f = await family();
    const ask = await f.api.story.ask({
      spaceId: f.spaceId,
      toMemberId: f.grandma.member.id,
      question: "첫 월급으로 무엇을 사셨어요?",
    });
    await prisma.storyAsk.update({
      where: { id: ask.id },
      data: {
        entry: {
          create: { spaceId: f.spaceId, body: "답", createdById: f.grandma.userId },
        },
      },
    });
    expect((await f.sent()).tokens).toEqual([]);

    const open = await f.api.story.ask({
      spaceId: f.spaceId,
      toMemberId: f.grandma.member.id,
      question: "첫 월급으로 무엇을 사셨어요?",
    });
    const { messages } = await f.sent();
    expect(messages[0].data).toEqual({ type: "ask", id: open.id });
    expect(JSON.stringify(messages)).not.toContain("월급");
  });
});

describe("반응 알림", () => {
  it("좋아요는 기록을 쓴 사람에게, 켤 때만, 같은 대상은 쿨다운 안에 한 번", async () => {
    const f = await family();
    const diary = await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "일기",
    });
    await f.sent();
    const target = { type: "moment", momentId: diary.id } as const;

    await f.grandma.api.reaction.toggleLike({ spaceId: f.spaceId, target });
    const first = await f.sent();
    expect(first.tokens).toEqual([f.momToken]);
    expect(first.messages[0].body).toBe(ko.push.body.heart);

    await f.grandma.api.reaction.toggleLike({ spaceId: f.spaceId, target }); // 끄기
    await f.grandma.api.reaction.toggleLike({ spaceId: f.spaceId, target }); // 다시 켜기
    await f.uncle.api.reaction.toggleLike({ spaceId: f.spaceId, target });
    expect((await f.sent()).tokens).toEqual([]);
  });

  it("자기 기록에 누른 좋아요는 알리지 않고 쿨다운도 쓰지 않는다", async () => {
    const f = await family();
    const diary = await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "일기",
    });
    await f.sent();
    const target = { type: "moment", momentId: diary.id } as const;
    await f.api.reaction.toggleLike({ spaceId: f.spaceId, target });
    expect((await f.sent()).tokens).toEqual([]);
    await f.grandma.api.reaction.toggleLike({ spaceId: f.spaceId, target });
    expect((await f.sent()).tokens).toEqual([f.momToken]);
  });

  it("이야기의 별 하나는 화자와 대필자에게, 댓글은 댓글 문구로(본문 없이)", async () => {
    const f = await family();
    const story = await f.api.story.create({
      spaceId: f.spaceId,
      narratorMemberId: f.grandma.member.id,
      body: "이야기",
    });
    await f.sent();
    const target = { type: "story", storyEntryId: story.id } as const;
    await f.uncle.api.reaction.toggleStar({ spaceId: f.spaceId, target });
    const star = await f.sent();
    expect(star.tokens).toEqual(sorted(f.momToken, f.grandma.token));
    expect(star.messages[0].body).toBe(ko.push.body.heart);

    await f.dad.api.reaction.addComment({ spaceId: f.spaceId, target, body: "할머니 최고" });
    const comment = await f.sent();
    expect(comment.tokens).toEqual(sorted(f.momToken, f.grandma.token));
    expect(comment.messages[0].body).toBe(ko.push.body.comment);
    expect(JSON.stringify(comment.messages)).not.toContain("최고");

    await f.dad.api.reaction.addComment({ spaceId: f.spaceId, target, body: "또" });
    expect((await f.sent()).tokens).toEqual([]);
  });
});

describe("임신 기록 알림(PRIVACY §3)", () => {
  async function expecting() {
    const f = await family();
    await f.api.consent.grantSpace({
      spaceId: f.spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    const child = await f.api.child.create({
      spaceId: f.spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "콩이", dueDate: "2027-03-01" },
    });
    return { ...f, childId: child.id };
  }

  it("parents_only 기록은 다른 parent에게만, 문구는 '새 소식이 있어요'뿐", async () => {
    const f = await expecting();
    const photo = await uploadConfirmed(f.api, f.storage, f.spaceId);
    await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: f.childId,
      kind: "ultrasound",
      date: "2026-09-20",
      note: "12주 초음파",
      photoAssetId: photo,
    });
    const { tokens, messages } = await f.sent();
    expect(tokens).toEqual([f.dad.token]);
    expect(messages[0].title).toBe(ko.push.title);
    expect(messages[0].body).toBe(ko.push.body.news);
    const all = JSON.stringify(messages);
    for (const word of ["초음파", "12주", "콩이", "임신"]) expect(all).not.toContain(word);
  });

  it("가족 공개 기록은 모든 멤버에게", async () => {
    const f = await expecting();
    await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: f.childId,
      kind: "kick",
      date: "2026-09-21",
      visibility: "family",
    });
    expect((await f.sent()).tokens).toEqual(sorted(f.dad.token, f.grandma.token, f.uncle.token));
  });

  it("발송 전에 parents_only로 좁히면 좁힌 대로, 지우면 보내지 않는다", async () => {
    const f = await expecting();
    const record = await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: f.childId,
      kind: "kick",
      date: "2026-09-21",
      visibility: "family",
    });
    await prisma.pregnancyRecord.update({
      where: { id: record.id },
      data: { visibility: "parents_only" },
    });
    expect((await f.sent()).tokens).toEqual([f.dad.token]);

    const gone = await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: f.childId,
      kind: "kick",
      date: "2026-09-22",
      visibility: "family",
    });
    await prisma.pregnancyRecord.delete({ where: { id: gone.id } });
    expect((await f.sent()).tokens).toEqual([]);
  });

  it("역할이 parent에서 바뀌면 다음 발송부터 parents_only 알림을 받지 않는다", async () => {
    const f = await expecting();
    await prisma.member.update({ where: { id: f.dad.member.id }, data: { role: "relative" } });
    await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: f.childId,
      kind: "kick",
      date: "2026-09-21",
    });
    expect((await f.sent()).tokens).toEqual([]);
  });
});
