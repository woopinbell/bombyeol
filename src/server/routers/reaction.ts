import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { RATE_LIMITS, REACTION_POLICY } from "@/lib/plan";
import { limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import type { PushDispatcher } from "@/server/push/dispatch";
import { notify } from "@/server/push/events";
import { hitRateLimit } from "@/server/rate-limit";
import type { PrismaClient } from "@/generated/prisma/client";
import type { RateLimitRule } from "@/server/rate-limit";
import {
  likeTargetInput,
  reactionTargetInput,
  resolveTarget,
  storyTarget,
  targetIdOf,
  type ReactionTarget,
} from "@/server/reactions";
import { spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

const commentBody = z.string().trim().min(1).max(REACTION_POLICY.commentMaxChars);

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;

/**
 * 토글 반응(좋아요, 별 하나): 사용자, 대상, 종류당 하나. 동시에 눌러도 중복 행이 생기지 않게 직렬화한다.
 * 돌려주는 값: 지금 켜졌는지와 대상의 같은 종류 반응 수.
 */
async function toggleReaction(
  ctx: {
    prisma: PrismaClient;
    push: PushDispatcher;
    userId: string;
    member: { spaceId: string };
  },
  input: ReactionTarget,
  kind: "like" | "star",
  rule: RateLimitRule,
) {
  const spaceId = ctx.member.spaceId;
  const target = await resolveTarget(ctx.prisma, spaceId, input);
  const ok = await hitRateLimit(ctx.prisma, `${kind}:${ctx.userId}`, rule);
  if (!ok) throw limitError("RATE_LIMITED");

  const result = await ctx.prisma.$transaction(async (tx) => {
    await lockKey(tx, `${kind}:${targetIdOf(target)}:${ctx.userId}`);
    const where = { ...target, kind, createdById: ctx.userId };
    const existing = await tx.reaction.findFirst({ where, select: { id: true } });
    if (existing) await tx.reaction.delete({ where: { id: existing.id } });
    else await tx.reaction.create({ data: { ...where, spaceId } });
    const count = await tx.reaction.count({ where: { ...target, kind } });
    return { on: !existing, count };
  });
  // 켤 때만 알린다(끄기, 다시 켜기 반복은 대상별 쿨다운이 막는다)
  if (result.on) {
    notify(ctx.push, { type: "reaction", spaceId, actorId: ctx.userId, kind, target: input });
  }
  return result;
}

/** 반응은 모든 멤버(relative 포함)가 남길 수 있다(PRD §4.2 "가족 멤버만"). 쓰기는 사용자당 리밋(G-07) */
export const reactionRouter = router({
  /** 좋아요 토글(오늘 기록: Moment, Milestone) */
  toggleLike: spaceProcedure
    .input(z.object({ target: likeTargetInput }))
    .mutation(async ({ ctx, input }) => {
      const { on, count } = await toggleReaction(
        ctx,
        input.target,
        "like",
        RATE_LIMITS.likePerUser,
      );
      return { liked: on, likes: count };
    }),

  /** 별 하나 토글(이야기): 손주, 자녀가 어르신의 이야기에 보내는 1비트 신호(PRD §2, §4.3) */
  toggleStar: spaceProcedure
    .input(z.object({ target: storyTarget }))
    .mutation(async ({ ctx, input }) => {
      const { on, count } = await toggleReaction(
        ctx,
        input.target,
        "star",
        RATE_LIMITS.starPerUser,
      );
      return { starred: on, stars: count };
    }),

  /** 댓글 작성 */
  addComment: spaceProcedure
    .input(z.object({ target: reactionTargetInput, body: commentBody }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const target = await resolveTarget(ctx.prisma, spaceId, input.target);
      const ok = await hitRateLimit(
        ctx.prisma,
        `comment:${ctx.userId}`,
        RATE_LIMITS.commentPerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");
      const comment = await ctx.prisma.reaction.create({
        data: { ...target, spaceId, kind: "comment", body: input.body, createdById: ctx.userId },
        select: commentSelect,
      });
      notify(ctx.push, {
        type: "reaction",
        spaceId,
        actorId: ctx.userId,
        kind: "comment",
        target: input.target,
      });
      return comment;
    }),

  /** 댓글 목록: 오래된 것부터, 커서는 (createdAt, id) */
  listComments: spaceProcedure
    .input(
      z.object({
        target: reactionTargetInput,
        cursor: z.object({ createdAt: z.date(), id: entityId }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const target = await resolveTarget(ctx.prisma, ctx.member.spaceId, input.target);
      const rows = await ctx.prisma.reaction.findMany({
        where: {
          ...target,
          kind: "comment",
          ...(input.cursor && {
            OR: [
              { createdAt: { gt: input.cursor.createdAt } },
              { createdAt: input.cursor.createdAt, id: { gt: input.cursor.id } },
            ],
          }),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: REACTION_POLICY.pageSize + 1,
        select: commentSelect,
      });
      const items = rows.slice(0, REACTION_POLICY.pageSize);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          rows.length > REACTION_POLICY.pageSize && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    }),

  /** 댓글 삭제: 작성자 또는 parent */
  deleteComment: spaceProcedure
    .input(z.object({ commentId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.reaction.findFirst({
        where: { id: input.commentId, spaceId: ctx.member.spaceId, kind: "comment" },
        select: { id: true, createdById: true },
      });
      if (!comment) throw notFound("ITEM_NOT_FOUND");
      if (comment.createdById !== ctx.userId && ctx.member.role !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.prisma.reaction.deleteMany({ where: { id: comment.id } });
      return { ok: true };
    }),
});
