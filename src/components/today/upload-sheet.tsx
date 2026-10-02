"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  confirmUpload,
  createMoment,
  discardUpload,
  requestUpload,
} from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MOMENT_POLICY } from "@/lib/plan";
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

/** 파일 하나 올리기: 서명 URL 받기 → 저장소에 바로 PUT → 확인(G-01, G-02) */
async function uploadBlob(
  spaceId: string,
  kind: "image" | "video",
  blob: Blob,
  contentType: string,
) {
  const ticket = await requestUpload(spaceId, { kind, contentType, bytes: blob.size });
  if ("error" in ticket) throw new UploadError(ticket.error);
  const put = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: ticket.headers,
    body: blob,
  }).catch(() => null);
  if (!put?.ok) throw new UploadError("UPLOAD_FAILED");
  const done = await confirmUpload(spaceId, ticket.assetId);
  if ("error" in done) throw new UploadError(done.error);
  return ticket.assetId;
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
    const total = prepared.reduce((n, m) => n + (m.thumbnail ? 2 : 1), 0);
    setProgress({ done: 0, total });
    try {
      const media = [];
      for (const item of prepared) {
        const assetId = await uploadBlob(spaceId, item.kind, item.original, item.contentType);
        uploaded.push(assetId);
        setProgress((p) => p && { ...p, done: p.done + 1 });
        let thumbnailAssetId: string | undefined;
        if (item.thumbnail) {
          thumbnailAssetId = await uploadBlob(spaceId, "image", item.thumbnail, "image/jpeg");
          uploaded.push(thumbnailAssetId);
          setProgress((p) => p && { ...p, done: p.done + 1 });
        }
        media.push({ assetId, thumbnailAssetId });
      }
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
      toast({ message: errors(key) });
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
          error={error === "INVALID_INPUT" ? errors(error) : undefined}
        />
      </form>
    </Sheet>
  );
}
