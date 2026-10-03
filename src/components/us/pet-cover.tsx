"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { discardUpload } from "@/app/s/[spaceId]/actions";
import { setPetCover } from "@/app/s/[spaceId]/us/actions";
import { UploadError, uploadParts } from "@/components/media/upload";
import { PrepError, prepareMedia } from "@/components/today/media-prep";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MEDIA_CONTENT_TYPES } from "@/lib/plan";

/**
 * 반려동물 커버 사진(parent): 고르면 브라우저에서 JPEG로 다시 만들어(위치 정보 제거, UPLOAD_PREP) 올리고 바로 바꾼다.
 * 중간에 실패하면 올린 파일을 치운다. 이전 커버는 서버가 지운다(G-05).
 */
export function PetCover({
  spaceId,
  petId,
  name,
  coverUrl,
}: {
  spaceId: string;
  petId: string;
  name: string;
  coverUrl: string | null;
}) {
  const t = useTranslations("petForm");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    const issued: string[] = [];
    try {
      const prepared = await prepareMedia(file);
      if (prepared.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
      if (prepared.kind !== "image") throw new PrepError("UNSUPPORTED_TYPE");
      const [assetId] = await uploadParts(
        spaceId,
        [{ kind: "image", blob: prepared.original, contentType: prepared.contentType }],
        issued,
        () => {},
      );
      const result = await setPetCover(spaceId, petId, assetId);
      if ("error" in result) throw new UploadError(result.error);
      toast({ message: t("coverDone") });
      router.refresh();
    } catch (e) {
      await Promise.all(issued.map((id) => discardUpload(spaceId, id)));
      setError(
        e instanceof UploadError ? e.key : e instanceof PrepError ? "UNSUPPORTED_TYPE" : "UNKNOWN",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    const result = await setPetCover(spaceId, petId, null);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    toast({ message: t("coverRemoved") });
    router.refresh();
  };

  return (
    <section aria-labelledby="cover-heading" className="flex flex-col gap-3">
      <h2 id="cover-heading" className="font-bold">
        {t("cover")}
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex size-24 flex-none items-center justify-center overflow-hidden rounded-lg border-(length:--bw) border-line-strong">
          {coverUrl ? (
            // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={t("coverAlt", { name })} className="size-full object-cover" />
          ) : (
            <span className="px-2 text-center text-caption text-fg-muted">{t("coverEmpty")}</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <input
            ref={input}
            type="file"
            accept={MEDIA_CONTENT_TYPES.image.join(",")}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <Button onClick={() => input.current?.click()} disabled={busy} aria-busy={busy}>
            <Icon name="plus" size="small" />
            {busy ? t("coverUploading") : coverUrl ? t("coverChange") : t("coverPick")}
          </Button>
          {coverUrl ? (
            <Button variant="text" onClick={() => void remove()} disabled={busy}>
              {t("coverRemove")}
            </Button>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="text-caption font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
    </section>
  );
}
