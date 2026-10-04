import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("PushToken 스키마", () => {
  it("같은 토큰은 한 행만 있다", async () => {
    const a = await prisma.user.create({ data: { name: "a" } });
    const b = await prisma.user.create({ data: { name: "b" } });
    await prisma.pushToken.create({ data: { userId: a.id, token: "tok-1" } });
    await expect(
      prisma.pushToken.create({ data: { userId: b.id, token: "tok-1" } }),
    ).rejects.toThrow();
  });

  it("사용자가 지워지면 토큰도 함께 지워진다(G-06 연쇄)", async () => {
    const a = await prisma.user.create({ data: { name: "a" } });
    await prisma.pushToken.create({ data: { userId: a.id, token: "tok-1" } });
    await prisma.user.delete({ where: { id: a.id } });
    expect(await prisma.pushToken.count()).toBe(0);
  });
});

describe("멤버 알림 끄기 스키마", () => {
  it("기본은 모두 받고(빈 목록), 종류별로 끈 것만 남는다", async () => {
    const a = await prisma.user.create({ data: { name: "a" } });
    const space = await prisma.space.create({ data: { name: "s", createdById: a.id } });
    const member = await prisma.member.create({
      data: { spaceId: space.id, userId: a.id, role: "parent" },
    });
    expect(member.pushMuted).toEqual([]);
    const muted = await prisma.member.update({
      where: { id: member.id },
      data: { pushMuted: ["heart", "comment"] },
    });
    expect(muted.pushMuted).toEqual(["heart", "comment"]);
    expect(await prisma.member.count({ where: { NOT: { pushMuted: { has: "heart" } } } })).toBe(0);
  });
});
