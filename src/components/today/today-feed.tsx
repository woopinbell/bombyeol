"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { loadMoreMoments, toggleLike } from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { MomentSheet, type CommentsChange } from "./moment-sheet";
import { timeZone } from "@/i18n/config";
import {
  appendPage,
  dayDate,
  groupByDay,
  type FeedCursor,
  type FeedDay,
  type FeedMilestone,
  type FeedMoment,
  type Who,
} from "@/lib/today-feed";
import { cn } from "@/lib/utils";

export type FeedProps = {
  spaceId: string;
  who: Who;
  initialItems: FeedMoment[];
  initialCursor: FeedCursor | null;
  milestones: FeedMilestone[];
  /** 사용자 ID → 가족 안 호칭 */
  authors: Record<string, string>;
  /** 서버가 정한 오늘(자정 무렵 서버, 브라우저 렌더 차이 방지) */
  todayKey: string;
  emptyName?: string;
  myUserId: string;
  /** parent: 남의 댓글도 지울 수 있다 */
  canModerate: boolean;
};

/**
 * 오늘(봄) 피드(DESIGN §9.2, §10.6 B안): 날짜가 앨범의 장 제목이고, 기록 하나 = 사진 묶음 + 한 줄 글 + 누가, 언제 +
 * 최근 댓글(인용선) + 반응. 마일스톤은 그 날 장의 맨 위 띠. 지난 기록은 버튼으로 더 불러온다(자동 무한 스크롤 없음).
 */
