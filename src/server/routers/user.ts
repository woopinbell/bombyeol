import { z } from "zod";
import { deleteAccount } from "@/server/privacy/delete-account";
import { protectedProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";

export const userRouter = router({
  /** 현재 사용자: 표시 이름과 연결된 로그인 수단(카카오, Google). 이메일은 저장하지 않는다 */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: { id: true, name: true, accounts: { select: { provider: true } } },
    });
    return { id: user.id, name: user.name, providers: user.accounts.map((a) => a.provider) };
  }),

  /**
   * 계정 삭제(즉시, 되돌릴 수 없음 - G-06). 화면에서 내보내기, 확인을 거친 뒤 confirm: true로 부른다.
   * 웹 삭제 페이지(스토어 요건)도 로그인 후 같은 API를 쓴다. 처리 범위는 deleteAccount 참고.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(({ ctx }) => deleteAccount(ctx.prisma, ctx.userId)),
});
