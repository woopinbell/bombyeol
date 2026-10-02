"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import {
  addComment,
  deleteComment,
  listComments,
  setLike as setLikeAction,
} from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { FeedComment } from "@/lib/today-feed";
import { cn } from "@/lib/utils";

/** 좋아요, 댓글을 남기는 오늘 기록: 사진, 일기(Moment)와 성장 기록(Milestone) */
export type TodayTarget =
  { type: "moment"; momentId: string } | { type: "milestone"; milestoneId: string };

const targetKey = (target: TodayTarget) =>
  target.type === "moment" ? `moment:${target.momentId}` : `milestone:${target.milestoneId}`;

/** 좋아요를 연달아 누를 때 마지막 상태를 보내기 전 기다리는 시간 */
const LIKE_SETTLE_MS = 500;

export type LikeState = { on: boolean; count: number };

/**
 * 좋아요: 누르면 화면은 바로 바뀌고, 손을 멈춘 뒤 마지막 상태만 보낸다(누를 때마다 요청하면
 * Workers CPU 한도에 걸린다 - 2026-10-02 스테이징에서 관측). 화면을 떠나기 전에 남은 것을 보낸다.
 */
export function useLike(
  spaceId: string,
  target: TodayTarget,
  initial: LikeState,
  onSettled?: (like: LikeState) => void,
) {
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const [like, setLike] = useState(initial);
  // 서버가 확인한 상태, 사용자가 원하는 상태
  const confirmed = useRef(initial);
  const desired = useRef(initial.on);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sending = useRef(false);
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });
  const key = targetKey(target);

  const flush = useCallback(async () => {
    timer.current = null;
    if (sending.current) return;
    sending.current = true;
    try {
      // 보내는 사이에 또 바꿨으면 한 번 더 맞춘다
      while (desired.current !== confirmed.current.on) {
        const result = await setLikeAction(spaceId, target, desired.current);
        if ("error" in result) {
          desired.current = confirmed.current.on;
          setLike(confirmed.current);
          toast({ message: errors(result.error) });
          return;
        }
        confirmed.current = { on: result.liked, count: result.likes };
      }
      setLike(confirmed.current);
      settled.current?.(confirmed.current);
    } finally {
      sending.current = false;
    }
    // key가 같으면 같은 대상이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, key, toast, errors]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flush();
      }
    },
    [flush],
  );

  // 누름 피드백 + 상태 변화만(자주 쓰는 동작이라 축하 모션 없음, DESIGN §11)
  const toggle = () => {
    desired.current = !desired.current;
    const base = confirmed.current;
    const delta = (desired.current ? 1 : 0) - (base.on ? 1 : 0);
    setLike({ on: desired.current, count: base.count + delta });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), LIKE_SETTLE_MS);
  };

  return { like, toggle };
}

export function LikeButton({ like, onClick }: { like: LikeState; onClick: () => void }) {
  const t = useTranslations("today");
  return (
    <Button aria-pressed={like.on} onClick={onClick} className={cn(like.on && "border-fg")}>
      <Icon name={like.on ? "heartOn" : "heart"} size="small" />
      <span className="tabular-nums">{t("like", { count: like.count })}</span>
    </Button>
  );
}

export type CommentsChange = { count: number; latest: FeedComment | null };

/**
 * 시트 안 댓글: 열릴 때 불러오고(피드에는 최근 하나만 있다), 남기기, 지우기(바로 사라지고 6초 동안 되돌리기,
 * 토스트가 닫히면 실제로 지운다, DESIGN §9.1-7). 바뀐 수와 최근 댓글은 onChange로 알린다.
 */
