import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { RATE_LIMITS, REACTION_POLICY } from "@/lib/plan";
import { limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { reactionTargetInput, resolveTarget } from "@/server/reactions";
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

/** 반응은 모든 멤버(relative 포함)가 남길 수 있다(PRD §4.2 "가족 멤버만"). 쓰기는 사용자당 리밋(G-07) */
export const reactionRouter = router({
  /** 좋아요 토글: 사용자·대상당 하나. 동시에 눌러도 중복 행이 생기지 않게 직렬화한다 */
  toggleLike: spaceProcedure
    .input(z.object({ target: reactionTargetInput }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const target = await resolveTarget(ctx.prisma, spaceId, input.target);
      const ok = await hitRateLimit(ctx.prisma, `like:${ctx.userId}`, RATE_LIMITS.likePerUser);
      if (!ok) throw limitError("RATE_LIMITED");

      return ctx.prisma.$transaction(async (tx) => {
        const targetId = "momentId" in target ? target.momentId : target.milestoneId;
        await lockKey(tx, `like:${targetId}:${ctx.userId}`);
        const where = { ...target, kind: "like" as const, createdById: ctx.userId };
        const existing = await tx.reaction.findFirst({ where, select: { id: true } });
        if (existing) await tx.reaction.delete({ where: { id: existing.id } });
        else await tx.reaction.create({ data: { ...where, spaceId } });
        const likes = await tx.reaction.count({ where: { ...target, kind: "like" } });
        return { liked: !existing, likes };
      });
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
      return ctx.prisma.reaction.create({
        data: { ...target, spaceId, kind: "comment", body: input.body, createdById: ctx.userId },
        select: commentSelect,
      });
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
