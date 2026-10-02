"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { discardUpload } from "@/app/s/[spaceId]/actions";
import { createStory, updateStory } from "@/app/s/[spaceId]/story/actions";
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
import { MEDIA_CONTENT_TYPES, STORY_POLICY } from "@/lib/plan";
import { STORY_CATEGORIES, type StoryCategory } from "@/lib/story-prompts";
import type { StoryItem } from "@/lib/story-view";
import { useStory } from "./story-state";

/** 무엇에 대한 이야기인가: 질문 카드, 가족의 물어보기, 자유롭게, 또는 고치기 */
export type WriteTarget =
  | { kind: "prompt"; promptKey: string; narratorId: string }
  | { kind: "ask"; askId: string; question: string; narratorId: string }
  | { kind: "free"; narratorId: string }
  | { kind: "edit"; story: StoryItem };

const draftKey = (spaceId: string, target: WriteTarget) =>
  `bombyeol.draft.story.${spaceId}.${
    target.kind === "prompt"
      ? target.promptKey
      : target.kind === "ask"
        ? `ask-${target.askId}`
        : target.kind === "edit"
          ? `edit-${target.story.id}`
          : "free"
  }`;

function readDraft(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 초안 없이 쓴다
  }
}

/**
 * 이야기 쓰기, 고치기 시트(PRD §4.3): 질문(있으면), 누구의 이야기(대필이면 그분 이야기로, 받아 적은 사람도 남는다),
 * 제목, 이야기(초안 자동 저장 - 시간 제한 없음, DESIGN §9.1-6), 연도, 카테고리(자유롭게 쓸 때만), 옛날 사진 한 장.
 * 사진은 올리기를 누를 때 JPEG로 다시 만들어 올린다(위치 정보 제거). 실패하면 올린 파일을 치운다.
 */
