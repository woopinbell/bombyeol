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
  fresh: ReadonlySet<string>;
};

const TodayContext = createContext<TodayState | null>(null);

/** 오늘 탭의 피드 상태: 피드와 아래 고정 행동(올리기)이 함께 쓴다 */
export function TodayProvider({ children, ...props }: FeedProps & { children: ReactNode }) {
  const [items, setItems] = useState(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const value = useMemo<TodayState>(
    () => ({
      ...props,
      items,
      cursor,
      fresh,
      setPage: (next, nextCursor) => {
        setItems(next);
        setCursor(nextCursor);
      },
      addMoment: (moment) => {
        const who = props.who;
        const visible =
          who.type === "all" ||
          (who.type === "child" && moment.childId === who.childId) ||
          (who.type === "pet" && moment.petId === who.petId);
        if (!visible) return;
        setItems((list) => [moment, ...list.filter((m) => m.id !== moment.id)]);
        setFresh((f) => new Set(f).add(moment.id));
      },
    }),
    // props는 서버가 매 렌더 새로 넘기므로 필요한 값만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cursor, fresh, props.who, props.milestones, props.authors],
  );
  return <TodayContext value={value}>{children}</TodayContext>;
}

export function useToday(): TodayState {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error("TodayProvider is missing");
  return ctx;
}
