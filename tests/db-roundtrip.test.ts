import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

// 통합 테스트 기반: 로컬 Postgres(docker compose)와 Prisma 왕복.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("로컬 DB 왕복", () => {
  it("Supabase와 같은 Postgres 메이저(17)에 연결된다", async () => {
    const rows = await prisma.$queryRaw<
      { v: string }[]
    >`select current_setting('server_version') as v`;
    expect(rows[0]?.v.split(".")[0]).toBe("17");
  });
});
