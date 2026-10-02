"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteMoment, loadMoreMoments, setLike as setLikeAction } from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { MomentSheet, type CommentsChange } from "./moment-sheet";
import { useToday, type FeedProps } from "./today-state";
import { timeZone } from "@/i18n/config";
import {
  appendPage,
  dayDate,
  groupByDay,
  type FeedDay,
  type FeedMilestone,
  type FeedMoment,
} from "@/lib/today-feed";
import { cn } from "@/lib/utils";
import { motion, prefersReducedMotion } from "@/lib/design-tokens";
import { springCurve } from "@/lib/spring";

/**
 * 오늘(봄) 피드(DESIGN §9.2, §10.6 B안): 날짜가 앨범의 장 제목이고, 기록 하나 = 사진 묶음 + 한 줄 글 + 누가, 언제 +
 * 최근 댓글(인용선) + 반응. 마일스톤은 그 날 장의 맨 위 띠. 지난 기록은 버튼으로 더 불러온다(자동 무한 스크롤 없음).
 */
export function TodayFeed() {
  const t = useTranslations("today");
  const props = useToday();
  const { items, cursor } = props;
  const [loading, startLoading] = useTransition();
  const { toast } = useToast();
  const errors = useTranslations("errors");

  const days = groupByDay(
    items.filter((m) => !props.hidden.has(m.id)),
    props.milestones,
    { timeZone, hasMore: cursor !== null },
  );

  const more = () =>
    startLoading(async () => {
      if (!cursor) return;
      const result = await loadMoreMoments(props.spaceId, props.who, cursor);
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      props.setPage(appendPage(items, result.items), result.nextCursor);
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
  const subject = milestone.childId ? "child" : "pet";
  const value = (milestone.value ?? {}) as { value?: number; title?: string };
  // 프리셋 키(src/lib/milestones.ts)는 서버가 검증한 값이라 문구 키로 그대로 쓴다
  const kind = `${subject}.${milestone.kind}` as Parameters<typeof t>[0];
  const isFresh = useToday().fresh.has(milestone.id);
  const wrap = useRef<HTMLSpanElement>(null);
  // 방금 남긴 기록: 띠가 안착하고, "처음" 표시를 켠 기록이면 2초 안에 끝나는 반짝임(DESIGN §9.2, §11)
  useEffect(() => {
    const el = wrap.current;
    if (!isFresh || !el) return;
    const chip = el.firstElementChild as HTMLElement;
    settle([chip]);
    if (milestone.isFirst && !prefersReducedMotion()) return sparkle(el);
  }, [isFresh, milestone.isFirst]);
  return (
    <span ref={wrap} className="relative inline-block">
      <span className="inline-flex items-center gap-2 rounded-md bg-spring-pink py-2 pr-4 pl-3 text-ink">
        <Icon name="spark" size="small" />
        <span>
          <b className="font-bold">{milestone.subjectName}</b>{" "}
          {t.has(kind)
            ? t(kind, {
                value: value.value ?? "",
                title: value.title ?? "",
                first: String(milestone.isFirst),
              })
            : null}
        </span>
      </span>
    </span>
  );
}

function MomentCard({ moment, ...props }: { moment: FeedMoment } & FeedProps) {
  const t = useTranslations("today");
  const format = useFormatter();
  const { authors } = props;
  const today = useToday();
  const isFresh = today.fresh.has(moment.id);
  const ta = useTranslations("moment");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const canDelete = moment.createdBy.id === props.myUserId || props.canModerate;
  // 지우기: 바로 숨기고 6초 동안 되돌릴 수 있다. 토스트가 닫히면 실제로 지운다(DESIGN §9.1-7)
  const remove = () => {
    setSheet((s) => ({ ...s, open: false }));
    // 시트가 내려간 뒤에 숨긴다(카드와 함께 시트가 갑자기 사라지지 않게)
    setTimeout(
      () => today.setHidden(moment.id, true),
      prefersReducedMotion() ? motion["d-fast"] : motion["d-sheet"],
    );
    toast({
      message: ta("removed"),
      action: { label: ta("undo"), onAction: () => today.setHidden(moment.id, false) },
      onDismiss: async (reason) => {
        if (reason === "action") return;
        const result = await deleteMoment(props.spaceId, moment.id);
        if ("error" in result && result.error !== "ITEM_NOT_FOUND") {
          today.setHidden(moment.id, false);
          toast({ message: errors(result.error) });
        } else {
          today.dropMoment(moment.id);
        }
      },
    });
  };
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
      {moment.media.length ? (
        <Album media={moment.media} onOpen={(i) => open(i)} fresh={isFresh} />
      ) : null}
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
        onDelete={canDelete ? remove : undefined}
      />
    </article>
  );
}

/** 좋아요를 연달아 누를 때 마지막 상태를 보내기 전 기다리는 시간 */
const LIKE_SETTLE_MS = 500;

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
  // 서버가 확인한 상태, 사용자가 원하는 상태. 연달아 누르면 화면만 바로 바꾸고, 손을 멈춘 뒤 마지막 상태만 보낸다
  // (누를 때마다 요청하면 Workers CPU 한도에 걸린다 - 2026-10-02 스테이징에서 관측)
  const confirmed = useRef(like);
  const desired = useRef(like.on);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sending = useRef(false);

  const flush = useCallback(async () => {
    timer.current = null;
    if (sending.current) return;
    sending.current = true;
    try {
      // 보내는 사이에 또 바꿨으면 한 번 더 맞춘다
      while (desired.current !== confirmed.current.on) {
        const result = await setLikeAction(
          spaceId,
          { type: "moment", momentId: moment.id },
          desired.current,
        );
        if ("error" in result) {
          desired.current = confirmed.current.on;
          setLike(confirmed.current);
          toast({ message: errors(result.error) });
          return;
        }
        confirmed.current = { on: result.liked, count: result.likes };
      }
      setLike(confirmed.current);
    } finally {
      sending.current = false;
    }
  }, [spaceId, moment.id, toast, errors]);

  // 화면을 떠나기 전에 남은 것을 보낸다
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flush();
      }
    },
    [flush],
  );

  // 좋아요: 누름 피드백 + 상태 변화만(자주 쓰는 동작이라 축하 모션 없음, DESIGN §11)
  const onLike = () => {
    desired.current = !desired.current;
    const base = confirmed.current;
    const delta = (desired.current ? 1 : 0) - (base.on ? 1 : 0);
    setLike({ on: desired.current, count: base.count + delta });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), LIKE_SETTLE_MS);
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

