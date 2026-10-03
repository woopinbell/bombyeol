"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { discardUpload } from "@/app/s/[spaceId]/actions";
import {
  createPregnancyRecord,
  deletePregnancyRecord,
  grantPregnancyConsent,
  setPregnancyVisibility,
  withdrawPregnancyConsent,
} from "@/app/s/[spaceId]/us/pregnancy/actions";
import { UploadError, uploadParts } from "@/components/media/upload";
import { PrepError, prepareMedia } from "@/components/today/media-prep";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MEDIA_CONTENT_TYPES, PREGNANCY_POLICY } from "@/lib/plan";
import { dateOnlyKey } from "@/lib/today-feed";

type Kind = "ultrasound" | "checkup" | "kick" | "note";
type Visibility = "parents_only" | "family";
const KINDS: Kind[] = ["ultrasound", "checkup", "kick", "note"];

export type PregnancyRecord = {
  id: string;
  kind: Kind;
  date: Date;
  note: string | null;
  visibility: Visibility;
  gestationalAge: { weeks: number; days: number } | null;
  photo: { assetId: string; url: string } | null;
  createdBy: { id: string; name: string | null };
};

type Done = { ok: true } | { error: ErrorKey };

function useAct() {
  const router = useRouter();
  const { toast } = useToast();
  const errors = useTranslations("errors");
  const [pending, start] = useTransition();
  const act = (task: () => Promise<Done>, done: string, after?: () => void) =>
    start(async () => {
      const result = await task();
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      toast({ message: done });
      after?.();
      router.refresh();
    });
  return { pending, act };
}

/** 처음 켤 때 별도 안내와 동의(PRIVACY §3) - parent만 */
export function ConsentCard({ spaceId }: { spaceId: string }) {
  const t = useTranslations("pregnancy");
  const { pending, act } = useAct();
  return (
    <section className="flex flex-col gap-4 rounded-lg border-(length:--bw) border-line-strong p-5">
      <h2 className="text-title font-heavy">{t("consentTitle")}</h2>
      <p>{t("consentBody")}</p>
      <Button
        variant="primary"
        size="elder"
        block
        onClick={() => act(() => grantPregnancyConsent(spaceId), t("consentDone"))}
        disabled={pending}
        aria-busy={pending}
      >
        {t("consentAgree")}
      </Button>
    </section>
  );
}

/** 기록 남기기 버튼과 시트(동의한 parent) */
export function AddRecord({
  spaceId,
  childId,
  todayKey,
}: {
  spaceId: string;
  childId: string;
  todayKey: string;
}) {
  const t = useTranslations("pregnancy");
  const [sheet, setSheet] = useState({ open: false, seq: 0 });
  return (
    <>
      <Button
        variant="primary"
        block
        onClick={() => setSheet((s) => ({ open: true, seq: s.seq + 1 }))}
      >
        <Icon name="plus" size="small" />
        {t("add")}
      </Button>
      {sheet.seq ? (
        <RecordSheet
          key={sheet.seq}
          open={sheet.open}
          onClose={() => setSheet((s) => ({ ...s, open: false }))}
          spaceId={spaceId}
          childId={childId}
          todayKey={todayKey}
        />
      ) : null}
    </>
  );
}

/**
 * 기록 시트: 종류 → 날짜(검진은 앞날도) → 메모(메모 기록은 필수) → 초음파 사진(초음파는 필수) → 누가 볼까요(기본 엄마 아빠만).
 * 사진은 브라우저에서 JPEG로 다시 만들어 올린다(위치 정보 제거). 실패하면 올린 파일을 치운다.
 */
