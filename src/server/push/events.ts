import type { PrismaClient } from "@/generated/prisma/client";
import { PUSH_POLICY } from "@/lib/plan";
import { hitRateLimit } from "@/server/rate-limit";
import type { ReactionTarget } from "@/server/reactions";
import { deliverPush, type DeliverRequest } from "./deliver";
import type { PushDeps, PushDispatcher } from "./dispatch";
import type { PushSender } from "./types";

/**
 * 알림을 일으키는 일(PRD §4.6). 저장이 끝난 뒤 id만 넘기고, 수신자·문구는 발송 시점에 DB에서 다시 정한다.
 * 마일스톤은 알리지 않는다(잦은 수치 기록의 소음, COMMIT_PLAN Phase 6 메모 ②).
 */
export type PushEvent = { spaceId: string; actorId: string } & (
  | { type: "moment"; momentId: string }
  | { type: "story"; storyId: string }
  | { type: "ask"; askId: string }
  | { type: "reaction"; kind: "like" | "star" | "comment"; target: ReactionTarget }
  | { type: "pregnancy"; recordId: string }
);

type Plan = Omit<DeliverRequest, "spaceId" | "actorId">;

/** 응답 뒤에 알림을 보낸다. 실패해도 요청 결과에는 영향이 없다 */
export function notify(push: PushDispatcher, event: PushEvent) {
  push.defer((deps) => handlePushEvent(deps, event));
}

export async function handlePushEvent(
  { prisma, sender, origin }: PushDeps & { sender: PushSender },
  event: PushEvent,
) {
  const plan = await planEvent(prisma, event);
  if (!plan) return null;
  return deliverPush(prisma, sender, origin, {
    ...plan,
    spaceId: event.spaceId,
    actorId: event.actorId,
  });
}

async function spaceUserIds(prisma: PrismaClient, spaceId: string) {
  const members = await prisma.member.findMany({ where: { spaceId }, select: { userId: true } });
  return members.map((m) => m.userId);
}

async function planEvent(prisma: PrismaClient, event: PushEvent): Promise<Plan | null> {
  const { spaceId } = event;
  switch (event.type) {
    case "moment": {
      const moment = await prisma.moment.findFirst({
        where: { id: event.momentId, spaceId },
        select: { id: true },
      });
      if (!moment) return null;
      return {
        userIds: await spaceUserIds(prisma, spaceId),
        notice: "moment",
        path: `/open/moment/${moment.id}`,
        data: { type: "moment", id: moment.id },
      };
    }
    case "story": {
      const story = await prisma.storyEntry.findFirst({
        where: { id: event.storyId, spaceId },
        select: { id: true },
      });
      if (!story) return null;
      return {
        userIds: await spaceUserIds(prisma, spaceId),
        notice: "story",
        path: `/open/story/${story.id}`,
        data: { type: "story", id: story.id },
      };
    }
    case "ask": {
      // 아직 답을 기다리는 물어보기만, 질문받은 어르신께만
      const ask = await prisma.storyAsk.findFirst({
        where: { id: event.askId, spaceId, entryId: null },
        select: { id: true, toMember: { select: { userId: true } } },
      });
      if (!ask) return null;
      return {
        userIds: [ask.toMember.userId],
        notice: "ask",
        path: `/open/ask/${ask.id}`,
        data: { type: "ask", id: ask.id },
      };
    }
    case "reaction":
      return planReaction(prisma, event);
    case "pregnancy": {
      // PRIVACY §3: 수신자는 발송 시점의 visibility로 정한다(그 사이 좁혔으면 좁힌 대로)
      const record = await prisma.pregnancyRecord.findFirst({
        where: { id: event.recordId, spaceId },
        select: { id: true, visibility: true },
      });
      if (!record) return null;
      return {
        userIds: await spaceUserIds(prisma, spaceId),
        roles: record.visibility === "parents_only" ? ["parent"] : undefined,
        notice: "news",
        path: `/open/pregnancy/${record.id}`,
        data: { type: "pregnancy", id: record.id },
      };
    }
  }
}

/**
 * 반응 알림은 대상 기록을 쓴 사람에게(이야기는 화자 + 대필자). 같은 대상의 같은 갈래(마음·댓글)는
 * 쿨다운 안에 한 번만 — 받을 사람이 없을 때(자기 기록에 반응)는 쿨다운을 쓰지 않는다.
 */
async function planReaction(
  prisma: PrismaClient,
  event: PushEvent & { type: "reaction" },
): Promise<Plan | null> {
  const { spaceId, target } = event;
  let found: { id: string; owners: (string | null | undefined)[] } | null = null;
  if (target.type === "moment") {
    const row = await prisma.moment.findFirst({
      where: { id: target.momentId, spaceId },
      select: { id: true, createdById: true },
    });
    found = row && { id: row.id, owners: [row.createdById] };
  } else if (target.type === "milestone") {
    const row = await prisma.milestone.findFirst({
      where: { id: target.milestoneId, spaceId },
      select: { id: true, createdById: true },
    });
    found = row && { id: row.id, owners: [row.createdById] };
  } else {
    const row = await prisma.storyEntry.findFirst({
      where: { id: target.storyEntryId, spaceId },
      select: { id: true, createdById: true, narrator: { select: { userId: true } } },
    });
    found = row && { id: row.id, owners: [row.narrator?.userId, row.createdById] };
  }
  if (!found) return null;
  const userIds = found.owners.filter((id): id is string => !!id && id !== event.actorId);
  if (userIds.length === 0) return null;

  const comment = event.kind === "comment";
  const fresh = await hitRateLimit(prisma, `push-${comment ? "comment" : "heart"}:${found.id}`, {
    limit: 1,
    windowSec: comment ? PUSH_POLICY.commentCooldownSec : PUSH_POLICY.heartCooldownSec,
  });
  if (!fresh) return null;
  return {
    userIds,
    notice: comment ? "comment" : "heart",
    path: `/open/${target.type}/${found.id}`,
    data: { type: target.type, id: found.id },
  };
}
