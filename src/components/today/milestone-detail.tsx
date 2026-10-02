"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { FeedMilestone } from "@/lib/today-feed";
import {
  CommentForm,
  CommentList,
  LikeButton,
  useComments,
  useLike,
  type CommentsChange,
  type LikeState,
} from "./reactions";

/** 성장 기록 한 줄(대상 이름 + 순간). 띠와 자세히 보기 시트가 함께 쓴다 */
export function MilestoneSentence({ milestone }: { milestone: FeedMilestone }) {
  const t = useTranslations("milestone");
  const subject = milestone.childId ? "child" : "pet";
  const value = (milestone.value ?? {}) as { value?: number; title?: string };
  // 프리셋 키(src/lib/milestones.ts)는 서버가 검증한 값이라 문구 키로 그대로 쓴다
  const kind = `${subject}.${milestone.kind}` as Parameters<typeof t>[0];
  return (
    <>
      <b className="font-bold">{milestone.subjectName}</b>{" "}
      {t.has(kind)
        ? t(kind, {
            value: value.value ?? "",
            title: value.title ?? "",
            first: String(milestone.isFirst),
          })
        : null}
    </>
  );
}

/**
 * 성장 기록 자세히 보기 시트: 한 줄, 날짜, 남긴 사람, 메모, 좋아요, 댓글. 지우기는 남긴 사람 또는 parent
 * (바로 사라지고 6초 동안 되돌리기, DESIGN §9.1-7).
 */
export function MilestoneDetail({
  open,
  onClose,
  milestone,
  spaceId,
  authors,
  myUserId,
  canModerate,
  like: initialLike,
  onLikeChange,
  onCommentsChange,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  milestone: FeedMilestone;
  spaceId: string;
  authors: Record<string, string>;
  myUserId: string;
  canModerate: boolean;
  like: LikeState;
  onLikeChange: (like: LikeState) => void;
  onCommentsChange: (change: CommentsChange) => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("milestoneDetail");
  const format = useFormatter();
  const target = { type: "milestone", milestoneId: milestone.id } as const;
  const { like, toggle } = useLike(spaceId, target, initialLike, onLikeChange);
  const comments = useComments({
    spaceId,
    target,
    open,
    focus: false,
    onChange: onCommentsChange,
  });
  const note = (milestone.value as { note?: string } | null)?.note;
  const who = authors[milestone.createdBy.id] ?? milestone.createdBy.name ?? "";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={<CommentForm comments={comments} />}
    >
      <p className="text-title font-heavy">
        <MilestoneSentence milestone={milestone} />
      </p>
      <p className="mt-1 text-caption text-fg-muted">
        {t("byline", {
          who,
          // 기록일은 날짜만 의미가 있다(UTC 자정으로 저장)
          when: format.dateTime(milestone.recordedAt, {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })}
      </p>
      {note ? <p className="mt-3 whitespace-pre-line">{note}</p> : null}
      <div className="mt-4 flex gap-2">
        <LikeButton like={like} onClick={toggle} />
      </div>
      {onDelete ? (
        <div className="mt-2 -ml-2 flex flex-wrap gap-2">
          <Button variant="text" onClick={onDelete}>
            {t("remove")}
          </Button>
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
