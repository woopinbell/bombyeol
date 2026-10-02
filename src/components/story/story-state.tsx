"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Narrator, StoryAsk, StoryCursor, StoryItem } from "@/lib/story-view";

export type StoryProps = {
  spaceId: string;
  /** 고른 화자(멤버 ID), 없으면 모두 */
  narratorId: string | null;
  initialItems: StoryItem[];
  initialCursor: StoryCursor | null;
  initialAsks: StoryAsk[];
  narrators: Narrator[];
  /** 나(멤버) */
  me: Narrator;
  /** 사용자 ID → 가족 안 호칭 */
  authors: Record<string, string>;
  todayKey: string;
};

type StoryState = StoryProps & {
  items: StoryItem[];
  cursor: StoryCursor | null;
  asks: StoryAsk[];
  setPage: (items: StoryItem[], cursor: StoryCursor | null) => void;
  /** 방금 남긴 이야기: 맨 위에 넣는다(지금 고른 화자와 맞을 때만). 답한 물어보기는 목록에서 뺀다 */
  addStory: (story: StoryItem, answeredAskId?: string) => void;
  replaceStory: (story: StoryItem) => void;
  /** 지우기를 누른 이야기, 거둔 물어보기: 되돌리기 토스트가 닫힐 때까지 숨겨 둔다 */
  hidden: ReadonlySet<string>;
  setHidden: (id: string, hide: boolean) => void;
  dropStory: (id: string) => void;
  addAsk: (ask: StoryAsk) => void;
  dropAsk: (id: string) => void;
  fresh: ReadonlySet<string>;
};

const StoryContext = createContext<StoryState | null>(null);

/** 이야기 탭 상태: 질문 카드, 답을 기다리는 질문, 이야기 모음이 함께 쓴다 */
export function StoryProvider({ children, ...props }: StoryProps & { children: ReactNode }) {
  const [items, setItems] = useState(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  const [asks, setAsks] = useState(props.initialAsks);
  // 서버가 화면을 새로 그려 보내면 그 첫 페이지와 물어보기를 받아들이되, 더 불러온 페이지는 잃지 않는다
  const [server, setServer] = useState({ items: props.initialItems, asks: props.initialAsks });
  if (server.items !== props.initialItems || server.asks !== props.initialAsks) {
    setServer({ items: props.initialItems, asks: props.initialAsks });
    const incoming = new Set(props.initialItems.map((s) => s.id));
    setItems((list) =>
      [...props.initialItems, ...list.filter((s) => !incoming.has(s.id))].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1),
      ),
    );
    setAsks(props.initialAsks);
  }
  const [hidden, setHiddenSet] = useState<ReadonlySet<string>>(new Set());
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const value = useMemo<StoryState>(
    () => ({
      ...props,
      items,
      cursor,
      asks,
      hidden,
      fresh,
      setPage: (next, nextCursor) => {
        setItems(next);
        setCursor(nextCursor);
      },
      addStory: (story, answeredAskId) => {
        if (answeredAskId) setAsks((list) => list.filter((a) => a.id !== answeredAskId));
        if (props.narratorId && story.narrator.memberId !== props.narratorId) return;
        setItems((list) => [story, ...list.filter((s) => s.id !== story.id)]);
        setFresh((f) => new Set(f).add(story.id));
      },
      replaceStory: (story) =>
        setItems((list) => list.map((s) => (s.id === story.id ? { ...s, ...story } : s))),
      setHidden: (id, hide) =>
        setHiddenSet((h) => {
          const next = new Set(h);
          if (hide) next.add(id);
          else next.delete(id);
          return next;
        }),
      dropStory: (id) => setItems((list) => list.filter((s) => s.id !== id)),
      addAsk: (ask) => setAsks((list) => [...list.filter((a) => a.id !== ask.id), ask]),
      dropAsk: (id) => setAsks((list) => list.filter((a) => a.id !== id)),
    }),
    // props는 서버가 매 렌더 새로 넘기므로 필요한 값만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cursor, asks, hidden, fresh, props.narratorId, props.authors],
  );
  return <StoryContext value={value}>{children}</StoryContext>;
}

export function useStory(): StoryState {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("StoryProvider is missing");
  return ctx;
}
