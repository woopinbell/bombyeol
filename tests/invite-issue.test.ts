import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { INVITE_POLICY, RATE_LIMITS, TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function setup() {
  const parent = await prisma.user.create({ data: { name: "부모" } });
  const grandma = await prisma.user.create({ data: { name: "할머니" } });
  const api = callerFor(prisma, parent.id);
  const { id: spaceId } = await api.space.create({ name: "가족" });
  await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent" } });
  return { api, grandmaApi: callerFor(prisma, grandma.id), spaceId };
}

describe("invite.create", () => {
  it("TTL이 붙은 초대를 발급하고 목록에 보인다", async () => {
    const { api, spaceId } = await setup();
    const before = Date.now();
    const invite = await api.invite.create({
      spaceId,
      role: "grandparent",
      relationLabel: "외할머니",
    });
    const ttl = invite.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan((INVITE_POLICY.ttlHours - 0.1) * 3600_000);
    expect(ttl).toBeLessThanOrEqual(INVITE_POLICY.ttlHours * 3600_000 + 5000);
    expect(await api.invite.list({ spaceId })).toEqual([invite]);
  });

  it("parent만 발급할 수 있다", async () => {
    const { grandmaApi, spaceId } = await setup();
    await expect(grandmaApi.invite.create({ spaceId, role: "grandparent" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("G-11: 역할 정원 = 멤버 + 대기 중 초대", async () => {
    const { api, spaceId } = await setup();
    // 조부모 정원에서 이미 1명(할머니)이 멤버
    const room = TIER_LIMITS.free.membersByRole.grandparent - 1;
    for (let i = 0; i < room; i++) await api.invite.create({ spaceId, role: "grandparent" });
    await expect(api.invite.create({ spaceId, role: "grandparent" })).rejects.toMatchObject({
      message: "MEMBER_ROLE_LIMIT",
    });
  });

  it("G-11: 무료 요금제는 relative 초대를 발급하지 않는다(초안 정책)", async () => {
    const { api, spaceId } = await setup();
    expect(TIER_LIMITS.free.membersByRole.relative).toBe(0);
    await expect(api.invite.create({ spaceId, role: "relative" })).rejects.toMatchObject({
      message: "MEMBER_ROLE_LIMIT",
    });
  });

  it("회수, 만료된 초대는 정원과 활성 수에서 빠진다", async () => {
    const { api, spaceId } = await setup();
    const a = await api.invite.create({ spaceId, role: "parent" });
    await expect(api.invite.create({ spaceId, role: "parent" })).rejects.toMatchObject({
      message: "MEMBER_ROLE_LIMIT",
    });
    await api.invite.revoke({ spaceId, inviteId: a.id });
    const b = await api.invite.create({ spaceId, role: "parent" });
    await prisma.invite.update({
      where: { id: b.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await expect(api.invite.create({ spaceId, role: "parent" })).resolves.toHaveProperty("code");
    expect(await api.invite.list({ spaceId })).toHaveLength(1);
  });

  it("G-11: Space당 활성 초대 수 상한", async () => {
    const { api, spaceId } = await setup();
    // 정원 검사와 분리하려고 활성 초대를 직접 채운다
    const parentId = (await prisma.member.findFirstOrThrow({ where: { spaceId, role: "parent" } }))
      .userId;
    await prisma.invite.createMany({
      data: Array.from({ length: INVITE_POLICY.activePerSpace }, (_, i) => ({
        spaceId,
        code: `TEST${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
        role: "grandparent" as const,
        expiresAt: new Date(Date.now() + 3600_000),
        createdById: parentId,
      })),
    });
    await expect(api.invite.create({ spaceId, role: "parent" })).rejects.toMatchObject({
      message: "INVITE_ACTIVE_LIMIT",
    });
  });

  it("G-07: 사용자당 발급 횟수 제한", async () => {
    const { api, spaceId } = await setup();
    const { limit } = RATE_LIMITS.inviteIssuePerUser;
    for (let i = 0; i < limit; i++) {
      const invite = await api.invite.create({ spaceId, role: "parent" });
      await api.invite.revoke({ spaceId, inviteId: invite.id });
    }
    await expect(api.invite.create({ spaceId, role: "parent" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("다른 Space의 초대는 회수할 수 없다", async () => {
    const { api, spaceId } = await setup();
    const invite = await api.invite.create({ spaceId, role: "parent" });
    const other = await prisma.user.create({ data: { name: "남" } });
    const otherApi = callerFor(prisma, other.id);
    const { id: otherSpace } = await otherApi.space.create({ name: "남의 가족" });
    await expect(
      otherApi.invite.revoke({ spaceId: otherSpace, inviteId: invite.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
