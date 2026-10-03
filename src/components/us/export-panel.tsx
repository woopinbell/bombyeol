"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { archiveMedia, archiveRecords, type RecordKind } from "@/app/s/[spaceId]/us/export/actions";
import { Button } from "@/components/ui/button";
import type { ErrorKey } from "@/lib/action-errors";
import { DELETION_POLICY } from "@/lib/plan";
import { bytesForDisplay } from "@/lib/storage-display";
import { MAX_ENTRIES, ZipWriter } from "@/lib/zip";

const KINDS: RecordKind[] = [
  "children",
  "pets",
  "moments",
  "milestones",
  "stories",
  "events",
  "pregnancy",
];

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

type Part = { url: string; name: string; bytes: number };
type Progress = { step: "records" | "media"; files: number; bytes: number };
type Cursor = { createdAt: Date; id: string } | null;

/** 파일 이름에 쓸 수 없는 글자를 뺀다 */
const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, "-").trim() || "bombyeol";
const day = (date: Date) => new Date(date).toISOString().slice(0, 10);

/** 한 번 다시 해 보고, 그래도 안 되면 null(빠진 파일로 적는다) */
async function download(url: string): Promise<Blob | null> {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.blob();
    } catch {
      // 네트워크가 끊기면 한 번 더
    }
  }
  return null;
}

class Failed extends Error {
  constructor(readonly key: ErrorKey) {
    super(key);
  }
}

/**
 * 가족 앨범 내려받기(PRIVACY §2.5, §5 - Space 삭제 유예 중에도). 서버는 목록과 짧은 TTL URL만 주고,
 * 파일은 브라우저가 저장소에서 바로 받아 ZIP으로 묶는다(Worker를 거치지 않음). 큰 앨범은 묶음 여러 개로
 * 나누고, 다 된 묶음부터 [내려받기] 단추가 생긴다(여러 파일 자동 내려받기는 브라우저가 막는다).
 */
export function ExportPanel({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const t = useTranslations("privacy.export");
  const errors = useTranslations("errors");
  const format = useFormatter();
  const formatBytes = (n: number) => {
    const { value, unit, fraction } = bytesForDisplay(n);
    return format.number(value, { style: "unit", unit, maximumFractionDigits: fraction });
  };
  const [progress, setProgress] = useState<Progress | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [missing, setMissing] = useState(0);
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<ErrorKey | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function start() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setParts([]);
    setMissing(0);
    setError(null);
    setState("working");
    const base = safe(`${t("filePrefix")}-${spaceName}`);
    let zip = new ZipWriter();
    let files = 0;
    let bytes = 0;
    let lost = 0;
    const close = () => {
      if (zip.count === 0) return;
      const blob = zip.finish();
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setParts((prev) => [
        ...prev,
        { url, name: `${base}-${prev.length + 1}.zip`, bytes: blob.size },
      ]);
      zip = new ZipWriter();
    };
    try {
      // 1) 글 기록: 종류별로 끝까지 모아 첫 묶음에 담는다
      setProgress({ step: "records", files, bytes });
      for (const kind of KINDS) {
        const rows: unknown[] = [];
        let cursor: Cursor = null;
        do {
          const res = await archiveRecords(spaceId, kind, cursor);
          if ("error" in res) throw new Failed(res.error);
          rows.push(...res.data.items);
          cursor = res.data.nextCursor;
        } while (cursor);
        await zip.add(`${t("recordsFolder")}/${kind}.json`, JSON.stringify(rows, null, 2));
      }
      // 2) 사진, 영상: 페이지마다 URL이 살아 있는 동안 바로 받는다
      setProgress({ step: "media", files, bytes });
      const index: unknown[] = [];
      let cursor: Cursor = null;
      do {
        const res = await archiveMedia(spaceId, cursor);
        if ("error" in res) throw new Failed(res.error);
        for (const item of res.data.items) {
          const path = `${t("mediaFolder")}/${day(item.createdAt)}_${item.id}.${EXT[item.contentType] ?? "bin"}`;
          const { url, ...meta } = item;
          const blob = await download(url);
          if (!blob) {
            lost++;
            setMissing(lost);
            index.push({ ...meta, file: null });
            continue;
          }
          if (
            zip.count > 0 &&
            (zip.bytes + blob.size > DELETION_POLICY.archiveZipPartBytes ||
              zip.count >= MAX_ENTRIES - 2)
          ) {
            close();
          }
          await zip.add(path, blob, new Date(item.createdAt));
          index.push({ ...meta, file: path });
          files++;
          bytes += blob.size;
          setProgress({ step: "media", files, bytes });
        }
        cursor = res.data.nextCursor;
      } while (cursor);
      // 어느 파일이 어느 기록에 붙어 있었는지(마지막 묶음)
      await zip.add(`${t("recordsFolder")}/media.json`, JSON.stringify(index, null, 2));
      close();
      setState("done");
    } catch (e) {
      close();
      setError(e instanceof Failed ? e.key : "UNKNOWN");
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {state === "working" && progress ? (
        <p role="status" aria-live="polite" className="font-bold">
          {progress.step === "records"
            ? t("collectingRecords")
            : t("collectingMedia", { count: progress.files, size: formatBytes(progress.bytes) })}
        </p>
      ) : null}
      {state === "done" ? (
        <p role="status" aria-live="polite" className="font-bold">
          {t("ready", { count: parts.length })}
        </p>
      ) : null}
      {missing > 0 ? <p className="font-bold">{t("missing", { count: missing })}</p> : null}
      {error ? (
        <p aria-live="polite" className="font-bold">
          {errors(error)}
        </p>
      ) : null}
      {parts.length ? (
        <ul className="flex flex-col gap-2">
          {parts.map((part, i) => (
            <li key={part.url}>
              <a
                href={part.url}
                download={part.name}
                data-press=""
                className="press inline-flex min-h-(--touch) w-full items-center justify-between gap-3 rounded-md border-(length:--bw) border-line-strong px-4 font-bold"
              >
                <span>{t("part", { n: i + 1 })}</span>
                <span className="font-medium text-fg-muted">{formatBytes(part.bytes)}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {state !== "working" ? (
        <Button variant={parts.length ? "secondary" : "primary"} block onClick={start}>
          {parts.length ? t("again") : t("start")}
        </Button>
      ) : (
        <Button variant="primary" block disabled aria-busy>
          {t("working")}
        </Button>
      )}
    </div>
  );
}
