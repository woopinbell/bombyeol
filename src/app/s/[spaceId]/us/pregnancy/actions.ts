"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { serverCaller } from "@/server/trpc/server-caller";

type Done = { ok: true } | { error: ErrorKey };

async function run(task: () => Promise<unknown>): Promise<Done> {
  try {
    await task();
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

/** 임신(건강) 정보 별도 동의(parent, PRIVACY §3). 지금 문구 버전으로 남긴다 */
export async function grantPregnancyConsent(spaceId: string) {
  const caller = await serverCaller();
  return run(() =>
    caller.consent.grantSpace({
      spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    }),
  );
}

/** 동의 거두기: 내가 쓴 기록을 지우거나, 남기고 엄마 아빠만 보게 되돌린다 */
export async function withdrawPregnancyConsent(spaceId: string, deleteRecords: boolean) {
  const caller = await serverCaller();
  return run(() => caller.consent.withdraw({ spaceId, kind: "pregnancy", deleteRecords }));
}

/** 기록 남기기(동의한 parent). 초음파 사진은 먼저 올리고 확인된 자산 ID를 넘긴다(G-01~04) */
export async function createPregnancyRecord(
  spaceId: string,
  input: {
    childId: string;
    kind: "ultrasound" | "checkup" | "kick" | "note";
    date: string;
    note: string;
    photoAssetId?: string;
    visibility: "parents_only" | "family";
  },
) {
  const caller = await serverCaller();
  return run(() =>
    caller.pregnancy.create({
      spaceId,
      ...input,
      note: input.note.trim() || undefined,
    }),
  );
}

/**
 * 고치기(쓴 사람, 임신 동의 필요 - 서버가 검사): 날짜, 메모, 공개 범위, 초음파 사진.
 * 종류는 바꾸지 않는다. 메모를 비우면 지운다(메모 기록은 서버가 거절). 새 사진을 주면 이전 사진은 서버가 지운다(G-05).
 */
export async function updatePregnancyRecord(
  spaceId: string,
  recordId: string,
  input: {
    date: string;
    note: string;
    photoAssetId?: string;
    visibility: "parents_only" | "family";
  },
) {
  const caller = await serverCaller();
  return run(() =>
    caller.pregnancy.update({
      spaceId,
      recordId,
      date: input.date,
      note: input.note.trim() || null,
      photoAssetId: input.photoAssetId,
      visibility: input.visibility,
    }),
  );
}

/** 공개 범위 바꾸기: 쓴 사람은 둘 다, 다른 parent는 엄마 아빠만으로 좁히기만(서버가 검사) */
export async function setPregnancyVisibility(
  spaceId: string,
  recordId: string,
  visibility: "parents_only" | "family",
) {
  const caller = await serverCaller();
  return run(() => caller.pregnancy.update({ spaceId, recordId, visibility }));
}

/** 지우기(parent). 사진까지 저장소에서 지운다(G-05) */
export async function deletePregnancyRecord(spaceId: string, recordId: string) {
  const caller = await serverCaller();
  return run(() => caller.pregnancy.delete({ spaceId, recordId }));
}
