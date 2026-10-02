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

/** 올리기 1단계: 서명된 업로드 URL(G-01, G-03, G-04 검사는 프로시저) */
export async function requestUpload(
  spaceId: string,
  file: { kind: "image" | "video"; contentType: string; bytes: number },
) {
  try {
    const caller = await serverCaller();
    return await caller.media.requestUpload({
      spaceId,
      kind: file.kind,
      // 허용 형식은 프로시저의 입력 검사가 거른다
      contentType: file.contentType as "image/jpeg",
      bytes: file.bytes,
    });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 올리기 2단계: 저장소의 실제 크기, 형식 확인(G-02) */
export async function confirmUpload(spaceId: string, assetId: string) {
  try {
    const caller = await serverCaller();
    return await caller.media.confirm({ spaceId, assetId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 기록에 붙이지 못한 파일 치우기(중간에 실패했을 때) */
export async function discardUpload(spaceId: string, assetId: string) {
  try {
    const caller = await serverCaller();
    return await caller.media.delete({ spaceId, assetId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

type Subject =
  { type: "child"; childId: string } | { type: "pet"; petId: string } | { type: "family" };

export async function createMoment(
  spaceId: string,
  input: {
    subject: Subject;
    body?: string;
    takenAt?: Date;
    media: { assetId: string; thumbnailAssetId?: string }[];
  },
) {
  try {
    const caller = await serverCaller();
    return await caller.moment.create({ spaceId, ...input });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function createDiary(spaceId: string, input: { childId: string; body: string }) {
  try {
    const caller = await serverCaller();
    return await caller.moment.createDiary({
      spaceId,
      subject: { type: "child", childId: input.childId },
      body: input.body,
    });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

export async function createMilestone(
  spaceId: string,
  input: {
    subject: { type: "child"; childId: string } | { type: "pet"; petId: string };
    kind: string;
    value: Record<string, unknown>;
    recordedAt: string;
  },
) {
  try {
    const caller = await serverCaller();
    return await caller.milestone.create({ spaceId, ...input });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}

/** 기록 지우기(작성자 또는 parent). 붙은 파일까지 저장소에서 지운다(G-05) */
export async function deleteMoment(spaceId: string, momentId: string) {
  try {
    const caller = await serverCaller();
    return await caller.moment.delete({ spaceId, momentId });
  } catch (error) {
    return { error: toErrorKey(error) } satisfies Failed;
  }
}
