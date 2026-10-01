import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNT_LIMITS, INVITE_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const newUser = (name: string) => prisma.user.create({ data: { name } });

async function setup() {
  const parent = await newUser("부모");
  const api = callerFor(prisma, parent.id);
  const { id: spaceId } = await api.space.create({ name: "봄이네" });
  const invite = await api.invite.create({ spaceId, role: "grandparent", relationLabel: "할머니" });
  return { api, spaceId, invite };
}

describe("invite.preview / accept", () => {
  it("코드로 가족을 확인하고 합류하면 초대 역할로 멤버가 된다", async () => {
    const { spaceId, invite } = await setup();
    const grandma = callerFor(prisma, (await newUser("할머니")).id);
    await expect(grandma.invite.preview({ code: invite.code.toLowerCase() })).resolves.toEqual({
      spaceName: "봄이네",
      role: "grandparent",
      relationLabel: "할머니",
    });
    await expect(grandma.invite.accept({ code: invite.code })).resolves.toEqual({ spaceId });
    const space = await grandma.space.get({ spaceId });
    expect(space.members.map((m) => [m.role, m.relationLabel])).toContainEqual([
      "grandparent",
      "할머니",
    ]);
  });

  it("1회용: 쓴 코드는 다시 쓸 수 없다", async () => {
    const { invite } = await setup();
    await callerFor(prisma, (await newUser("a")).id).invite.accept({ code: invite.code });
    await expect(
      callerFor(prisma, (await newUser("b")).id).invite.accept({ code: invite.code }),
    ).rejects.toMatchObject({ message: "INVITE_INVALID" });
  });

  it("동시에 수락해도 한 명만 합류한다", async () => {
    const { spaceId, invite } = await setup();
    const users = await Promise.all(["a", "b", "c"].map(newUser));
    const results = await Promise.allSettled(
      users.map((u) => callerFor(prisma, u.id).invite.accept({ code: invite.code })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.member.count({ where: { spaceId } })).toBe(2);
  });

  it("만료·회수·삭제된 Space의 초대는 거부한다", async () => {
    const { api, spaceId, invite } = await setup();
    const user = callerFor(prisma, (await newUser("x")).id);

    await prisma.invite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await expect(user.invite.accept({ code: invite.code })).rejects.toMatchObject({
      message: "INVITE_INVALID",
    });

    const second = await api.invite.create({ spaceId, role: "grandparent" });
    await api.invite.revoke({ spaceId, inviteId: second.id });
    await expect(user.invite.accept({ code: second.code })).rejects.toMatchObject({
      message: "INVITE_INVALID",
    });

    const third = await api.invite.create({ spaceId, role: "grandparent" });
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } });
    await expect(user.invite.accept({ code: third.code })).rejects.toMatchObject({
      message: "INVITE_INVALID",
    });
  });

  it("이미 멤버면 코드를 소비하지 않고 거부한다", async () => {
    const { invite } = await setup();
    const parentId = (await prisma.member.findFirstOrThrow({ where: { role: "parent" } })).userId;
    await expect(
      callerFor(prisma, parentId).invite.accept({ code: invite.code }),
    ).rejects.toMatchObject({ message: "ALREADY_MEMBER" });
    const row = await prisma.invite.findUniqueOrThrow({ where: { id: invite.id } });
    expect(row.usedAt).toBeNull();
  });

  it("G-11: 수락 시점에 소속 Space 수 상한을 다시 확인한다", async () => {
    const { invite } = await setup();
    const user = await newUser("바쁜 할머니");
    const owner = await newUser("다른 부모");
    for (let i = 0; i < ACCOUNT_LIMITS.membershipsPerUser; i++) {
      await prisma.space.create({
        data: {
          name: `가족 ${i}`,
          createdById: owner.id,
          members: { create: { userId: user.id, role: "grandparent" } },
        },
      });
    }
    await expect(
      callerFor(prisma, user.id).invite.accept({ code: invite.code }),
    ).rejects.toMatchObject({ message: "MEMBERSHIP_LIMIT" });
  });

  it("비로그인은 코드를 확인할 수 없다", async () => {
    const { invite } = await setup();
    await expect(
      callerFor(prisma, null).invite.preview({ code: invite.code }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("초대코드 brute-force 방지 (G-07·G-11)", () => {
  it("사용자당 실패 한도에 이르면 맞는 코드도 막는다", async () => {
    const { invite } = await setup();
    const user = callerFor(prisma, (await newUser("공격자")).id, "198.51.100.1");
    for (let i = 0; i < INVITE_POLICY.failedAttemptsPerUser.limit; i++) {
      await expect(user.invite.accept({ code: "ZZZZZZ" })).rejects.toMatchObject({
        message: "INVITE_INVALID",
      });
    }
    await expect(user.invite.accept({ code: invite.code })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(await prisma.inviteCodeAttempt.count()).toBe(INVITE_POLICY.failedAttemptsPerUser.limit);
  });

  it("형식이 틀린 입력도 실패로 센다", async () => {
    await setup();
    const user = callerFor(prisma, (await newUser("u")).id);
    await expect(user.invite.preview({ code: "!!" })).rejects.toMatchObject({
      message: "INVITE_INVALID",
    });
    expect(await prisma.inviteCodeAttempt.count()).toBe(1);
  });

  it("IP당 한도: 계정을 바꿔도 같은 IP면 막는다", async () => {
    await setup();
    const ip = "198.51.100.7";
    const perUser = INVITE_POLICY.failedAttemptsPerUser.limit;
    const perIp = INVITE_POLICY.failedAttemptsPerIp.limit;
    let tried = 0;
    while (tried < perIp) {
      const api = callerFor(prisma, (await newUser(`봇${tried}`)).id, ip);
      for (let i = 0; i < perUser && tried < perIp; i++, tried++) {
        await api.invite.preview({ code: "ZZZZZZ" }).catch(() => undefined);
      }
    }
    const fresh = callerFor(prisma, (await newUser("새 계정")).id, ip);
    await expect(fresh.invite.preview({ code: "ZZZZZZ" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("창이 지난 실패는 세지 않는다", async () => {
    const { invite } = await setup();
    const userRow = await newUser("u");
    const old = new Date(Date.now() - (INVITE_POLICY.failedAttemptsPerUser.windowSec + 60) * 1000);
    await prisma.inviteCodeAttempt.createMany({
      data: Array.from({ length: 10 }, () => ({ userId: userRow.id, ip: "x", createdAt: old })),
    });
    await expect(
      callerFor(prisma, userRow.id, "203.0.113.9").invite.preview({ code: invite.code }),
    ).resolves.toHaveProperty("spaceName");
  });
});
