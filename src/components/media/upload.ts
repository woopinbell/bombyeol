"use client";

import { confirmUploads, requestUploads } from "@/app/s/[spaceId]/actions";
import type { ErrorKey } from "@/lib/action-errors";
import { MEDIA_POLICY } from "@/lib/plan";

export class UploadError extends Error {
  constructor(public key: ErrorKey) {
    super(key);
  }
}

/** 한꺼번에 여는 저장소 업로드 수(휴대폰 회선, 메모리를 고려) */
const PUT_CONCURRENCY = 4;

/** 작업을 동시에 limit개씩 돌린다(순서대로 결과) */
async function pool<T, R>(items: T[], limit: number, run: (item: T, i: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await run(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type Part = { kind: "image" | "video"; blob: Blob; contentType: string };

/**
 * 여러 파일 올리기: 서명 URL을 한 번에 받고(G-01, G-03, G-04) → 저장소에 바로 PUT(동시 4개) →
 * 확인도 묶어서(G-02). 서버 왕복이 파일 수와 상관없이 몇 번으로 끝난다.
 */
export async function uploadParts(
  spaceId: string,
  parts: Part[],
  issued: string[],
  onProgress: () => void,
): Promise<string[]> {
  const tickets = await requestUploads(
    spaceId,
    parts.map((p) => ({ kind: p.kind, contentType: p.contentType, bytes: p.blob.size })),
  );
  if ("error" in tickets) throw new UploadError(tickets.error);
  issued.push(...tickets.map((t) => t.assetId));
  await pool(tickets, PUT_CONCURRENCY, async (ticket, i) => {
    const put = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.headers,
      body: parts[i].blob,
    }).catch(() => null);
    if (!put?.ok) throw new UploadError("UPLOAD_FAILED");
    onProgress();
  });
  const ids = tickets.map((t) => t.assetId);
  const chunks = [];
  for (let i = 0; i < ids.length; i += MEDIA_POLICY.confirmBatch) {
    chunks.push(ids.slice(i, i + MEDIA_POLICY.confirmBatch));
  }
  const confirmed = await Promise.all(chunks.map((chunk) => confirmUploads(spaceId, chunk)));
  const failed = confirmed.find((c) => "error" in c);
  if (failed && "error" in failed) throw new UploadError(failed.error);
  return ids;
}
