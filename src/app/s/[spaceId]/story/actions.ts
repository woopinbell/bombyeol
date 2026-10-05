"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import type { StoryCategory } from "@/lib/story-prompts";
import type { StoryCursor } from "@/lib/story-view";
import { serverCaller } from "@/server/trpc/server-caller";

type Failed = { error: ErrorKey };

/** 이야기 모음 다음 페이지(권한, 화자 확인은 tRPC 프로시저가 한다) */
export async function loadMoreStories(
  spaceId: string,
  filter: { narratorMemberId: string | null; petId: string | null },
  cursor: StoryCursor,
) {
  try {
    const caller = await serverCaller();
    return await caller.story.list({
      spaceId,
      narratorMemberId: filter.narratorMemberId ?? undefined,
      petId: filter.petId ?? undefined,
      cursor,
    });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 별 하나를 원하는 상태로(여러 번 보내도 같다). 화면은 연달아 누른 것을 모아 마지막 상태만 보낸다 */
export async function setStar(spaceId: string, storyEntryId: string, starred: boolean) {
  try {
    const caller = await serverCaller();
    return await caller.reaction.setStar({
      spaceId,
      target: { type: "story", storyEntryId },
      starred,
    });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/**
 * 이야기 쓰기: 질문 카드에 답하거나(promptKey), 물어보기에 답하거나(askId), 자유롭게. narratorMemberId가 내가
 * 아니면 대필. 사진은 먼저 올리고 확인된 자산 ID를 넘긴다(G-01~04는 올리기 단계).
 */
export async function createStory(
  spaceId: string,
  input: {
    narratorMemberId?: string;
    askId?: string;
    promptKey?: string;
    category?: StoryCategory;
    title?: string;
    body: string;
    storyYear?: number;
    photoAssetId?: string;
    /** 반려동물에 붙인 이야기(PRD §4.2.1) */
    petId?: string;
  },
) {
  try {
    const caller = await serverCaller();
    return await caller.story.create({ spaceId, ...input });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 이야기 고치기(쓴 사람 또는 화자 본인). null은 지우기 */
export async function updateStory(
  spaceId: string,
  input: {
    storyId: string;
    title?: string | null;
    body?: string;
    storyYear?: number | null;
    category?: StoryCategory | null;
    photoAssetId?: string | null;
    petId?: string | null;
  },
) {
  try {
    const caller = await serverCaller();
    return await caller.story.update({ spaceId, ...input });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 이야기 지우기(쓴 사람, 화자 본인 또는 parent). 사진까지 저장소에서 지운다(G-05) */
export async function deleteStory(spaceId: string, storyId: string) {
  try {
    const caller = await serverCaller();
    return await caller.story.delete({ spaceId, storyId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 물어보기(parent → 어르신): 질문 카드 또는 직접 쓴 질문 */
export async function askStory(
  spaceId: string,
  input: { toMemberId: string; promptKey?: string; question?: string },
) {
  try {
    const caller = await serverCaller();
    return await caller.story.ask({ spaceId, ...input });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 물어보기 거두기(보낸 사람 또는 parent) */
export async function cancelAsk(spaceId: string, askId: string) {
  try {
    const caller = await serverCaller();
    return await caller.story.cancelAsk({ spaceId, askId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}
