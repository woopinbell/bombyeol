import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hitRateLimit } from "@/server/rate-limit";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const rule = { limit: 3, windowSec: 60 };

describe("hitRateLimit (G-07)", () => {
  it("한도까지 허용하고 그다음부터 거부한다", async () => {
    const now = new Date("2026-10-01T00:00:10Z");
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hitRateLimit(prisma, "k", rule, now));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("창이 바뀌면 다시 허용한다", async () => {
    const t0 = new Date("2026-10-01T00:00:10Z");
    for (let i = 0; i < 4; i++) await hitRateLimit(prisma, "k", rule, t0);
    await expect(hitRateLimit(prisma, "k", rule, new Date("2026-10-01T00:01:01Z"))).resolves.toBe(
      true,
    );
  });

  it("키가 다르면 따로 센다", async () => {
    const now = new Date("2026-10-01T00:00:10Z");
    for (let i = 0; i < 4; i++) await hitRateLimit(prisma, "a", rule, now);
    await expect(hitRateLimit(prisma, "b", rule, now)).resolves.toBe(true);
  });

  it("동시 요청도 정확히 센다", async () => {
    const now = new Date("2026-10-01T00:00:10Z");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => hitRateLimit(prisma, "c", rule, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
