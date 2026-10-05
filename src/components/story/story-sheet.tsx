"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { deleteStory } from "@/app/s/[spaceId]/story/actions";
import {
  CommentForm,
  CommentList,
  useComments,
  type LikeState,
} from "@/components/today/reactions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { StoryItem } from "@/lib/story-view";
import { StarButton } from "./star";
import { useStory } from "./story-state";

/** 이야기의 질문(카드 문구 또는 물어보기에 직접 쓴 질문). 없으면 null */
export function useStoryQuestion(story: StoryItem) {
  const tp = useTranslations("story");
  if (story.promptKey) return tp(`prompts.${story.promptKey}` as Parameters<typeof tp>[0]);
  return story.ask?.question ?? null;
}

/**
 * 이야기 자세히 보기 시트: 사진, 질문, 제목, 이야기, 누구 이야기(받아 적은 사람 병기), 별 하나, 댓글.
 * 고치기는 쓴 사람 또는 화자 본인, 지우기는 여기에 parent(이야기는 되돌리기 대신 확인, DESIGN §9.1-7).
 * 별이 되신 분의 이야기는 영구 보존이라 고치기, 지우기가 없다.
 */
export function StorySheet({
  open,
  onClose,
  story,
  star,
  onToggleStar,
  onCommentsChange,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  story: StoryItem;
  /** 별 하나는 칸과 시트가 같은 상태를 쓴다(보내기 묶음이 하나) */
  star: LikeState;
  onToggleStar: () => LikeState;
  onCommentsChange: (count: number) => void;
  onEdit: () => void;
}) {
  const t = useTranslations("storyTab");
  const ts = useTranslations("storySheet");
  const errors = useTranslations("errors");
  const left = useTranslations("privacy")("leftFamily");
  const { toast } = useToast();
  const { spaceId, me, authors, dropStory, pets } = useStory();
  const pet = pets.find((p) => p.id === story.petId);
  const comments = useComments({
    spaceId,
    target: { type: "story", storyEntryId: story.id },
    open,
    focus: false,
    onChange: (c) => onCommentsChange(c.count),
  });
  const question = useStoryQuestion(story);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const owner = story.createdBy.id === me.userId || story.narrator.memberId === me.memberId;
  const canEdit = owner && !story.narrator.memorial;
  const canDelete = (owner || me.role === "parent") && !story.narrator.memorial;

  const remove = async () => {
    setRemoving(true);
    const result = await deleteStory(spaceId, story.id);
    setRemoving(false);
    if ("error" in result && result.error !== "ITEM_NOT_FOUND") {
      toast({ message: errors(result.error) });
      return;
    }
    onClose();
    dropStory(story.id, star.count);
    toast({ message: ts("removed") });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ts("title")}
      footer={<CommentForm comments={comments} />}
    >
      {story.photo ? (
        // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.photo.url}
          alt={t("photoAlt")}
          className="mb-4 max-h-[40dvh] w-full rounded-md object-contain"
        />
      ) : null}
      {question ? (
        <p className="mb-1 inline-flex items-center gap-1 text-caption font-bold text-starlight-gold">
          <Icon name="spark" size="small" />
          {question}
        </p>
      ) : null}
      {story.title ? <h3 className="text-title font-heavy">{story.title}</h3> : null}
      <p className="mt-2 text-title-s whitespace-pre-line">{story.body}</p>
      <p className="mt-3 text-caption text-fg-muted">
        {t("byline", { name: story.narrator.label ?? story.narrator.name ?? left })}
        {story.storyYear ? <>, {t("year", { year: story.storyYear })}</> : null}
        {pet ? <>, {t("aboutPet", { name: pet.name })}</> : null}
        {story.scribe ? (
          <>
            , {t("scribedBy", { name: authors[story.createdBy.id] ?? story.scribe.name ?? left })}
          </>
        ) : null}
      </p>
      <div className="mt-4 flex gap-2">
        <StarButton star={star} onToggle={onToggleStar} />
      </div>
      {confirming ? (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 rounded-md border-(length:--bw-sel) border-fg p-4"
        >
          <p className="font-bold">{ts("confirmRemove")}</p>
          <div className="flex gap-2">
            <Button onClick={() => setConfirming(false)} disabled={removing}>
              {ts("confirmNo")}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => void remove()}
              disabled={removing}
              aria-busy={removing}
            >
              {ts("confirmYes")}
            </Button>
          </div>
        </div>
      ) : canEdit || canDelete ? (
        <div className="mt-2 -ml-2 flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="text" onClick={onEdit}>
              <Icon name="pen" size="small" />
              {ts("edit")}
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="text" onClick={() => setConfirming(true)}>
              {ts("remove")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <CommentList
        comments={comments}
        authors={authors}
        myUserId={me.userId}
        canModerate={me.role === "parent"}
      />
    </Sheet>
  );
}
