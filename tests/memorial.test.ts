import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { nextAnniversary } from "@/lib/anniversary";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("기일 계산(조회 시점)", () => {
  it("다가오는 기일·주기·남은 날", () => {
    expect(nextAnniversary(d("2020-10-05"), d("2026-10-01"))).toEqual({
      date: d("2026-10-05"),
      years: 6,
      daysUntil: 4,
    });
    // 오늘이 기일이면 0일
    expect(nextAnniversary(d("2020-10-01"), d("2026-10-01"))).toMatchObject({
      years: 6,
      daysUntil: 0,
    });
    // 올해 기일이 지났으면 내년
    expect(nextAnniversary(d("2020-03-01"), d("2026-10-01"))).toMatchObject({
      date: d("2027-03-01"),
      years: 7,
    });
  });

  it("떠난 해에는 1주기가 다음 기일이고, 미래 날짜는 계산하지 않는다", () => {
    expect(nextAnniversary(d("2026-10-01"), d("2026-10-01"))).toMatchObject({
      date: d("2027-10-01"),
      years: 1,
      daysUntil: 365,
    });
    expect(nextAnniversary(d("2026-12-01"), d("2026-10-01"))).toBeNull();
  });

  it("2월 29일은 평년에 2월 28일로 본다", () => {
    expect(nextAnniversary(d("2024-02-29"), d("2026-10-01"))).toMatchObject({
      date: d("2027-02-28"),
      years: 3,
    });
    expect(nextAnniversary(d("2024-02-29"), d("2027-10-01"))).toMatchObject({
      date: d("2028-02-29"),
    });
  });
});

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

