import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PUSH_POLICY, RATE_LIMITS } from "@/lib/plan";
import { runCleanup } from "@/server/jobs/cleanup";
import { createTestPrisma, resetDb } from "./helpers/db";
import { exhaustRateLimit } from "./helpers/rate";
import { MemoryStorage } from "./helpers/storage";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const DAY = 24 * 60 * 60 * 1000;
const token = (n: number) => `fcm-token-${String(n).padStart(4, "0")}:APA91b`;

async function user(name = "u") {
  const u = await prisma.user.create({ data: { name } });
  return { id: u.id, caller: callerFor(prisma, u.id) };
}

describe("push.register, unregister", () => {
  it("비로그인은 등록할 수 없다", async () => {
    await expect(callerFor(prisma, null).push.register({ token: token(1) })).rejects.toThrow(
      /UNAUTHORIZED/,
    );
  });

  it("형식이 아닌 토큰은 거부한다", async () => {
    const a = await user();
    await expect(a.caller.push.register({ token: "짧음" })).rejects.toThrow();
    await expect(a.caller.push.register({ token: "has space in it 0123456789" })).rejects.toThrow();
    await expect(
      a.caller.push.register({ token: "x".repeat(PUSH_POLICY.tokenMaxChars + 1) }),
    ).rejects.toThrow();
  });

  it("같은 토큰을 다시 등록하면 한 행을 갱신한다", async () => {
    const a = await user();
    await a.caller.push.register({ token: token(1) });
    const first = await prisma.pushToken.findUniqueOrThrow({ where: { token: token(1) } });
    await a.caller.push.register({ token: token(1) });
    const rows = await prisma.pushToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].lastSeenAt.getTime()).toBeGreaterThanOrEqual(first.lastSeenAt.getTime());
  });

  it("다른 계정이 같은 기기 토큰을 등록하면 그 계정으로 옮긴다", async () => {
    const a = await user("a");
    const b = await user("b");
    await a.caller.push.register({ token: token(1) });
    await b.caller.push.register({ token: token(1) });
    const rows = await prisma.pushToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(b.id);
  });

  it("G-11: 사용자당 상한을 넘으면 가장 오래 안 쓴 토큰부터 지운다", async () => {
    const a = await user();
    const old = Date.now() - 10 * DAY;
    await prisma.pushToken.createMany({
      data: Array.from({ length: PUSH_POLICY.tokensPerUser }, (_, i) => ({
        userId: a.id,
        token: token(i),
        lastSeenAt: new Date(old + i * 1000),
      })),
    });
    await a.caller.push.register({ token: token(999) });
    const left = await prisma.pushToken.findMany({ where: { userId: a.id } });
    expect(left).toHaveLength(PUSH_POLICY.tokensPerUser);
    expect(left.map((t) => t.token)).not.toContain(token(0));
    expect(left.map((t) => t.token)).toContain(token(999));
  });

  it("G-07: 등록 리밋을 넘으면 429", async () => {
    const a = await user();
    await exhaustRateLimit(prisma, `push-register:${a.id}`, RATE_LIMITS.pushRegisterPerUser);
    await expect(a.caller.push.register({ token: token(1) })).rejects.toThrow(/RATE_LIMITED/);
  });

  it("해제는 내 토큰만 지운다", async () => {
    const a = await user("a");
    const b = await user("b");
    await a.caller.push.register({ token: token(1) });
    await expect(b.caller.push.unregister({ token: token(1) })).resolves.toEqual({ ok: true });
    expect(await prisma.pushToken.count()).toBe(1);
    await a.caller.push.unregister({ token: token(1) });
    expect(await prisma.pushToken.count()).toBe(0);
  });

  it("G-17: 오래 갱신되지 않은 토큰은 정리 Cron이 지운다", async () => {
    const a = await user();
    await prisma.pushToken.createMany({
      data: [
        {
          userId: a.id,
          token: token(1),
          lastSeenAt: new Date(Date.now() - (PUSH_POLICY.tokenStaleDays + 1) * DAY),
        },
        { userId: a.id, token: token(2) },
      ],
    });
    const result = await runCleanup(prisma, new MemoryStorage());
    expect(result.pushTokensDeleted).toBe(1);
    expect((await prisma.pushToken.findMany()).map((t) => t.token)).toEqual([token(2)]);
  });
});
