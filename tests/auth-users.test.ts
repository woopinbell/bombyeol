import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateUser } from "@/server/auth/users";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("findOrCreateUser", () => {
  it("처음 로그인하면 User와 Account를 만들고, 다시 로그인하면 같은 User를 돌려준다", async () => {
    const identity = { provider: "kakao", providerAccountId: "1001", name: "할머니" };
    const first = await findOrCreateUser(prisma, identity);
    const second = await findOrCreateUser(prisma, identity);
    expect(second.id).toBe(first.id);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.account.count()).toBe(1);
  });

  it("공급자가 다르면 같은 ID 문자열이어도 다른 사용자다", async () => {
    const a = await findOrCreateUser(prisma, { provider: "kakao", providerAccountId: "42" });
    const b = await findOrCreateUser(prisma, { provider: "google", providerAccountId: "42" });
    expect(a.id).not.toBe(b.id);
  });

  it("동시 첫 로그인에도 사용자를 하나만 만든다", async () => {
    const identity = { provider: "kakao", providerAccountId: "7" };
    const results = await Promise.all([
      findOrCreateUser(prisma, identity),
      findOrCreateUser(prisma, identity),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await prisma.user.count()).toBe(1);
  });

  it("이름은 50자로 자르고, 비어 있으면 null로 저장한다", async () => {
    const long = await findOrCreateUser(prisma, {
      provider: "kakao",
      providerAccountId: "1",
      name: "가".repeat(80),
    });
    const blank = await findOrCreateUser(prisma, {
      provider: "kakao",
      providerAccountId: "2",
      name: "  ",
    });
    const rows = await prisma.user.findMany({ where: { id: { in: [long.id, blank.id] } } });
    expect(rows.find((u) => u.id === long.id)?.name).toHaveLength(50);
    expect(rows.find((u) => u.id === blank.id)?.name).toBeNull();
  });

  it("이름 없이 가입한 사용자는 다음 로그인 때 이름을 채우고, 있는 이름은 덮어쓰지 않는다", async () => {
    const id = { provider: "kakao", providerAccountId: "9" };
    const user = await findOrCreateUser(prisma, id);
    await findOrCreateUser(prisma, { ...id, name: "봄별할머니" });
    await findOrCreateUser(prisma, { ...id, name: "바뀐닉네임" });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.name).toBe("봄별할머니");
  });
});
