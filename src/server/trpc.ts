import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { createPrisma } from "./db";

export function createContext() {
  return { prisma: createPrisma() };
}

const t = initTRPC.context<ReturnType<typeof createContext>>().create();

export const appRouter = t.router({
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
