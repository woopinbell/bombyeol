"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { whoSubject, type FeedCursor, type Who } from "@/lib/today-feed";
import { serverCaller } from "@/server/trpc/server-caller";

type Failed = { error: ErrorKey };

/** 오늘 피드 다음 페이지(권한, 대상 확인은 tRPC 프로시저가 한다) */
export async function loadMoreMoments(spaceId: string, who: Who, cursor: FeedCursor) {
  try {
    const caller = await serverCaller();
    return await caller.moment.list({ spaceId, subject: whoSubject(who), cursor });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function toggleLike(
  spaceId: string,
  target: { type: "moment"; momentId: string } | { type: "milestone"; milestoneId: string },
) {
  try {
    const caller = await serverCaller();
    return await caller.reaction.toggleLike({ spaceId, target });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function listComments(spaceId: string, momentId: string) {
  try {
    const caller = await serverCaller();
    return await caller.reaction.listComments({ spaceId, target: { type: "moment", momentId } });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function addComment(spaceId: string, momentId: string, body: string) {
  try {
    const caller = await serverCaller();
    return await caller.reaction.addComment({
      spaceId,
      target: { type: "moment", momentId },
      body,
    });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function deleteComment(spaceId: string, commentId: string) {
  try {
    const caller = await serverCaller();
    return await caller.reaction.deleteComment({ spaceId, commentId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}
