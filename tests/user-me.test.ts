import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateUser } from "@/server/auth/users";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("user.me", () => {
  it("이름과 로그인 수단을 돌려준다(이름이 없으면 null)", async () => {
    const user = await findOrCreateUser(prisma, { provider: "kakao", providerAccountId: "1" });
    await expect(callerFor(prisma, user.id).user.me()).resolves.toEqual({
      id: user.id,
      name: null,
      providers: ["kakao"],
    });
  });

  it("비로그인은 UNAUTHORIZED", async () => {
    await expect(callerFor(prisma, null).user.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
