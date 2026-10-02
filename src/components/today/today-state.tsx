"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FeedCursor, FeedMilestone, FeedMoment, Who } from "@/lib/today-feed";

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

type TodayState = FeedProps & {
  items: FeedMoment[];
  cursor: FeedCursor | null;
  setPage: (items: FeedMoment[], cursor: FeedCursor | null) => void;
  /** 방금 올린 기록: 맨 위에 넣고 안착 모션을 준다(지금 고른 대상과 맞을 때만 보인다) */
  addMoment: (moment: FeedMoment) => void;
  /** 방금 남긴 마일스톤: 그 날 장에 띠로 넣는다("처음" 기록이면 반짝임) */
  addMilestone: (milestone: FeedMilestone) => void;
  /** 방금 더한 기록, 마일스톤 ID */
  fresh: ReadonlySet<string>;
};

const TodayContext = createContext<TodayState | null>(null);

/** 오늘 탭의 피드 상태: 피드와 아래 고정 행동(올리기)이 함께 쓴다 */
export function TodayProvider({ children, ...props }: FeedProps & { children: ReactNode }) {
  const [items, setItems] = useState(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  const [milestones, setMilestones] = useState(props.milestones);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const matches = (subject: { childId: string | null; petId: string | null }) => {
    const who = props.who;
    return (
      who.type === "all" ||
      (who.type === "child" && subject.childId === who.childId) ||
      (who.type === "pet" && subject.petId === who.petId)
    );
  };
  const value = useMemo<TodayState>(
    () => ({
      ...props,
      milestones,
      items,
      cursor,
      fresh,
      setPage: (next, nextCursor) => {
        setItems(next);
        setCursor(nextCursor);
      },
      addMoment: (moment) => {
        if (!matches(moment)) return;
        setItems((list) => [moment, ...list.filter((m) => m.id !== moment.id)]);
        setFresh((f) => new Set(f).add(moment.id));
      },
      addMilestone: (milestone) => {
        if (!matches(milestone)) return;
        setMilestones((list) => [milestone, ...list.filter((m) => m.id !== milestone.id)]);
        setFresh((f) => new Set(f).add(milestone.id));
      },
    }),
    // props는 서버가 매 렌더 새로 넘기므로 필요한 값만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cursor, milestones, fresh, props.who, props.authors],
  );
  return <TodayContext value={value}>{children}</TodayContext>;
}

export function useToday(): TodayState {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error("TodayProvider is missing");
  return ctx;
}
