import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNT_LIMITS, TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const newUser = (name = "부모") => prisma.user.create({ data: { name } });

describe("space.create", () => {
  it("생성자는 parent 멤버가 되고 첫 아이를 함께 등록한다", async () => {
    const user = await newUser();
    const api = callerFor(prisma, user.id);
    const { id } = await api.space.create({
      name: "우리 가족",
      relationLabel: "엄마",
      child: { nickname: "콩이", dueDate: "2027-03-01" },
    });
    const space = await api.space.get({ spaceId: id });
    expect(space.members).toEqual([
      expect.objectContaining({ role: "parent", relationLabel: "엄마" }),
    ]);
    expect(space.children).toEqual([
      expect.objectContaining({ nickname: "콩이", status: "expecting" }),
    ]);
    expect(await api.space.list()).toEqual([{ role: "parent", space: { id, name: "우리 가족" } }]);
  });

  it("비로그인은 만들 수 없다", async () => {
    await expect(callerFor(prisma, null).space.create({ name: "x" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("G-11: 사용자당 생성 상한을 넘으면 거부한다", async () => {
    const user = await newUser();
    const api = callerFor(prisma, user.id);
    for (let i = 0; i < ACCOUNT_LIMITS.spacesCreatedPerUser; i++) {
      await api.space.create({ name: `가족 ${i}` });
    }
    await expect(api.space.create({ name: "하나 더" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "SPACE_CREATE_LIMIT",
    });
  });

  it("G-11: 동시에 만들어도 상한을 넘지 않는다", async () => {
    const user = await newUser();
    const api = callerFor(prisma, user.id);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => api.space.create({ name: `가족 ${i}` })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(
      ACCOUNT_LIMITS.spacesCreatedPerUser,
    );
    expect(await prisma.space.count()).toBe(ACCOUNT_LIMITS.spacesCreatedPerUser);
  });

  it("G-11: 쿨다운 안에 삭제한 Space도 상한에 포함하고, 쿨다운이 지나면 제외한다", async () => {
    const user = await newUser();
    const api = callerFor(prisma, user.id);
    const ids = [];
    for (let i = 0; i < ACCOUNT_LIMITS.spacesCreatedPerUser; i++) {
      ids.push((await api.space.create({ name: `가족 ${i}` })).id);
    }
    await prisma.space.update({ where: { id: ids[0] }, data: { deletedAt: new Date() } });
    await expect(api.space.create({ name: "다시" })).rejects.toMatchObject({
      message: "SPACE_CREATE_LIMIT",
    });

    const longAgo = new Date(
      Date.now() - (ACCOUNT_LIMITS.deletedSpaceCooldownDays + 1) * 24 * 60 * 60 * 1000,
    );
    await prisma.space.update({ where: { id: ids[0] }, data: { deletedAt: longAgo } });
    await expect(api.space.create({ name: "다시" })).resolves.toHaveProperty("id");
  });

  it("G-11: 소속 Space 수 상한을 넘으면 새로 만들 수 없다", async () => {
    const user = await newUser();
    const owner = await newUser("다른 부모");
    for (let i = 0; i < ACCOUNT_LIMITS.membershipsPerUser; i++) {
      await prisma.space.create({
        data: {
          name: `초대받은 가족 ${i}`,
          createdById: owner.id,
          members: { create: { userId: user.id, role: "grandparent" } },
        },
      });
    }
    await expect(
      callerFor(prisma, user.id).space.create({ name: "내 가족" }),
    ).rejects.toMatchObject({ message: "MEMBERSHIP_LIMIT" });
  });

  it("입력 검증: 이름, 날짜 규칙", async () => {
    const api = callerFor(prisma, (await newUser()).id);
    await expect(api.space.create({ name: "  " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.space.create({ name: "가족", child: { dueDate: "2027-01-01" } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.space.create({
        name: "가족",
        child: { name: "봄", dueDate: "2027-01-01", birthDate: "2026-01-01" },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("child.create", () => {
  async function setup() {
    const parent = await newUser();
    const grandma = await newUser("할머니");
    const { id: spaceId } = await callerFor(prisma, parent.id).space.create({ name: "가족" });
    await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent" } });
    return { parent, grandma, spaceId };
  }

  it("parent가 아이를 등록하고, 생일이 있으면 born", async () => {
    const { parent, spaceId } = await setup();
    const child = await callerFor(prisma, parent.id).child.create({
      spaceId,
      child: { name: "봄이", birthDate: "2025-04-01" },
    });
    expect(child.status).toBe("born");
  });

  it("parent가 아니면 FORBIDDEN", async () => {
    const { grandma, spaceId } = await setup();
    await expect(
      callerFor(prisma, grandma.id).child.create({
        spaceId,
        child: { name: "봄이", birthDate: "2025-04-01" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("G-11: Space당 아이 수 상한(동시 요청 포함)", async () => {
    const { parent, spaceId } = await setup();
    const api = callerFor(prisma, parent.id);
    const limit = TIER_LIMITS.free.children;
    const results = await Promise.allSettled(
      Array.from({ length: limit + 2 }, (_, i) =>
        api.child.create({ spaceId, child: { nickname: `아이${i}`, dueDate: "2027-01-01" } }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(limit);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason.message).toBe("CHILD_LIMIT");
  });
});
