"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

type Cursor = { createdAt: Date; id: string } | null;
type Result<T> = { ok: true; data: T } | { error: ErrorKey };

export type RecordKind =
  "children" | "pets" | "moments" | "milestones" | "stories" | "events" | "pregnancy";

async function run<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

/** 내려받기: 글 기록 한 페이지(parent - 프로시저가 검사, 사용자당 리밋 G-07) */
export async function archiveRecords(spaceId: string, kind: RecordKind, cursor: Cursor) {
  const caller = await serverCaller();
  return run(() => caller.archive.records({ spaceId, kind, cursor: cursor ?? undefined }));
}

/** 내려받기: 원본 파일 한 페이지(짧은 TTL 읽기 URL). 파일은 브라우저가 저장소에서 바로 받는다 */
export async function archiveMedia(spaceId: string, cursor: Cursor) {
  const caller = await serverCaller();
  return run(() => caller.archive.media({ spaceId, cursor: cursor ?? undefined }));
}