export function WriteSheet({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: WriteTarget;
}) {
  const t = useTranslations("storyWrite");
  const tp = useTranslations("story");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const router = useRouter();
  const { spaceId, narrators, me, addStory, replaceStory } = useStory();
  const editing = target.kind === "edit" ? target.story : null;
  const key = draftKey(spaceId, target);
  // 시트는 누른 뒤에만 그려지므로(서버 렌더 없음) 초안을 바로 읽어도 된다
  const [body, setBody] = useState(() => readDraft(key) ?? editing?.body ?? "");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(Boolean(editing?.photo));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  // 받아 적을 수 있는 사람: 나(어르신, 부모) + 별이 되지 않은 다른 어르신. 물어보기 답은 질문받은 분으로 고정
  const choices =
    target.kind === "prompt" || target.kind === "free"
      ? narrators.filter(
          (n) =>
            !n.memorial &&
            (n.memberId === me.memberId ? me.role !== "relative" : n.role === "grandparent"),
        )
      : [];
  const narratorId = target.kind === "edit" ? null : target.narratorId;
  const question =
    target.kind === "prompt"
      ? tp(`prompts.${target.promptKey}` as Parameters<typeof tp>[0])
      : target.kind === "ask"
        ? target.question
        : editing?.promptKey
          ? tp(`prompts.${editing.promptKey}` as Parameters<typeof tp>[0])
          : (editing?.ask?.question ?? null);
  const canPickCategory =
    target.kind === "free" || (target.kind === "edit" && !target.story.promptKey);

  const submit = async (form: FormData) => {
    const text = body.trim();
    if (!text) {
      setError("BODY_REQUIRED");
      return;
    }
    const title = String(form.get("title") ?? "").trim();
    const yearText = String(form.get("year") ?? "").trim();
    const year = yearText ? Number(yearText) : null;
    if (year !== null && (!Number.isInteger(year) || year < STORY_POLICY.minYear)) {
      setError("INVALID_INPUT");
      return;
    }
    const category = (String(form.get("category") ?? "") || null) as StoryCategory | null;
    setError(null);
    setSending(true);
    const issued: string[] = [];
    try {
      let photoAssetId: string | null | undefined = undefined;
      if (photo) {
        const prepared = await prepareMedia(photo.file);
        if (prepared.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
        if (prepared.kind !== "image") throw new PrepError("UNSUPPORTED_TYPE");
        [photoAssetId] = await uploadParts(
          spaceId,
          [{ kind: "image", blob: prepared.original, contentType: prepared.contentType }],
          issued,
          () => {},
        );
      } else if (editing?.photo && !keepPhoto) {
        photoAssetId = null;
      }
      if (editing) {
        const result = await updateStory(spaceId, {
          storyId: editing.id,
          title: title || null,
          body: text,
          storyYear: year,
          ...(canPickCategory && { category }),
          ...(photoAssetId !== undefined && { photoAssetId }),
        });
        if ("error" in result) throw new UploadError(result.error);
        replaceStory({ ...editing, ...result });
        toast({ message: t("edited") });
      } else {
        const result = await createStory(spaceId, {
          narratorMemberId:
            target.kind === "ask"
              ? undefined
              : String(form.get("narrator") || narratorId || "") || undefined,
          askId: target.kind === "ask" ? target.askId : undefined,
          promptKey: target.kind === "prompt" ? target.promptKey : undefined,
          category: category ?? undefined,
          title: title || undefined,
          body: text,
          storyYear: year ?? undefined,
          photoAssetId: photoAssetId ?? undefined,
        });
        if ("error" in result) throw new UploadError(result.error);
        addStory(
          { ...result, reactions: { stars: 0, comments: 0, starredByMe: false } },
          target.kind === "ask" ? target.askId : undefined,
        );
        // 질문 카드(다음 물어보기, 오늘의 질문)는 서버가 정하므로 새로 받는다
        router.refresh();
        toast({ message: t("done") });
      }
      writeDraft(key, "");
      onClose();
    } catch (e) {
      await Promise.all(issued.map((id) => discardUpload(spaceId, id)));
      setError(
        e instanceof UploadError ? e.key : e instanceof PrepError ? "UNSUPPORTED_TYPE" : "UNKNOWN",
      );
    } finally {
      setSending(false);
    }
  };

  const shownPhoto = photo?.url ?? (keepPhoto ? editing?.photo?.url : null) ?? null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t("editTitle") : t("title")}
      footer={
        <Button
          type="submit"
          form="story-write-form"
          variant="primary"
          size="elder"
          block
          disabled={sending}
          aria-busy={sending}
        >
          {sending ? t("sending") : editing ? t("save") : t("submit")}
        </Button>
      }
    >
      <form
        id="story-write-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-6 pb-2"
      >
        {question ? <p className="text-title font-heavy text-balance">{question}</p> : null}
        {choices.length > 1 ? (
          <div className="flex flex-col gap-2">
            <ChoiceChips
              name="narrator"
              legend={t("narrator")}
              defaultValue={narratorId ?? me.memberId}
              options={choices.map((n) => ({
                value: n.memberId,
                label: n.memberId === me.memberId ? t("me") : n.label,
              }))}
            />
            <p className="text-caption text-fg-muted">{t("scribeHint")}</p>
          </div>
        ) : null}
        <TextArea
          label={t("body")}
          hint={t("draftHint")}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            writeDraft(key, e.target.value);
          }}
          rows={8}
          maxLength={STORY_POLICY.bodyMaxChars}
          error={error === "BODY_REQUIRED" ? errors(error) : undefined}
        />
        <Field
          name="title"
          label={t("titleLabel")}
          hint={t("optionalHint")}
          maxLength={STORY_POLICY.titleMaxChars}
          autoComplete="off"
          defaultValue={editing?.title ?? ""}
        />
        <Field
          name="year"
          label={t("year")}
          hint={t("yearHint")}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          defaultValue={editing?.storyYear ?? ""}
          error={
            error === "INVALID_INPUT" || error === "DATE_IN_FUTURE" ? errors(error) : undefined
          }
        />
        {canPickCategory ? (
          <ChoiceChips
            name="category"
            legend={t("category")}
            defaultValue={editing?.category ?? undefined}
            options={STORY_CATEGORIES.map((c) => ({
              value: c,
              label: tp(`categories.${c}`),
            }))}
          />
        ) : null}
        <div className="flex flex-col gap-3">
          <span className="font-bold">{t("photo")}</span>
          {shownPhoto ? (
            // 미리보기(객체 URL) 또는 짧은 TTL 읽기 URL이라 이미지 최적화 경로를 거치지 않는다
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownPhoto}
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
          <div className="-ml-2 flex flex-wrap gap-2">
            <Button variant="text" onClick={() => input.current?.click()}>
              <Icon name="plus" size="small" />
              {shownPhoto ? t("photoChange") : t("photoPick")}
            </Button>
            {shownPhoto ? (
              <Button
                variant="text"
                onClick={() => {
                  setPhoto(null);
                  setKeepPhoto(false);
                }}
              >
                {t("photoRemove")}
              </Button>
            ) : null}
          </div>
        </div>
        {error && !["BODY_REQUIRED", "INVALID_INPUT", "DATE_IN_FUTURE"].includes(error) ? (
          <p aria-live="polite" className="font-bold">
            {errors(error)}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
