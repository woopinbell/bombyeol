import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const { spaceId, storage } = setup;
  const join = async (name: string, role: "parent" | "grandparent" | "relative", label: string) => {
    const user = await prisma.user.create({ data: { name } });
    const member = await prisma.member.create({
      data: { spaceId, userId: user.id, role, relationLabel: label },
    });
    return { user, member, api: callerFor(prisma, user.id, "203.0.113.9", storage) };
  };
  const creator = await prisma.member.findFirstOrThrow({ where: { spaceId } });
  return {
    ...setup,
    creator,
    partner: await join("배우자", "parent", "아빠"),
    grandma: await join("김순자", "grandparent", "할머니"),
    uncle: await join("김삼촌", "relative", "삼촌"),
  };
}

describe("family 멤버 관리", () => {
  it("멤버 목록에 나, 만든 사람, 기념 상태 표시가 있다", async () => {
    const { api, spaceId, creator, grandma } = await family();
    await api.memorial.mark({ spaceId, target: { type: "member", memberId: grandma.member.id } });
    const members = await grandma.api.family.members({ spaceId });
    expect(members.map((m) => [m.name, m.role, m.me, m.creator, m.memorial])).toEqual([
      ["부모", "parent", false, true, false],
      ["배우자", "parent", false, false, false],
      ["김순자", "grandparent", true, false, true],
      ["김삼촌", "relative", false, false, false],
    ]);
    expect(members[0].id).toBe(creator.id);
  });

  it("관계 표시명은 본인 또는 parent가 고친다", async () => {
    const { api, spaceId, grandma, uncle } = await family();
    await expect(
      grandma.api.family.updateLabel({
        spaceId,
        memberId: grandma.member.id,
        relationLabel: "외할머니",
      }),
    ).resolves.toEqual({ memberId: grandma.member.id, relationLabel: "외할머니" });
    await expect(
      uncle.api.family.updateLabel({ spaceId, memberId: grandma.member.id, relationLabel: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await api.family.updateLabel({ spaceId, memberId: uncle.member.id, relationLabel: null });
    expect(
      (await prisma.member.findUniqueOrThrow({ where: { id: uncle.member.id } })).relationLabel,
    ).toBeNull();
    const other = await mediaSetup(prisma);
    const foreign = await prisma.member.findFirstOrThrow({ where: { spaceId: other.spaceId } });
    await expect(
      api.family.updateLabel({ spaceId, memberId: foreign.id, relationLabel: "x" }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
  });

  it("역할 바꾸기는 parent만, 자기 자신, 만든 사람, 기념 상태인 분은 대상이 아니다", async () => {
    const { api, spaceId, creator, partner, grandma, uncle } = await family();
    await expect(
      grandma.api.family.changeRole({ spaceId, memberId: uncle.member.id, role: "grandparent" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.family.changeRole({ spaceId, memberId: creator.id, role: "relative" }),
    ).rejects.toMatchObject({ message: "MEMBER_PROTECTED" });
    await expect(
      partner.api.family.changeRole({ spaceId, memberId: creator.id, role: "grandparent" }),
    ).rejects.toMatchObject({ message: "MEMBER_PROTECTED" });
    await expect(
      partner.api.family.changeRole({ spaceId, memberId: partner.member.id, role: "grandparent" }),
    ).rejects.toMatchObject({ message: "MEMBER_PROTECTED" });
    await api.memorial.mark({ spaceId, target: { type: "member", memberId: grandma.member.id } });
    await expect(
      api.family.changeRole({ spaceId, memberId: grandma.member.id, role: "relative" }),
    ).rejects.toMatchObject({ message: "MEMORIAL_READ_ONLY" });

    await expect(
      api.family.changeRole({ spaceId, memberId: uncle.member.id, role: "grandparent" }),
    ).resolves.toEqual({ memberId: uncle.member.id, role: "grandparent" });
    // 바뀐 역할은 바로 권한에 반영된다(grandparent는 가족 사진을 올릴 수 있지만 parent 기능은 못 한다)
    await expect(uncle.api.invite.create({ spaceId, role: "grandparent" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("G-11: 역할별 정원을 대기 중 초대까지 포함해 다시 센다", async () => {
    const { api, spaceId, partner, grandma, uncle } = await family();
    // 무료: parent 2 - 이미 꽉 찼다
    await expect(
      api.family.changeRole({ spaceId, memberId: grandma.member.id, role: "parent" }),
    ).rejects.toMatchObject({ message: "MEMBER_ROLE_LIMIT" });
    // 무료: relative 0
    await expect(
      api.family.changeRole({ spaceId, memberId: grandma.member.id, role: "relative" }),
    ).rejects.toMatchObject({ message: "MEMBER_ROLE_LIMIT" });
    // grandparent 4: 멤버 1(할머니) + 삼촌 승격 1 + 대기 초대 2 → 배우자를 grandparent로 바꿀 자리가 없다
    await api.family.changeRole({ spaceId, memberId: uncle.member.id, role: "grandparent" });
    await api.invite.create({ spaceId, role: "grandparent" });
    await api.invite.create({ spaceId, role: "grandparent" });
    await expect(
      api.family.changeRole({ spaceId, memberId: partner.member.id, role: "grandparent" }),
    ).rejects.toMatchObject({ message: "MEMBER_ROLE_LIMIT" });
  });

  it("내보내기: 접근이 바로 끊기고, 그 사람이 낸 초대는 거둬지며 이야기는 스냅샷으로 남는다", async () => {
    const { api, spaceId, creator, partner, grandma } = await family();
    const story = await grandma.api.story.create({ spaceId, body: "어릴 적 이야기" });
    const invite = await partner.api.invite.create({ spaceId, role: "grandparent" });
    await expect(
      partner.api.family.remove({ spaceId, memberId: creator.id }),
    ).rejects.toMatchObject({ message: "MEMBER_PROTECTED" });
    await expect(
      grandma.api.family.remove({ spaceId, memberId: partner.member.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await api.family.remove({ spaceId, memberId: partner.member.id });
    await api.family.remove({ spaceId, memberId: grandma.member.id });
    await expect(partner.api.family.members({ spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const revoked = await prisma.invite.findFirstOrThrow({ where: { code: invite.code } });
    expect(revoked.revokedAt).not.toBeNull();
    const kept = await api.story.get({ spaceId, storyId: story.id });
    expect(kept.narrator).toMatchObject({ memberId: null, name: "김순자", label: "할머니" });
  });

  it("스스로 나가기 - Space를 만든 사람은 나갈 수 없다", async () => {
    const { api, spaceId, uncle } = await family();
    await uncle.api.family.leave({ spaceId });
    expect(await prisma.member.count({ where: { id: uncle.member.id } })).toBe(0);
    await expect(api.family.leave({ spaceId })).rejects.toMatchObject({
      message: "MEMBER_PROTECTED",
    });
  });
});
