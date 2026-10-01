import { afterAll, describe, expect, it } from "vitest";
import { createTestPrisma } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
afterAll(() => prisma.$disconnect());

describe("health", () => {
  it("비로그인으로 DB 왕복 결과를 돌려준다", async () => {
    await expect(callerFor(prisma, null).health()).resolves.toEqual({ ok: true });
  });
});