export function useComments({
  spaceId,
  target,
  open,
  focus,
  onChange,
}: {
  spaceId: string;
  target: TodayTarget;
  open: boolean;
  focus: boolean;
  onChange?: (change: CommentsChange) => void;
}) {
  const t = useTranslations("moment");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // 방금 남긴 댓글만 등장 모션(불러온 목록은 그대로)
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const [sending, startSending] = useTransition();
  // 입력칸과 목록은 id로 찾는다(이 값을 그리는 쪽 컴포넌트가 따로 있다)
  const id = useId();
  const focusInput = () => document.getElementById(`${id}-input`)?.focus();
  const key = targetKey(target);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listComments(spaceId, target).then((result) => {
      if (!alive) return;
      if ("error" in result) setLoadError(true);
      else setComments(result.items);
    });
    if (focus) setTimeout(focusInput, 50);
    return () => {
      alive = false;
    };
    // key가 같으면 같은 대상이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spaceId, key, focus]);

  const visible = (comments ?? []).filter((c) => !hidden.has(c.id));
  const report = (next: FeedComment[]) =>
    onChange?.({ count: next.length, latest: next.at(-1) ?? null });
  const unhide = (commentId: string) =>
    setHidden((h) => {
      const next = new Set(h);
      next.delete(commentId);
      return next;
    });

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) {
      setHint(t("commentEmpty"));
      focusInput();
      return;
    }
    setHint("");
    startSending(async () => {
      const result = await addComment(spaceId, target, body);
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      setComments((c) => [...(c ?? []), result]);
      setFresh((f) => new Set(f).add(result.id));
      setDraft("");
      report([...visible, result]);
      toast({ message: t("commented") });
      requestAnimationFrame(() =>
        document
          .getElementById(`${id}-list`)
          ?.lastElementChild?.scrollIntoView({ block: "nearest" }),
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
          unhide(comment.id);
          report(visible);
        },
      },
      onDismiss: async (reason) => {
        if (reason === "action") return;
        const result = await deleteComment(spaceId, comment.id);
        if ("error" in result) {
          unhide(comment.id);
          toast({ message: errors(result.error) });
        } else {
          setComments((c) => (c ?? []).filter((x) => x.id !== comment.id));
        }
      },
    });
  };

  return {
    id,
    comments,
    visible,
    fresh,
    loadError,
    draft,
    setDraft,
    hint,
    sending,
    send,
    remove,
  };
}

type Comments = ReturnType<typeof useComments>;

/** 시트 아래에 붙는 댓글 입력 */
export function CommentForm({ comments: c }: { comments: Comments }) {
  const t = useTranslations("moment");
  const hintId = `${c.id}-hint`;
  return (
    <form onSubmit={c.send} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`${c.id}-input`}>
          {t("commentLabel")}
        </label>
        <input
          id={`${c.id}-input`}
          value={c.draft}
          onChange={(e) => c.setDraft(e.target.value)}
          maxLength={500}
          enterKeyHint="send"
          placeholder={t("commentPlaceholder")}
          aria-describedby={c.hint ? hintId : undefined}
          className="min-h-(--touch) min-w-0 flex-1 rounded-md border-(length:--bw) border-line-strong bg-transparent px-4 text-fg placeholder:text-fg-muted focus:border-(length:--bw-sel) focus:border-fg focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={c.sending} aria-busy={c.sending}>
          {t("send")}
        </Button>
      </div>
      <p id={hintId} aria-live="polite" className="text-caption font-bold empty:hidden">
        {c.hint}
      </p>
    </form>
  );
}

/** 댓글 목록(오래된 것부터). 내 댓글이나 parent는 지울 수 있다 */
export function CommentList({
  comments: c,
  authors,
  myUserId,
  canModerate,
}: {
  comments: Comments;
  authors: Record<string, string>;
  myUserId: string;
  canModerate: boolean;
}) {
  const t = useTranslations("moment");
  const errors = useTranslations("errors");
  const format = useFormatter();
  const who = (id: string, name: string | null) => authors[id] ?? name ?? "";
  return (
    <>
      <h3 className="mt-6 mb-2 font-bold">{t("comments", { count: c.visible.length })}</h3>
      {c.loadError ? (
        <p className="text-fg-muted">{errors("UNKNOWN")}</p>
      ) : c.comments === null ? (
        <p className="text-fg-muted">{t("loading")}</p>
      ) : c.visible.length === 0 ? (
        <p className="text-fg-muted">{t("noComments")}</p>
      ) : (
        <ol id={`${c.id}-list`} className="flex flex-col gap-3 pb-2">
          {c.visible.map((comment) => (
            <li
              key={comment.id}
              className={cn("flex items-start gap-2", c.fresh.has(comment.id) && "comment-in")}
            >
              <p className="flex-1">
                <b className="font-bold">{who(comment.createdBy.id, comment.createdBy.name)}</b>{" "}
                {comment.body}{" "}
                <span className="text-caption text-fg-muted">
                  {format.relativeTime(comment.createdAt, new Date())}
                </span>
              </p>
              {comment.createdBy.id === myUserId || canModerate ? (
                <Button variant="text" className="-my-2 -mr-2" onClick={() => c.remove(comment)}>
                  {t("removeComment")}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
