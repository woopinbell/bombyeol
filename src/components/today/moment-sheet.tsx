"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateMomentBody } from "@/app/s/[spaceId]/actions";
import { ShareButtons } from "@/components/share/share-buttons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MOMENT_POLICY } from "@/lib/plan";
import type { FeedMoment } from "@/lib/today-feed";
import { cn } from "@/lib/utils";
import { CommentForm, CommentList, useComments, type CommentsChange } from "./reactions";

/**
 * 기록 자세히 보기 시트: 사진(이전, 다음 버튼 - 넘기기 대신 누르기, DESIGN §9.1-5), 글, 댓글 목록과 남기기.
 * 댓글 지우기는 바로 사라지고 6초 동안 되돌릴 수 있다(토스트가 닫히면 실제로 지운다, DESIGN §9.1-7).
 */
export function MomentSheet({
  open,
  onClose,
  moment,
  startIndex,
  focusComment,
  spaceId,
  authors,
  myUserId,
  canModerate,
  onCommentsChange,
  onDelete,
  onEdited,
}: {
  open: boolean;
  onClose: () => void;
  moment: FeedMoment;
  startIndex: number;
  focusComment: boolean;
  spaceId: string;
  authors: Record<string, string>;
  myUserId: string;
  /** parent는 남의 댓글도 지울 수 있다 */
  canModerate: boolean;
  onCommentsChange: (change: CommentsChange) => void;
  /** 작성자 또는 parent만 */
  onDelete?: () => void;
  /** 작성자만: 글 고치기가 끝나면 고친 글을 받는다 */
  onEdited?: (body: string | null) => void;
}) {
  const t = useTranslations("moment");
  const tshare = useTranslations("share");
  const errors = useTranslations("errors");
  const left = useTranslations("privacy")("leftFamily");
  const format = useFormatter();
  const { toast } = useToast();
  const [index, setIndex] = useState(startIndex);
  const comments = useComments({
    spaceId,
    target: { type: "moment", momentId: moment.id },
    open,
    focus: focusComment,
    onChange: onCommentsChange,
  });
  const who = (id: string, name: string | null) => authors[id] ?? name ?? left;

  // 글 고치기: 시트 안에서 글 자리가 입력칸으로 바뀌고, 아래 행동은 [고친 글 저장]이 된다
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState<ErrorKey | null>(null);
  const [saving, startSaving] = useTransition();
  const isDiary = moment.kind === "diary";
  const startEdit = () => {
    setEditDraft(moment.body ?? "");
    setEditError(null);
    setEditing(true);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const next = editDraft.trim() || null;
    if (next === (moment.body ?? null)) {
      setEditing(false);
      return;
    }
    if (isDiary && !next) {
      setEditError("BODY_REQUIRED");
      return;
    }
    startSaving(async () => {
      const result = await updateMomentBody(spaceId, moment.id, next);
      if ("error" in result) {
        setEditError(result.error);
        return;
      }
      onEdited?.(result.body);
      setEditing(false);
      toast({ message: t("edited") });
    });
  };

  const media = moment.media[index];
  const total = moment.media.length;
  const editFooter = (
    <div className="flex gap-2">
      <Button onClick={() => setEditing(false)} disabled={saving}>
        {t("cancelEdit")}
      </Button>
      <Button
        type="submit"
        form={`${comments.id}-edit`}
        variant="primary"
        className="flex-1"
        disabled={saving}
        aria-busy={saving}
      >
        {t("save")}
      </Button>
    </div>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={total ? t("photoTitle", { n: index + 1, total }) : t("textTitle")}
      footer={editing ? editFooter : <CommentForm comments={comments} />}
    >
      {media ? (
        <figure className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-md bg-line">
            {media.kind === "video" ? (
              <video
                key={media.assetId}
                src={media.url}
                poster={media.thumbnailUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="max-h-[50dvh] w-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={media.assetId}
                src={media.url}
                alt={t("photoAlt", { n: index + 1, total })}
                className="max-h-[50dvh] w-full object-contain"
              />
            )}
          </div>
          {total > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                variant="text"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <Icon name="left" size="small" />
                {t("prev")}
              </Button>
              <span className="text-caption text-fg-muted tabular-nums">
                {index + 1} / {total}
              </span>
              <Button
                variant="text"
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
              >
                {t("next")}
                <Icon name="right" size="small" />
              </Button>
            </div>
          ) : null}
        </figure>
      ) : null}
      {editing ? (
        <form id={`${comments.id}-edit`} onSubmit={save} className={cn(media && "mt-3")}>
          <TextArea
            label={t("editLabel")}
            hint={isDiary ? t("editHintDiary") : t("editHintMedia")}
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            maxLength={MOMENT_POLICY.bodyMaxChars}
            error={editError ? errors(editError) : undefined}
            autoFocus
          />
        </form>
      ) : moment.body ? (
        <p className={cn("text-title-s whitespace-pre-line", media && "mt-3")}>{moment.body}</p>
      ) : null}
      <p className="mt-1 text-caption text-fg-muted">
        {t("byline", {
          who: who(moment.createdBy.id, moment.createdBy.name),
          when: format.dateTime(moment.takenAt, {
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        })}
      </p>

      {!editing && (onEdited || onDelete || canModerate) ? (
        <div className="-ml-2 flex flex-wrap gap-2">
          {canModerate ? (
            // 소식 전달(parent): 이름, 내용 없이 그 기록으로 가는 링크만(PRIVACY §3)
            <ShareButtons
              variant="inline"
              inlineLabel={tshare("momentLabel")}
              onNotice={(message) => toast({ message })}
              target={{
                title: tshare("momentTitle"),
                text: tshare("momentText"),
                button: tshare("openButton"),
                path: `/open/moment/${moment.id}`,
              }}
            />
          ) : null}
          {onEdited ? (
            <Button variant="text" onClick={startEdit}>
              <Icon name="pen" size="small" />
              {t("edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="text" onClick={onDelete}>
              {t("remove")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <CommentList
        comments={comments}
        authors={authors}
        myUserId={myUserId}
        canModerate={canModerate}
      />
    </Sheet>
  );
}
