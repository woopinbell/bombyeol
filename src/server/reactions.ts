import { z } from "zod";
import type { PrismaClient, ReactionKind } from "@/generated/prisma/client";
import { notFound } from "@/server/errors";
import { entityId } from "@/server/routers/inputs";

const momentTarget = z.object({ type: z.literal("moment"), momentId: entityId });
const milestoneTarget = z.object({ type: z.literal("milestone"), milestoneId: entityId });
export const storyTarget = z.object({ type: z.literal("story"), storyEntryId: entityId });

/** 반응 대상: 오늘 기록(Moment·Milestone)과 이야기(StoryEntry) */
export const reactionTargetInput = z.discriminatedUnion("type", [
  momentTarget,
  milestoneTarget,
  storyTarget,
]);

/** 좋아요는 오늘 기록에, 별 하나는 이야기에 남긴다(세대 교차 신호, PRD §2) */
export const likeTargetInput = z.discriminatedUnion("type", [momentTarget, milestoneTarget]);

export type ReactionTarget = z.infer<typeof reactionTargetInput>;
type TargetColumn = "momentId" | "milestoneId" | "storyEntryId";
type TargetWhere = { momentId: string } | { milestoneId: string } | { storyEntryId: string };

/** 대상이 같은 Space에 있는지 확인하고 Reaction의 FK 조건으로 바꾼다 */
export async function resolveTarget(
  prisma: Pick<PrismaClient, "moment" | "milestone" | "storyEntry">,
  spaceId: string,
  target: ReactionTarget,
): Promise<TargetWhere> {
  if (target.type === "moment") {
    const found = await prisma.moment.findFirst({
      where: { id: target.momentId, spaceId },
      select: { id: true },
    });
    if (!found) throw notFound("ITEM_NOT_FOUND");
    return { momentId: found.id };
  }
  if (target.type === "milestone") {
    const found = await prisma.milestone.findFirst({
      where: { id: target.milestoneId, spaceId },
      select: { id: true },
    });
    if (!found) throw notFound("ITEM_NOT_FOUND");
    return { milestoneId: found.id };
  }
  const found = await prisma.storyEntry.findFirst({
    where: { id: target.storyEntryId, spaceId },
    select: { id: true },
  });
  if (!found) throw notFound("ITEM_NOT_FOUND");
  return { storyEntryId: found.id };
}

/** 대상 조건의 FK 값(잠금 키 등에 쓴다) */
export function targetIdOf(target: TargetWhere) {
  if ("momentId" in target) return target.momentId;
  if ("milestoneId" in target) return target.milestoneId;
  return target.storyEntryId;
}

type Counts = { toggles: number; comments: number; mine: boolean };

/** 대상들의 토글 반응(좋아요·별 하나)·댓글 수와 내가 눌렀는지(쿼리 두 번) */
async function countReactions(
  prisma: Pick<PrismaClient, "reaction">,
  userId: string,
  column: TargetColumn,
  ids: string[],
  toggle: Exclude<ReactionKind, "comment">,
): Promise<Map<string, Counts>> {
  const result = new Map<string, Counts>(
    ids.map((id) => [id, { toggles: 0, comments: 0, mine: false }]),
  );
  if (ids.length === 0) return result;
  const [counts, mine] = await Promise.all([
    prisma.reaction.groupBy({
      by: [column, "kind"],
      where: { [column]: { in: ids } },
      _count: { _all: true },
    }),
    prisma.reaction.findMany({
      where: { [column]: { in: ids }, kind: toggle, createdById: userId },
      select: { momentId: true, milestoneId: true, storyEntryId: true },
    }),
  ]);
  for (const row of counts) {
    const summary = result.get(row[column] ?? "");
    if (!summary) continue;
    if (row.kind === toggle) summary.toggles = row._count._all;
    else if (row.kind === "comment") summary.comments = row._count._all;
  }
  for (const row of mine) {
    const summary = result.get(row[column] ?? "");
    if (summary) summary.mine = true;
  }
  return result;
}

export type ReactionSummary = { likes: number; comments: number; likedByMe: boolean };

/** 오늘 기록 목록용: 좋아요·댓글 수와 내가 좋아요했는지 */
export async function reactionSummaries(
  prisma: Pick<PrismaClient, "reaction">,
  userId: string,
  column: "momentId" | "milestoneId",
  ids: string[],
): Promise<Map<string, ReactionSummary>> {
  const counts = await countReactions(prisma, userId, column, ids, "like");
  return new Map(
    [...counts].map(([id, c]) => [
      id,
      { likes: c.toggles, comments: c.comments, likedByMe: c.mine },
    ]),
  );
}

export type StoryReactionSummary = { stars: number; comments: number; starredByMe: boolean };

/** 이야기 목록용: 별 하나·댓글 수와 내가 별을 보냈는지 */
export async function storyReactionSummaries(
  prisma: Pick<PrismaClient, "reaction">,
  userId: string,
  ids: string[],
): Promise<Map<string, StoryReactionSummary>> {
  const counts = await countReactions(prisma, userId, "storyEntryId", ids, "star");
  return new Map(
    [...counts].map(([id, c]) => [
      id,
      { stars: c.toggles, comments: c.comments, starredByMe: c.mine },
    ]),
  );
}
