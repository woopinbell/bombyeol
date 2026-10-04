import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PUSH_POLICY, RATE_LIMITS } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { NOTICE_KINDS } from "@/server/push/types";
import { protectedProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

/** FCM 등록 토큰: base64url 계열 문자와 콜론만 */
const tokenInput = z
  .string()
  .min(16)
  .max(PUSH_POLICY.tokenMaxChars)
  .regex(/^[A-Za-z0-9_:-]+$/);

/** 알림 링크 종류(`/open/{종류}/{id}`, src/server/push/events.ts) */
export const OPEN_LINK_TYPES = ["moment", "milestone", "story", "ask", "pregnancy"] as const;

/**
 * 웹푸시 기기 토큰(ARCHITECTURE §7). Space와 무관하게 사용자 단위로 둔다 - * 어느 Space의 알림을 받을지는 발송 시점에 멤버십으로 다시 판단한다.
 */
export const pushRouter = router({
  /**
   * 토큰 등록, 갱신(앱을 열 때마다 불러도 된다). 같은 토큰이 다른 계정에 붙어 있으면
   * 지금 로그인한 계정으로 옮긴다 - 기기를 넘겨받은 사람이 앞 사람의 알림을 받지 않게.
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

  /** 토큰 해제(로그아웃, 알림 끄기). 내 토큰만 지운다 - 없거나 남의 토큰이어도 같은 응답 */
  unregister: protectedProcedure
    .input(z.object({ token: tokenInput }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.userId },
      });
      return { ok: true };
    }),

  /** 이 가족에서 꺼 둔 알림 종류(나만). 비어 있으면 모두 받는다 */
  mutes: spaceProcedure.query(async ({ ctx }) => {
    const member = await ctx.prisma.member.findUniqueOrThrow({
      where: { id: ctx.member.id },
      select: { pushMuted: true },
    });
    return { muted: member.pushMuted };
  }),

  /**
   * 이 가족에서 한 종류의 알림 켜기, 끄기(나만, 기기와 무관 - 계정 단위). 삭제 유예 중에도 된다.
   * 발송은 그 순간의 목록으로 거른다(src/server/push/deliver.ts). 리밋(G-07).
   */
  setMute: spaceProcedure
    .meta({ allowWhileDeleting: true })
    .input(z.object({ notice: z.enum(NOTICE_KINDS), muted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const ok = await hitRateLimit(
        ctx.prisma,
        `push-mute:${ctx.userId}`,
        RATE_LIMITS.pushMutePerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");
      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `push-mute:${ctx.member.id}`);
        const { pushMuted } = await tx.member.findUniqueOrThrow({
          where: { id: ctx.member.id },
          select: { pushMuted: true },
        });
        const next = NOTICE_KINDS.filter((kind) =>
          kind === input.notice ? input.muted : pushMuted.includes(kind),
        );
        await tx.member.update({ where: { id: ctx.member.id }, data: { pushMuted: next } });
        return { muted: next };
      });
    }),

  /**
   * 알림을 눌렀을 때 열 화면. 대상이 지금도 있고 내가 그 Space의 멤버인지 다시 확인한다 -
   * 임신 기록은 지금의 공개 범위로(parent가 아니면 가족 공개만). 아니면 있는지도 드러내지 않고 NOT_FOUND.
   * 기록 하나를 바로 펼치지 않고 그 기록이 있는 화면으로 보낸다.
   */
  openLink: protectedProcedure
    .input(z.object({ type: z.enum(OPEN_LINK_TYPES), id: entityId }))
    .query(async ({ ctx, input }) => {
      const where = {
        id: input.id,
        space: { deletedAt: null, members: { some: { userId: ctx.userId } } },
      };
      const select = { spaceId: true } as const;
      const db = ctx.prisma;
      const found =
        input.type === "moment"
          ? await db.moment.findFirst({ where, select })
          : input.type === "milestone"
            ? await db.milestone.findFirst({ where, select })
            : input.type === "story"
              ? await db.storyEntry.findFirst({ where, select })
              : input.type === "ask"
                ? await db.storyAsk.findFirst({ where, select })
                : null;
      if (found) {
        const tab = input.type === "story" || input.type === "ask" ? "/story" : "";
        return { path: `/s/${found.spaceId}${tab}` };
      }
      if (input.type === "pregnancy") {
        const record = await db.pregnancyRecord.findFirst({
          where,
          select: { spaceId: true, childId: true, visibility: true },
        });
        const member =
          record &&
          (await db.member.findUnique({
            where: { spaceId_userId: { spaceId: record.spaceId, userId: ctx.userId } },
            select: { role: true },
          }));
        if (record && member && (record.visibility === "family" || member.role === "parent")) {
          return { path: `/s/${record.spaceId}/us/pregnancy/${record.childId}` };
        }
      }
      throw new TRPCError({ code: "NOT_FOUND" });
    }),
});
