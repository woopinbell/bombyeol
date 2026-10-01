import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { notFound } from "@/server/errors";
import { entityId } from "@/server/routers/inputs";

/** 반응 대상. 이야기(story)는 Phase 4에서 추가 */
export const reactionTargetInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("moment"), momentId: entityId }),
  z.object({ type: z.literal("milestone"), milestoneId: entityId }),
]);

export type ReactionTarget = z.infer<typeof reactionTargetInput>;
type TargetColumn = "momentId" | "milestoneId";

/** 대상이 같은 Space에 있는지 확인하고 Reaction의 FK 조건으로 바꾼다 */
export async function resolveTarget(
  prisma: Pick<PrismaClient, "moment" | "milestone">,
  spaceId: string,
  target: ReactionTarget,
): Promise<{ momentId: string } | { milestoneId: string }> {
  if (target.type === "moment") {
    const found = await prisma.moment.findFirst({
      where: { id: target.momentId, spaceId },
      select: { id: true },
    });
    if (!found) throw notFound("ITEM_NOT_FOUND");
    return { momentId: found.id };
  }
  const found = await prisma.milestone.findFirst({
    where: { id: target.milestoneId, spaceId },
    select: { id: true },
  });
  if (!found) throw notFound("ITEM_NOT_FOUND");
  return { milestoneId: found.id };
}

export type ReactionSummary = { likes: number; comments: number; likedByMe: boolean };

/** 목록 화면용: 대상들의 좋아요·댓글 수와 내가 좋아요했는지(쿼리 두 번) */
export async function reactionSummaries(
  prisma: Pick<PrismaClient, "reaction">,
  userId: string,
  column: TargetColumn,
  ids: string[],
): Promise<Map<string, ReactionSummary>> {
  const result = new Map<string, ReactionSummary>(
    ids.map((id) => [id, { likes: 0, comments: 0, likedByMe: false }]),
  );
  if (ids.length === 0) return result;
  const [counts, mine] = await Promise.all([
    prisma.reaction.groupBy({
      by: [column, "kind"],
      where: { [column]: { in: ids } },
      _count: { _all: true },
    }),
    prisma.reaction.findMany({
      where: { [column]: { in: ids }, kind: "like", createdById: userId },
      select: { momentId: true, milestoneId: true },
    }),
  ]);
  for (const row of counts) {
    const summary = result.get(row[column] ?? "");
    if (!summary) continue;
    if (row.kind === "like") summary.likes = row._count._all;
    else summary.comments = row._count._all;
  }
  for (const row of mine) {
    const summary = result.get(row[column] ?? "");
    if (summary) summary.likedByMe = true;
  }
  return result;
}
