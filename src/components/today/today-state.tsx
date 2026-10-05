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
  /** 빈 오늘에 보일 어르신 초대 경로(부모이고 아직 어르신이 없을 때만) */
  inviteHref?: string;
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
  /** 지우기를 누른 기록, 성장 기록: 되돌리기 토스트가 닫힐 때까지 숨겨 둔다 */
  hidden: ReadonlySet<string>;
  setHidden: (id: string, hide: boolean) => void;
  dropMoment: (id: string) => void;
  dropMilestone: (id: string) => void;
  /** 고친 성장 기록을 반영한다 */
  patchMilestone: (id: string, patch: Partial<FeedMilestone>) => void;
  /** 고친 글을 피드에 반영한다 */
  setMomentBody: (id: string, body: string | null) => void;
};

const TodayContext = createContext<TodayState | null>(null);

/** 오늘 탭의 피드 상태: 피드와 아래 고정 행동(올리기)이 함께 쓴다 */
export function TodayProvider({ children, ...props }: FeedProps & { children: ReactNode }) {
  const [items, setItems] = useState(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  // 서버가 화면을 새로 그려 보내면(새로 고침, 서버 액션 뒤) 그 첫 페이지를 받아들이되, 방금 더한 기록과
  // 더 불러온 페이지는 잃지 않는다 - 올린 사진이 화면에서 사라졌다가 나중에 보이는 일이 없게.
  const [serverItems, setServerItems] = useState(props.initialItems);
  if (serverItems !== props.initialItems) {
    setServerItems(props.initialItems);
    const incoming = new Set(props.initialItems.map((m) => m.id));
    setItems((list) => {
      const kept = list.filter((m) => !incoming.has(m.id));
      return [...props.initialItems, ...kept].sort(
        (a, b) => b.takenAt.getTime() - a.takenAt.getTime() || (a.id < b.id ? 1 : -1),
      );
    });
  }
  const [serverMilestones, setServerMilestones] = useState(props.milestones);
  const [milestones, setMilestones] = useState(props.milestones);
  if (serverMilestones !== props.milestones) {
    setServerMilestones(props.milestones);
    const incoming = new Set(props.milestones.map((m) => m.id));
    setMilestones((list) => [...props.milestones, ...list.filter((m) => !incoming.has(m.id))]);
  }
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [hidden, setHiddenSet] = useState<ReadonlySet<string>>(new Set());
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
      hidden,
      setHidden: (id, hide) =>
        setHiddenSet((h) => {
          const next = new Set(h);
          if (hide) next.add(id);
          else next.delete(id);
          return next;
        }),
      dropMoment: (id) => setItems((list) => list.filter((m) => m.id !== id)),
      dropMilestone: (id) => setMilestones((list) => list.filter((m) => m.id !== id)),
      patchMilestone: (id, patch) =>
        setMilestones((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m))),
      setMomentBody: (id, body) =>
        setItems((list) => list.map((m) => (m.id === id ? { ...m, body } : m))),
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
    [items, cursor, milestones, fresh, hidden, props.who, props.authors],
  );
  return <TodayContext value={value}>{children}</TodayContext>;
}

export function useToday(): TodayState {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error("TodayProvider is missing");
  return ctx;
}
