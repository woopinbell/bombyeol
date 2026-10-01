import { publicProcedure, router } from "@/server/trpc/init";
import { archiveRouter } from "./archive";
import { calendarRouter } from "./calendar";
import { childRouter } from "./child";
import { consentRouter } from "./consent";
import { familyRouter } from "./family";
import { inviteRouter } from "./invite";
import { mediaRouter } from "./media";
import { memorialRouter } from "./memorial";
import { milestoneRouter } from "./milestone";
import { momentRouter } from "./moment";
import { petRouter } from "./pet";
import { pregnancyRouter } from "./pregnancy";
import { pushRouter } from "./push";
import { reactionRouter } from "./reaction";
import { spaceRouter } from "./space";
import { storyRouter } from "./story";
import { userRouter } from "./user";

export const appRouter = router({
  // 배포 스모크: Worker → Hyperdrive → Postgres 왕복(CLOUD_SESSION §2.1)
  health: publicProcedure.query(async ({ ctx }) => {
    await ctx.prisma.$queryRaw`select 1`;
    return { ok: true };
  }),
  user: userRouter,
  consent: consentRouter,
  space: spaceRouter,
  child: childRouter,
  invite: inviteRouter,
  media: mediaRouter,
  pet: petRouter,
  moment: momentRouter,
  milestone: milestoneRouter,
  reaction: reactionRouter,
  story: storyRouter,
  memorial: memorialRouter,
  pregnancy: pregnancyRouter,
  calendar: calendarRouter,
  family: familyRouter,
  push: pushRouter,
  archive: archiveRouter,
});

export type AppRouter = typeof appRouter;
