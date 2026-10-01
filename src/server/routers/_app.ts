import { publicProcedure, router } from "@/server/trpc/init";
import { childRouter } from "./child";
import { inviteRouter } from "./invite";
import { spaceRouter } from "./space";

export const appRouter = router({
  // 배포 스모크: Worker → Hyperdrive → Postgres 왕복(CLOUD_SESSION §2.1)
  health: publicProcedure.query(async ({ ctx }) => {
    await ctx.prisma.$queryRaw`select 1`;
    return { ok: true };
  }),
  space: spaceRouter,
  child: childRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