describe("memorial 기념 상태(사람)", () => {
  it("parent가 전환하면 이름·관계 스냅샷이 남고 기일 카드가 계산된다", async () => {
    const { api, spaceId, grandma, uncle } = await family();
    const memorial = await api.memorial.mark({
      spaceId,
      target: { type: "member", memberId: grandma.member.id },
      passedAt: "2025-10-05",
      note: "늘 웃으시던 분",
    });
    expect(memorial).toMatchObject({
      memberId: grandma.member.id,
      name: "김순자",
      relationLabel: "할머니",
      note: "늘 웃으시던 분",
    });
    const list = await uncle.api.memorial.list({ spaceId, today: "2026-10-01" });
    expect(list).toHaveLength(1);
    expect(list[0].anniversary).toEqual({ date: d("2026-10-05"), years: 1, daysUntil: 4 });
  });

  it("parent만 전환하고, 자기 자신·다른 Space·이미 기념인 대상은 안 된다", async () => {
    const { api, spaceId, grandma, grandpa, uncle } = await family();
    const target = { type: "member", memberId: grandma.member.id } as const;
    await expect(grandpa.api.memorial.mark({ spaceId, target })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(uncle.api.memorial.mark({ spaceId, target })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const self = await prisma.member.findFirstOrThrow({ where: { spaceId, role: "parent" } });
    await expect(
      api.memorial.mark({ spaceId, target: { type: "member", memberId: self.id } }),
    ).rejects.toMatchObject({ message: "MEMORIAL_SELF" });
    const other = await mediaSetup(prisma);
    const otherMember = await prisma.member.findFirstOrThrow({
      where: { spaceId: other.spaceId },
    });
    await expect(
      api.memorial.mark({ spaceId, target: { type: "member", memberId: otherMember.id } }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
    await api.memorial.mark({ spaceId, target });
    await expect(api.memorial.mark({ spaceId, target })).rejects.toMatchObject({
      message: "ALREADY_MEMORIAL",
    });
    await expect(
      api.memorial.mark({
        spaceId,
        target: { type: "member", memberId: grandpa.member.id },
        passedAt: "2999-01-01",
      }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
  });

  it("기념 상태인 분: 새 이야기·대필·물어보기는 막히고, 이야기는 고치거나 지울 수 없으며 추모 반응은 된다", async () => {
    const { api, spaceId, grandma, grandpa, uncle } = await family();
    const story = await grandma.api.story.create({ spaceId, body: "내 고향은 바닷가" });
    const openAsk = await api.story.ask({
      spaceId,
      toMemberId: grandma.member.id,
      promptKey: "wisdom_to_family",
    });
    await api.memorial.mark({ spaceId, target: { type: "member", memberId: grandma.member.id } });

    // 답을 기다리던 물어보기는 거둬진다
    expect(await prisma.storyAsk.count({ where: { id: openAsk.id } })).toBe(0);
    for (const attempt of [
      grandma.api.story.create({ spaceId, body: "x" }),
      api.story.create({ spaceId, narratorMemberId: grandma.member.id, body: "x" }),
      grandpa.api.story.create({ spaceId, narratorMemberId: grandma.member.id, body: "x" }),
      api.story.ask({ spaceId, toMemberId: grandma.member.id, question: "x" }),
      grandma.api.story.update({ spaceId, storyId: story.id, body: "x" }),
      api.story.delete({ spaceId, storyId: story.id }),
    ]) {
      await expect(attempt).rejects.toMatchObject({ message: "MEMORIAL_READ_ONLY" });
    }

    const target = { type: "story", storyEntryId: story.id } as const;
    await expect(uncle.api.reaction.toggleStar({ spaceId, target })).resolves.toMatchObject({
      starred: true,
    });
    await uncle.api.reaction.addComment({ spaceId, target, body: "보고 싶어요" });
    const shown = await uncle.api.story.get({ spaceId, storyId: story.id });
    expect(shown.narrator).toMatchObject({ name: "김순자", memorial: true });
    expect(shown.reactions).toMatchObject({ stars: 1, comments: 1 });
  });

  it("되돌리면 다시 쓰고 고칠 수 있다", async () => {
    const { api, spaceId, grandma } = await family();
    const story = await grandma.api.story.create({ spaceId, body: "옛날 이야기" });
    const memorial = await api.memorial.mark({
      spaceId,
      target: { type: "member", memberId: grandma.member.id },
    });
    await api.memorial.unmark({ spaceId, memorialId: memorial.id });
    await expect(
      grandma.api.story.update({ spaceId, storyId: story.id, body: "고친 이야기" }),
    ).resolves.toMatchObject({ body: "고친 이야기", narrator: { memorial: false } });
    expect(await api.memorial.list({ spaceId })).toEqual([]);
  });

  it("떠난 날·메모 고치기는 parent만", async () => {
    const { api, spaceId, grandma, grandpa } = await family();
    const memorial = await api.memorial.mark({
      spaceId,
      target: { type: "member", memberId: grandma.member.id },
    });
    await expect(
      grandpa.api.memorial.update({ spaceId, memorialId: memorial.id, note: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.memorial.update({
        spaceId,
        memorialId: memorial.id,
        passedAt: "2024-02-29",
        note: "봄에 떠나셨다",
      }),
    ).resolves.toMatchObject({ passedAt: d("2024-02-29"), note: "봄에 떠나셨다" });
  });
});

describe("memorial 기념 상태(반려동물)", () => {
  it("별이 된 반려동물: 상태·떠난 날이 프로필에 반영되고, 마일스톤은 막히고 추억 사진은 올릴 수 있다", async () => {
    const { api, storage, spaceId, grandma } = await family();
    const pet = await api.pet.create({ spaceId, name: "보리", species: "dog" });
    const story = await grandma.api.story.create({ spaceId, body: "보리와 산책", petId: pet.id });
    const memorial = await api.memorial.mark({
      spaceId,
      target: { type: "pet", petId: pet.id },
      passedAt: "2026-09-01",
    });
    expect(memorial).toMatchObject({ petId: pet.id, name: "보리" });
    const [profile] = await api.pet.list({ spaceId });
    expect(profile).toMatchObject({ status: "memorial", passedAt: d("2026-09-01") });

    await expect(
      api.milestone.create({
        spaceId,
        subject: { type: "pet", petId: pet.id },
        kind: "weight",
        value: { value: 10 },
        recordedAt: "2026-09-20",
      }),
    ).rejects.toMatchObject({ message: "MEMORIAL_READ_ONLY" });
    const photo = await uploadConfirmed(api, storage, spaceId);
    await expect(
      grandma.api.moment.create({
        spaceId,
        subject: { type: "pet", petId: pet.id },
        media: [{ assetId: photo }],
      }),
    ).resolves.toBeTruthy();
    // 반려동물에 붙인 어르신의 이야기는 그대로(화자는 기념 상태가 아니다)
    await expect(
      grandma.api.story.update({ spaceId, storyId: story.id, body: "보리야 고마워" }),
    ).resolves.toBeTruthy();

    await api.memorial.update({ spaceId, memorialId: memorial.id, passedAt: "2026-08-30" });
    expect((await api.pet.list({ spaceId }))[0].passedAt).toEqual(d("2026-08-30"));
    await api.memorial.unmark({ spaceId, memorialId: memorial.id });
    expect((await api.pet.list({ spaceId }))[0]).toMatchObject({
      status: "living",
      passedAt: null,
    });
  });
});