function RecordSheet({
  open,
  onClose,
  spaceId,
  childId,
  todayKey,
}: {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  childId: string;
  todayKey: string;
}) {
  const t = useTranslations("pregnancy");
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind>("ultrasound");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const submit = async (form: FormData) => {
    const note = String(form.get("note") ?? "");
    if (kind === "note" && !note.trim()) {
      setError("BODY_REQUIRED");
      return;
    }
    if (kind === "ultrasound" && !photo) {
      setError("MEDIA_REQUIRED");
      return;
    }
    setError(null);
    setSending(true);
    const issued: string[] = [];
    try {
      let photoAssetId: string | undefined;
      if (kind === "ultrasound" && photo) {
        const prepared = await prepareMedia(photo.file);
        if (prepared.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
        if (prepared.kind !== "image") throw new PrepError("UNSUPPORTED_TYPE");
        [photoAssetId] = await uploadParts(
          spaceId,
          [{ kind: "image", blob: prepared.original, contentType: prepared.contentType }],
          issued,
          () => {},
        );
      }
      const result = await createPregnancyRecord(spaceId, {
        childId,
        kind,
        date: String(form.get("date") || todayKey),
        note,
        photoAssetId,
        visibility: (String(form.get("visibility")) || "parents_only") as Visibility,
      });
      if ("error" in result) throw new UploadError(result.error);
      toast({ message: t("saved") });
      onClose();
      router.refresh();
    } catch (e) {
      await Promise.all(issued.map((id) => discardUpload(spaceId, id)));
      setError(
        e instanceof UploadError ? e.key : e instanceof PrepError ? "UNSUPPORTED_TYPE" : "UNKNOWN",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("add")}
      footer={
        <Button
          type="submit"
          form="pregnancy-form"
          variant="primary"
          size="elder"
          block
          disabled={sending}
          aria-busy={sending}
        >
          {sending ? t("sending") : t("save")}
        </Button>
      }
    >
      <form
        id="pregnancy-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        onChange={(e) => {
          const el = e.target as unknown as HTMLInputElement;
          if (el.name === "kind") {
            setKind(el.value as Kind);
            setError(null);
          }
        }}
        className="flex flex-col gap-6 pb-2"
      >
        <ChoiceChips
          name="kind"
          legend={t("kindLabel")}
          defaultValue={kind}
          options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
        />
        <Field
          name="date"
          type="date"
          label={t("date")}
          defaultValue={todayKey}
          // 검진은 앞으로의 날짜도 받는다(서버가 예정일 뒤 60일까지 확인)
          max={kind === "checkup" ? undefined : todayKey}
          hint={kind === "checkup" ? t("checkupHint") : undefined}
        />
        {kind === "ultrasound" ? (
          <div className="flex flex-col gap-3">
            <span className="font-bold">{t("photo")}</span>
            {photo ? (
              // 미리보기(객체 URL)
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={t("photoAlt")}
                className="max-h-48 self-start rounded-md object-contain"
              />
            ) : null}
            <input
              ref={input}
              type="file"
              accept={MEDIA_CONTENT_TYPES.image.join(",")}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) setPhoto({ file, url: URL.createObjectURL(file) });
              }}
            />
            <Button className="self-start" onClick={() => input.current?.click()}>
              <Icon name="plus" size="small" />
              {photo ? t("photoChange") : t("photoPick")}
            </Button>
            {error === "MEDIA_REQUIRED" ? (
              <p aria-live="polite" className="font-bold">
                {errors(error)}
              </p>
            ) : null}
          </div>
        ) : null}
        <TextArea
          name="note"
          label={t("note")}
          hint={kind === "note" ? undefined : t("optionalHint")}
          rows={3}
          maxLength={PREGNANCY_POLICY.noteMaxChars}
          error={error === "BODY_REQUIRED" ? t("noteRequired") : undefined}
        />
        <ChoiceChips
          name="visibility"
          legend={t("visibilityLabel")}
          defaultValue="parents_only"
          options={(["parents_only", "family"] as const).map((v) => ({
            value: v,
            label: t(`visibility.${v}`),
          }))}
        />
        {error && error !== "BODY_REQUIRED" && error !== "MEDIA_REQUIRED" ? (
          <p aria-live="polite" className="font-bold">
            {errors(error)}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/**
 * 기록 목록(서버가 이미 보이는 것만 준다 - parent가 아니면 가족 공개만). 날짜, 종류, 그 날의 주차, 메모, 사진,
 * 누가 보는지(글자로). parent: 쓴 사람은 공개 범위를 바꾸고, 다른 parent는 엄마 아빠만으로 좁히기만, 지우기는 확인 뒤.
 */
export function RecordList({
  spaceId,
  records,
  isParent,
  myUserId,
  authors,
}: {
  spaceId: string;
  records: PregnancyRecord[];
  isParent: boolean;
  myUserId: string;
  authors: Record<string, string>;
}) {
  const t = useTranslations("pregnancy");
  const format = useFormatter();
  const { pending, act } = useAct();
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!records.length) {
    return <p className="py-4 text-fg-muted">{isParent ? t("empty") : t("emptyFamily")}</p>;
  }
  return (
    <ol className="flex flex-col">
      {records.map((r) => {
        const mine = r.createdBy.id === myUserId;
        const next: Visibility = r.visibility === "family" ? "parents_only" : "family";
        // 다른 parent는 좁히기(엄마 아빠만)만 할 수 있다
        const canToggle = isParent && (mine || next === "parents_only");
        return (
          <li
            key={r.id}
            className="flex flex-col gap-2 border-b-(length:--bw-hair) border-line py-4"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold tabular-nums">
                {format.dateTime(new Date(`${dateOnlyKey(r.date)}T12:00:00Z`), {
                  timeZone: "UTC",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-caption font-bold">{t(`kind.${r.kind}`)}</span>
              {r.gestationalAge ? (
                <span className="text-caption text-fg-muted tabular-nums">
                  {t("week", r.gestationalAge)}
                </span>
              ) : null}
              {isParent ? (
                <span className="ml-auto rounded-sm border-(length:--bw) border-line-strong px-1 text-caption">
                  {t(`visibility.${r.visibility}`)}
                </span>
              ) : null}
            </div>
            {r.photo ? (
              // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.photo.url}
                alt={t("photoAlt")}
                loading="lazy"
                className="max-h-64 self-start rounded-md object-contain"
              />
            ) : null}
            {r.note ? <p className="whitespace-pre-line">{r.note}</p> : null}
            <p className="text-caption text-fg-muted">
              {t("by", { who: authors[r.createdBy.id] ?? r.createdBy.name ?? "" })}
            </p>
            {isParent ? (
              confirming === r.id ? (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-md border-(length:--bw-sel) border-fg p-4"
                >
                  <p className="font-bold">{t("removeConfirm")}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setConfirming(null)} disabled={pending}>
                      {t("confirmNo")}
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() =>
                        act(
                          () => deletePregnancyRecord(spaceId, r.id),
                          t("removed"),
                          () => setConfirming(null),
                        )
                      }
                    >
                      {t("confirmYes")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="-ml-2 flex flex-wrap gap-2">
                  {canToggle ? (
                    <Button
                      variant="text"
                      disabled={pending}
                      onClick={() =>
                        act(
                          () => setPregnancyVisibility(spaceId, r.id, next),
                          t("visibilityChanged"),
                        )
                      }
                    >
                      {next === "family" ? t("showFamily") : t("showParents")}
                    </Button>
                  ) : null}
                  <Button variant="text" onClick={() => setConfirming(r.id)}>
                    {t("remove")}
                  </Button>
                </div>
              )
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** 동의 거두기(본인): 내가 쓴 기록을 남길지(엄마 아빠만 보기로) 지울지 고른 뒤 확인 */
export function WithdrawConsent({ spaceId }: { spaceId: string }) {
  const t = useTranslations("pregnancy");
  const { pending, act } = useAct();
  const [choice, setChoice] = useState<"keep" | "delete" | null>(null);
  return (
    <section className="flex flex-col gap-3 border-t-(length:--bw-hair) border-line pt-6">
      <h2 className="font-bold">{t("withdrawTitle")}</h2>
      <p className="text-fg-muted">{t("withdrawLead")}</p>
      <form
        onChange={(e) =>
          setChoice((e.target as unknown as HTMLInputElement).value as "keep" | "delete")
        }
        onSubmit={(e) => {
          e.preventDefault();
          if (!choice) return;
          act(() => withdrawPregnancyConsent(spaceId, choice === "delete"), t("withdrawn"));
        }}
        className="flex flex-col gap-3"
      >
        <ChoiceChips
          name="withdraw"
          legend={t("withdraw")}
          options={[
            { value: "keep", label: t("withdrawKeep") },
            { value: "delete", label: t("withdrawDelete") },
          ]}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={!choice || pending}
          aria-busy={pending}
        >
          {t("withdraw")}
        </Button>
      </form>
    </section>
  );
}
