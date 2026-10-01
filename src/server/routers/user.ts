import { protectedProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";

export const userRouter = router({
  /** 현재 사용자: 표시 이름과 연결된 로그인 수단(카카오·Google). 이메일은 저장하지 않는다 */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: { id: true, name: true, accounts: { select: { provider: true } } },
    });
    return { id: user.id, name: user.name, providers: user.accounts.map((a) => a.provider) };
  }),
});
