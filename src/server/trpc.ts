import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createPrisma } from "./db";

export async function createContext({ req }: { req: Request }) {
  const ip = req.headers.get("cf-connecting-ip") ?? "local";
  const session = await auth();
  return { prisma: createPrisma(), ip, session };
}

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

// S-2: 로그인한 사용자만 통과
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// 바인딩 방식: Cloudflare 위치(PoP) 단위·10/60초 창. 짧은 폭주 방어용.
const bindingLimited = t.procedure.use(async ({ ctx, path, next }) => {
  const { env } = getCloudflareContext();
  const { success } = await env.RL_SPIKE.limit({ key: `${path}:${ctx.ip}` });
  if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  return next();
});

// DB 방식: 전역 정확 카운트, 임의 창 길이. 장기 한도(발급 횟수·초대 시도 등)용.
function dbLimited(limit: number, windowSec: number) {
  return t.procedure.use(async ({ ctx, path, next }) => {
    const now = Date.now();
    const windowStart = new Date(now - (now % (windowSec * 1000)));
    const key = `${path}:${ctx.ip}`;
    const row = await ctx.prisma.rateCounter.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (row.count > limit) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    return next();
  });
}

export const appRouter = t.router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.prisma.$queryRaw<{ now: Date }[]>`select now()`;
    const s = ctx.session as typeof ctx.session & { provider?: string; userId?: string };
    return { provider: s.provider, userId: s.userId, name: s.user?.name ?? null, hasEmail: Boolean(s.user?.email), dbNow: row.now };
  }),
  limitedBinding: bindingLimited.query(() => ({ ok: true })),
  // 고정 키 진단용: IP 변동과 무관하게 바인딩 동작만 확인
  limitedBindingFixed: t.procedure.query(async () => {
    const { env } = getCloudflareContext();
    const r = await env.RL_SPIKE.limit({ key: "fixed-diagnostic" });
    if (!r.success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    return { ok: true };
  }),
  limitedDb: dbLimited(5, 3600).query(() => ({ ok: true })),
  // 테이블 없이 DB 왕복만 확인(원격 마이그레이션 전에도 동작)
  dbVersion: t.procedure.query(async ({ ctx }) => {
    const [row] = await ctx.prisma.$queryRaw<{ version: string }[]>`select version()`;
    return { ok: true, version: row.version };
  }),
  ping: t.procedure.query(async ({ ctx }) => {
    const [row] = await ctx.prisma.$queryRaw<{ version: string }[]>`select version()`;
    const count = await ctx.prisma.spikePing.count();
    return { ok: true, version: row.version, count };
  }),
  write: t.procedure
    .input(z.object({ note: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.prisma.spikePing.create({ data: { note: input.note } });
      return { id: created.id };
    }),
});

export type AppRouter = typeof appRouter;
