"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  addComment,
  deleteComment,
  listComments,
  updateMomentBody,
} from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MOMENT_POLICY } from "@/lib/plan";
import type { FeedComment, FeedMoment } from "@/lib/today-feed";
import { cn } from "@/lib/utils";

export type CommentsChange = { count: number; latest: FeedComment | null };

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
  const errors = useTranslations("errors");
  const format = useFormatter();
  const { toast } = useToast();
  const [index, setIndex] = useState(startIndex);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // 방금 남긴 댓글만 등장 모션(불러온 목록은 그대로)
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const [sending, startSending] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const hintId = useId();

  const who = (id: string, name: string | null) => authors[id] ?? name ?? "";

  // 열릴 때 댓글을 불러온다(피드에는 최근 하나만 있다)
  useEffect(() => {
    if (!open) return;
    let alive = true;
    listComments(spaceId, moment.id).then((result) => {
      if (!alive) return;
      if ("error" in result) setLoadError(true);
      else setComments(result.items);
    });
    if (focusComment) setTimeout(() => input.current?.focus(), 50);
    return () => {
      alive = false;
    };
  }, [open, spaceId, moment.id, focusComment]);

  const visible = (comments ?? []).filter((c) => !hidden.has(c.id));
  const report = (next: FeedComment[]) =>
    onCommentsChange({ count: next.length, latest: next.at(-1) ?? null });

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) {
      setHint(t("commentEmpty"));
      input.current?.focus();
      return;
    }
    setHint("");
    startSending(async () => {
      const result = await addComment(spaceId, moment.id, body);
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      const next = [...visible, result];
      setComments((c) => [...(c ?? []), result]);
      setFresh((f) => new Set(f).add(result.id));
      setDraft("");
      report(next);
      toast({ message: t("commented") });
      requestAnimationFrame(() =>
        list.current?.lastElementChild?.scrollIntoView({ block: "nearest" }),
      );
    });
  };

  const remove = (comment: FeedComment) => {
    setHidden((h) => new Set(h).add(comment.id));
    report(visible.filter((c) => c.id !== comment.id));
    toast({
      message: t("commentRemoved"),
      action: {
        label: t("undo"),
        onAction: () => {
          setHidden((h) => {
            const next = new Set(h);
            next.delete(comment.id);
            return next;
          });
          report(visible);
        },
      },
      onDismiss: async (reason) => {
        if (reason === "action") return;
        const result = await deleteComment(spaceId, comment.id);
        if ("error" in result) {
          setHidden((h) => {
            const next = new Set(h);
            next.delete(comment.id);
            return next;
          });
          toast({ message: errors(result.error) });
        } else {
          setComments((c) => (c ?? []).filter((x) => x.id !== comment.id));
        }
      },
    });
  };

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
        form={`${hintId}-edit`}
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
      footer={
        editing ? (
          editFooter
        ) : (
          <form onSubmit={send} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor={`${hintId}-input`}>
                {t("commentLabel")}
              </label>
              <input
                id={`${hintId}-input`}
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                enterKeyHint="send"
                placeholder={t("commentPlaceholder")}
                aria-describedby={hint ? hintId : undefined}
                className="min-h-(--touch) min-w-0 flex-1 rounded-md border-(length:--bw) border-line-strong bg-transparent px-4 text-fg placeholder:text-fg-muted focus:border-(length:--bw-sel) focus:border-fg focus:outline-none"
              />
              <Button type="submit" variant="primary" disabled={sending} aria-busy={sending}>
                {t("send")}
              </Button>
            </div>
            <p id={hintId} aria-live="polite" className="text-caption font-bold empty:hidden">
              {hint}
            </p>
          </form>
        )
      }
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
        <form id={`${hintId}-edit`} onSubmit={save} className={cn(media && "mt-3")}>
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

      {!editing && (onEdited || onDelete) ? (
        <div className="-ml-2 flex flex-wrap gap-2">
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

      <h3 className="mt-6 mb-2 font-bold">{t("comments", { count: visible.length })}</h3>
      {loadError ? (
        <p className="text-fg-muted">{errors("UNKNOWN")}</p>
      ) : comments === null ? (
        <p className="text-fg-muted">{t("loading")}</p>
      ) : visible.length === 0 ? (
        <p className="text-fg-muted">{t("noComments")}</p>
      ) : (
        <ol ref={list} className="flex flex-col gap-3 pb-2">
          {visible.map((c) => (
            <li
              key={c.id}
              className={cn("flex items-start gap-2", fresh.has(c.id) && "comment-in")}
            >
              <p className="flex-1">
                <b className="font-bold">{who(c.createdBy.id, c.createdBy.name)}</b> {c.body}{" "}
                <span className="text-caption text-fg-muted">
                  {format.relativeTime(c.createdAt, new Date())}
                </span>
              </p>
              {c.createdBy.id === myUserId || canModerate ? (
                <Button variant="text" className="-my-2 -mr-2" onClick={() => remove(c)}>
                  {t("removeComment")}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}
