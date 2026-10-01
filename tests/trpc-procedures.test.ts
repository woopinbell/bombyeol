import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCallerFactory, router } from "@/server/trpc/init";
import { parentProcedure, protectedProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const testRouter = router({
  whoami: protectedProcedure.query(({ ctx }) => ctx.userId),
  memberRole: spaceProcedure.query(({ ctx }) => ctx.member.role),
  parentOnly: parentProcedure.mutation(() => "ok"),
});
const createCaller = createCallerFactory(testRouter);
const as = (userId: string | null) => createCaller({ prisma, userId, ip: "203.0.113.1" });

async function seed() {
  const [parent, grandma, stranger] = await Promise.all(
    ["부모", "할머니", "타인"].map((name) => prisma.user.create({ data: { name } })),
  );
  const space = await prisma.space.create({
    data: {
      name: "우리 가족",
      createdById: parent.id,
      members: {
        create: [
          { userId: parent.id, role: "parent" },
          { userId: grandma.id, role: "grandparent" },
        ],
      },
    },
  });
  return { parent, grandma, stranger, space };
}

describe("tRPC 접근 통제", () => {
  it("비로그인은 UNAUTHORIZED", async () => {
    await expect(as(null).whoami()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("멤버는 자기 역할로 통과한다", async () => {
    const { grandma, space } = await seed();
    await expect(as(grandma.id).memberRole({ spaceId: space.id })).resolves.toBe("grandparent");
  });

  it("멤버가 아니면 Space 존재를 드러내지 않고 NOT_FOUND", async () => {
    const { stranger, space } = await seed();
    await expect(as(stranger.id).memberRole({ spaceId: space.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("삭제된 Space는 멤버여도 NOT_FOUND", async () => {
    const { parent, space } = await seed();
    await prisma.space.update({ where: { id: space.id }, data: { deletedAt: new Date() } });
    await expect(as(parent.id).memberRole({ spaceId: space.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("parent 전용 동작은 다른 역할이면 FORBIDDEN", async () => {
    const { parent, grandma, space } = await seed();
    await expect(as(parent.id).parentOnly({ spaceId: space.id })).resolves.toBe("ok");
    await expect(as(grandma.id).parentOnly({ spaceId: space.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
