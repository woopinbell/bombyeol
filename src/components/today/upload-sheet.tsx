"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  confirmUploads,
  createMoment,
  discardUpload,
  requestUploads,
} from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MEDIA_POLICY, MOMENT_POLICY } from "@/lib/plan";
import { PrepError, prepareMedia, type PreparedMedia } from "./media-prep";
import { useToday } from "./today-state";

export type SubjectChoice = { value: string; label: string };

class UploadError extends Error {
  constructor(public key: ErrorKey) {
    super(key);
  }
}

/** subject 라디오 값: "child:ID" | "pet:ID" | "family" */
function toSubject(value: string) {
  const [type, id] = value.split(":");
  if (type === "child") return { type, childId: id } as const;
  if (type === "pet") return { type, petId: id } as const;
  return { type: "family" } as const;
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

type Part = { kind: "image" | "video"; blob: Blob; contentType: string };

/**
 * 여러 파일 올리기: 서명 URL을 한 번에 받고(G-01, G-03, G-04) → 저장소에 바로 PUT(동시 4개) →
 * 확인도 묶어서(G-02). 서버 왕복이 파일 수와 상관없이 몇 번으로 끝난다.
 */
async function uploadParts(
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

/**
 * 사진, 영상 올리기 시트: 고른 파일 미리보기 → 누구의 기록인지 → 한 줄(선택) → [올리기].
 * 사진은 브라우저에서 JPEG로 다시 만들어 올린다(크기를 줄이고 위치 정보가 지워진다, UPLOAD_PREP).
 * 촬영 날짜는 사진에 남은 날짜로 정한다(없으면 지금). 중간에 실패하면 이미 올린 파일을 치운다.
 */
export function UploadSheet({
  open,
  onClose,
  files,
  subjects,
  defaultSubject,
}: {
  open: boolean;
  onClose: () => void;
  files: File[];
  subjects: SubjectChoice[];
  defaultSubject: string;
}) {
  const t = useTranslations("upload");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const { spaceId, addMoment } = useToday();
  const picked = files.slice(0, MOMENT_POLICY.maxMediaPerMoment);
  const [prepared, setPrepared] = useState<PreparedMedia[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [preparing, setPreparing] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const urls = useRef<string[]>([]);

  // 파일 준비(다시 인코딩, 썸네일)는 하나씩 - 큰 사진 여러 장을 한꺼번에 풀면 휴대폰 메모리가 모자란다
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const file of files.slice(0, MOMENT_POLICY.maxMediaPerMoment)) {
        try {
          const item = await prepareMedia(file);
          if (item.previewUrl) urls.current.push(item.previewUrl);
          if (alive) setPrepared((list) => [...list, item]);
        } catch (e) {
          if (!(e instanceof PrepError)) throw e;
          if (alive) setSkipped((n) => n + 1);
        }
      }
      if (alive) setPreparing(false);
    })();
    return () => {
      alive = false;
    };
  }, [files]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const submit = async (form: FormData) => {
    if (!prepared.length || progress) return;
    setError(null);
    const uploaded: string[] = [];
    // 원본, 썸네일 순서로 펼쳐 한 번에 올리고 다시 짝지운다
    const parts: Part[] = prepared.flatMap((item) => [
      { kind: item.kind, blob: item.original, contentType: item.contentType },
      ...(item.thumbnail
        ? [{ kind: "image" as const, blob: item.thumbnail, contentType: "image/jpeg" }]
        : []),
    ]);
    setProgress({ done: 0, total: parts.length });
    try {
      const ids = await uploadParts(spaceId, parts, uploaded, () =>
        setProgress((p) => p && { ...p, done: p.done + 1 }),
      );
      let at = 0;
      const media = prepared.map((item) => {
        const assetId = ids[at++];
        const thumbnailAssetId = item.thumbnail ? ids[at++] : undefined;
        return { assetId, thumbnailAssetId };
      });
      const now = Date.now();
      const dates = prepared
        .map((m) => m.takenAt?.getTime())
        .filter((d): d is number => d !== undefined && d <= now);
      const body = String(form.get("body") ?? "").trim();
      const created = await createMoment(spaceId, {
        subject: toSubject(String(form.get("subject") ?? defaultSubject)),
        body: body || undefined,
        takenAt: dates.length ? new Date(Math.min(...dates)) : undefined,
        media,
      });
      if ("error" in created) throw new UploadError(created.error);
      addMoment({
        ...created,
        reactions: { likes: 0, comments: 0, likedByMe: false },
      });
      const photos = prepared.filter((m) => m.kind === "image").length;
      const videos = prepared.length - photos;
      toast({
        message: !videos
          ? t("donePhotos", { count: photos })
          : !photos
            ? t("doneVideos", { count: videos })
            : t("doneMixed"),
      });
      onClose();
    } catch (e) {
      // 기록에 붙지 못한 파일은 저장 공간을 차지하지 않게 치운다(G-03)
      await Promise.all(uploaded.map((id) => discardUpload(spaceId, id)));
      const key = e instanceof UploadError ? e.key : "UNKNOWN";
      setError(key);
    } finally {
      setProgress(null);
    }
  };

  const busy = preparing || progress !== null;
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!progress) onClose();
      }}
      title={t("title")}
      footer={
        <Button
          type="submit"
          form="upload-form"
          variant="primary"
          size="elder"
          block
          disabled={busy || prepared.length === 0}
          aria-busy={busy}
        >
          {progress
            ? t("uploading", { done: progress.done, total: progress.total })
            : preparing
              ? t("preparing")
              : t("submit")}
        </Button>
      }
    >
      <form
        id="upload-form"
        // action 대신 onSubmit: 실패해도 쓰던 글이 지워지지 않게(폼 자동 초기화 없음)
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-6 pb-2"
      >
        <div>
          <ul className="grid grid-cols-4 gap-1 overflow-hidden rounded-md">
            {prepared.map((m, i) => (
              <li
                key={i}
                className="relative flex aspect-square items-center justify-center bg-line"
              >
                {m.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Icon name="play" />
                )}
                {m.kind === "video" ? (
                  <span className="absolute bottom-1 left-1 rounded-sm bg-strong px-1 text-caption font-bold text-on-strong">
                    {t("video")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p aria-live="polite" className="mt-2 text-caption text-fg-muted">
            {t("picked", { count: prepared.length })}
            {files.length > picked.length
              ? ` ${t("tooMany", { max: MOMENT_POLICY.maxMediaPerMoment })}`
              : ""}
            {skipped ? ` ${t("skipped", { count: skipped })}` : ""}
          </p>
        </div>
        {subjects.length > 1 ? (
          <ChoiceChips
            name="subject"
            legend={t("subject")}
            options={subjects}
            defaultValue={defaultSubject}
          />
        ) : (
          <input type="hidden" name="subject" value={defaultSubject} />
        )}
        <Field
          name="body"
          label={t("body")}
          hint={t("bodyHint")}
          maxLength={MOMENT_POLICY.bodyMaxChars}
          autoComplete="off"
        />
        {/* 실패는 토스트가 아니라 여기 남긴다(DESIGN §9.6 중요한 결과는 토스트에만 두지 않는다) */}
        <p aria-live="polite" className="font-bold empty:hidden">
          {error ? errors(error) : null}
        </p>
      </form>
    </Sheet>
  );
}