export function TodayFeed(props: FeedProps) {
  const t = useTranslations("today");
  const [items, setItems] = useState(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  const [loading, startLoading] = useTransition();
  const { toast } = useToast();
  const errors = useTranslations("errors");

  const days = groupByDay(items, props.milestones, { timeZone, hasMore: cursor !== null });

  const more = () =>
    startLoading(async () => {
      if (!cursor) return;
      const result = await loadMoreMoments(props.spaceId, props.who, cursor);
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      setItems((list) => appendPage(list, result.items));
      setCursor(result.nextCursor);
    });

  if (days.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 pb-12">
        <h2 className="text-title font-heavy">
          {props.emptyName ? t("emptyWhoTitle", { name: props.emptyName }) : t("emptyTitle")}
        </h2>
        <p className="text-title-s">{t("emptyLead")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {days.map((day) => (
        <DayChapter key={day.key} day={day} {...props} />
      ))}
      {cursor ? (
        <Button className="mt-8" block onClick={more} disabled={loading} aria-busy={loading}>
          {loading ? t("loading") : t("more")}
        </Button>
      ) : null}
    </div>
  );
}

function DayChapter({ day, todayKey, ...props }: { day: FeedDay } & FeedProps) {
  const t = useTranslations("today");
  const format = useFormatter();
  const date = dayDate(day.key);
  const sameYear = day.key.slice(0, 4) === todayKey.slice(0, 4);
  const photos = day.moments.reduce((n, m) => n + m.media.length, 0);
  return (
    <section aria-labelledby={`day-${day.key}`} className="mt-8 first:mt-5">
      <h2 id={`day-${day.key}`} className="mb-3 flex items-baseline gap-2">
        <span className="text-title font-heavy tabular-nums">
          {format.dateTime(date, {
            timeZone: "UTC",
            year: sameYear ? undefined : "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span className="text-caption text-fg-muted">
          {format.dateTime(date, { timeZone: "UTC", weekday: "long" })}
        </span>
        {day.key === todayKey ? <span className="text-caption font-bold">{t("today")}</span> : null}
        {photos ? (
          <span className="ml-auto text-caption text-fg-muted tabular-nums">
            {t("photos", { count: photos })}
          </span>
        ) : null}
      </h2>
      {day.milestones.length ? (
        <ul className="mb-4 flex flex-wrap gap-2">
          {day.milestones.map((m) => (
            <li key={m.id}>
              <MilestoneStrip milestone={m} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-8">
        {day.moments.map((m) => (
          <MomentCard key={m.id} moment={m} {...props} todayKey={todayKey} />
        ))}
      </div>
    </section>
  );
}

export function MilestoneStrip({ milestone }: { milestone: FeedMilestone }) {
  const t = useTranslations("milestone");
  const value = (milestone.value ?? {}) as { value?: number; title?: string };
  // 프리셋 키(src/lib/milestones.ts)는 서버가 검증한 값이라 문구 키로 그대로 쓴다
  const kind = `${milestone.childId ? "child" : "pet"}.${milestone.kind}` as Parameters<
    typeof t
  >[0];
  return (
    <p className="inline-flex items-center gap-2 rounded-md bg-spring-pink py-2 pr-4 pl-3 text-ink">
      <Icon name="spark" size="small" />
      <span>
        <b className="font-bold">{milestone.subjectName}</b>{" "}
        {t.has(kind) ? t(kind, { value: value.value ?? "", title: value.title ?? "" }) : null}
      </span>
    </p>
  );
}

function MomentCard({ moment, ...props }: { moment: FeedMoment } & FeedProps) {
  const t = useTranslations("today");
  const format = useFormatter();
  const { authors } = props;
  const who = authors[moment.createdBy.id] ?? moment.createdBy.name ?? "";
  const time = format.dateTime(moment.takenAt, { hour: "numeric", minute: "2-digit" });
  const [comments, setComments] = useState<CommentsChange>({
    count: moment.reactions.comments,
    latest: moment.latestComment,
  });
  // 열 때마다 seq를 올려 시트 안 상태(사진 위치, 입력)를 새로 시작한다. 닫는 동안은 같은 시트가 남아 내려간다
  const [sheet, setSheet] = useState({ open: false, index: 0, focusComment: false, seq: 0 });
  const open = (index: number, focusComment = false) =>
    setSheet((s) => ({ open: true, index, focusComment, seq: s.seq + 1 }));
  const comment = comments.latest;
  return (
    <article className="flex flex-col">
      {moment.media.length ? <Album media={moment.media} onOpen={(i) => open(i)} /> : null}
      {moment.kind === "diary" ? (
        <p className="mb-1 text-caption font-bold text-fg-muted">{t("diaryBy", { who })}</p>
      ) : null}
      <p className={cn(moment.media.length && "mt-3")}>
        {moment.body ? <>{moment.body} </> : null}
        <span className="text-caption whitespace-nowrap text-fg-muted">
          {moment.kind === "diary" ? time : t("byline", { who, time })}
        </span>
      </p>
      {comment ? (
        <p className="mt-3 border-l-(length:--bw-sel) border-line pl-3">
          <b className="font-bold">{authors[comment.createdBy.id] ?? comment.createdBy.name}</b>{" "}
          {comment.body}
        </p>
      ) : null}
      <Reactions
        moment={moment}
        spaceId={props.spaceId}
        comments={comments.count}
        onComments={() => open(0, true)}
      />
      <MomentSheet
        key={sheet.seq}
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        moment={moment}
        startIndex={sheet.index}
        focusComment={sheet.focusComment}
        spaceId={props.spaceId}
        authors={authors}
        myUserId={props.myUserId}
        canModerate={props.canModerate}
        onCommentsChange={setComments}
      />
    </article>
  );
}

function Reactions({
  moment,
  spaceId,
  comments,
  onComments,
}: {
  moment: FeedMoment;
  spaceId: string;
  comments: number;
  onComments: () => void;
}) {
  const t = useTranslations("today");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const [like, setLike] = useState({
    on: moment.reactions.likedByMe,
    count: moment.reactions.likes,
  });
  const [, startTransition] = useTransition();

  // 좋아요: 누름 피드백 + 상태 변화만(자주 쓰는 동작이라 축하 모션 없음, DESIGN §11)
  const onLike = () => {
    const before = like;
    setLike({ on: !before.on, count: before.count + (before.on ? -1 : 1) });
    startTransition(async () => {
      const result = await toggleLike(spaceId, { type: "moment", momentId: moment.id });
      if ("error" in result) {
        setLike(before);
        toast({ message: errors(result.error) });
      } else {
        setLike({ on: result.liked, count: result.likes });
      }
    });
  };

  return (
    <div className="mt-3 flex gap-2">
      <Button aria-pressed={like.on} onClick={onLike} className={cn(like.on && "border-fg")}>
        <Icon name={like.on ? "heartOn" : "heart"} size="small" />
        <span className="tabular-nums">{t("like", { count: like.count })}</span>
      </Button>
      <Button onClick={onComments}>
        <Icon name="talk" size="small" />
        <span className="tabular-nums">{t("comment", { count: comments })}</span>
      </Button>
    </div>
  );
}

/**
 * 사진 묶음(앨범 한 장처럼 바깥 모서리만 둥글게, 사이 4px). 홀수면 첫 장을 가로로 넓게, 최대 5칸까지 보이고
 * 나머지는 마지막 칸에 "N장 더"로.
 */
const VISIBLE = 5;

function Album({ media, onOpen }: { media: FeedMoment["media"]; onOpen: (index: number) => void }) {
  const t = useTranslations("today");
  const shown = media.slice(0, VISIBLE);
  const rest = media.length - shown.length;
  const wideFirst = shown.length % 2 === 1;
  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
      {shown.map((m, i) => (
        <button
          type="button"
          key={m.assetId}
          onClick={() => onOpen(i)}
          data-press=""
          className={cn(
            "press relative block overflow-hidden bg-line",
            wideFirst && i === 0
              ? shown.length === 1
                ? "col-span-2 aspect-4/3"
                : "col-span-2 aspect-video"
              : "aspect-square",
          )}
        >
          {m.kind === "image" || m.thumbnailUrl ? (
            // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.kind === "image" ? (m.thumbnailUrl ?? m.url) : m.thumbnailUrl!}
              alt={t("photoAlt", { n: i + 1, total: media.length })}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : null}
          {m.kind === "video" ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-sm bg-strong px-2 text-caption font-bold text-on-strong">
              <Icon name="play" size="small" />
              {t("video")}
            </span>
          ) : null}
          {rest > 0 && i === shown.length - 1 ? (
            <span
              data-surface="night"
              className="absolute inset-0 flex items-center justify-center bg-bg/70 text-title font-heavy text-fg"
            >
              {t("rest", { count: rest })}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