function Album({
  media,
  onOpen,
  fresh,
}: {
  media: FeedMoment["media"];
  onOpen: (index: number) => void;
  fresh: boolean;
}) {
  const t = useTranslations("today");
  const grid = useRef<HTMLDivElement>(null);
  // 방금 올린 사진: 제자리에 안착(spring-settle, 50ms 간격). 감소 모션이면 페이드만
  useEffect(() => {
    if (!fresh || !grid.current) return;
    settle([...grid.current.children] as HTMLElement[]);
  }, [fresh]);
  const shown = media.slice(0, VISIBLE);
  const rest = media.length - shown.length;
  const wideFirst = shown.length % 2 === 1;
  return (
    <div ref={grid} className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
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
          {m.kind === "video" && !m.thumbnailUrl ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Icon name="play" />
            </span>
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

function settle(elements: HTMLElement[]) {
  if (prefersReducedMotion()) {
    for (const el of elements) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: motion["d-fast"],
        easing: "linear",
      });
    }
    return;
  }
  const spring = motion["spring-settle"];
  const curve = springCurve(spring);
  const easing = CSS.supports("animation-timing-function", curve.easing)
    ? curve.easing
    : motion["ease-out"];
  elements.forEach((el, i) =>
    el.animate(
      [
        {
          opacity: 0,
          transform: `translateY(${spring["from-y"]}px) scale(${spring["from-scale"]})`,
        },
        { opacity: 1, transform: "none" },
      ],
      { duration: curve.duration, easing, delay: i * motion.stagger, fill: "backwards" },
    ),
  );
}

/** 반짝임(Josh Comeau Sparkles): 50~450ms 간격으로 하나씩, 각 750ms, 전체 2초 안에 끝난다. 정리 함수를 돌려준다 */
function sparkle(host: HTMLElement) {
  const spec = motion.sparkle;
  const sizes = [12, 16, 20];
  const started = performance.now();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const spawn = () => {
    if (performance.now() - started > spec["total-max"] - spec.life) return;
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const star = document.createElement("span");
    star.className = "sparkle";
    star.setAttribute("aria-hidden", "true");
    Object.assign(star.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `calc(${Math.random() * 100}% - ${size / 2}px)`,
      top: `calc(${-20 + Math.random() * 140}% - ${size / 2}px)`,
    });
    star.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/></svg>';
    host.appendChild(star);
    timers.push(setTimeout(() => star.remove(), spec.life));
    timers.push(
      setTimeout(spawn, spec["gap-min"] + Math.random() * (spec["gap-max"] - spec["gap-min"])),
    );
  };
  spawn();
  return () => {
    timers.forEach(clearTimeout);
    host.querySelectorAll(".sparkle").forEach((n) => n.remove());
  };
}
