import { z } from "zod";
import { PUSH_POLICY, RATE_LIMITS } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { protectedProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";

/** FCM 등록 토큰: base64url 계열 문자와 콜론만 */
const tokenInput = z
  .string()
  .min(16)
  .max(PUSH_POLICY.tokenMaxChars)
  .regex(/^[A-Za-z0-9_:-]+$/);

/**
 * 웹푸시 기기 토큰(ARCHITECTURE §7). Space와 무관하게 사용자 단위로 둔다 —
 * 어느 Space의 알림을 받을지는 발송 시점에 멤버십으로 다시 판단한다.
 */
export const pushRouter = router({
  /**
   * 토큰 등록·갱신(앱을 열 때마다 불러도 된다). 같은 토큰이 다른 계정에 붙어 있으면
   * 지금 로그인한 계정으로 옮긴다 — 기기를 넘겨받은 사람이 앞 사람의 알림을 받지 않게.
   * 사용자당 토큰 수 상한(G-11)을 넘으면 가장 오래 안 쓴 토큰부터 지운다. 등록 리밋(G-07).
   */
  register: protectedProcedure
    .input(z.object({ token: tokenInput }))
    .mutation(async ({ ctx, input }) => {
      const ok = await hitRateLimit(
        ctx.prisma,
        `push-register:${ctx.userId}`,
        RATE_LIMITS.pushRegisterPerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");

      const now = new Date();
      await ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `push-token:${ctx.userId}`);
        await tx.pushToken.upsert({
          where: { token: input.token },
          create: { userId: ctx.userId, token: input.token, lastSeenAt: now },
          update: { userId: ctx.userId, lastSeenAt: now },
        });
        const extra = await tx.pushToken.findMany({
          where: { userId: ctx.userId },
          orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
          skip: PUSH_POLICY.tokensPerUser,
          select: { id: true },
        });
        if (extra.length > 0) {
          await tx.pushToken.deleteMany({ where: { id: { in: extra.map((t) => t.id) } } });
        }
      });
      return { ok: true };
    }),

  /** 토큰 해제(로그아웃·알림 끄기). 내 토큰만 지운다 — 없거나 남의 토큰이어도 같은 응답 */
  unregister: protectedProcedure
    .input(z.object({ token: tokenInput }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.userId },
      });
      return { ok: true };
    }),
});
