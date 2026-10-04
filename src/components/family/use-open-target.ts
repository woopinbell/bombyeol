"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";

/**
 * 알림으로 연 기록(`?open={id}`, push.openLink)을 찾아 펼친다: 그 카드를 화면 가운데로 옮기고 open을 한 번 부른다.
 * 그 뒤 주소에서 open을 지운다(새로고침, 뒤로 가기로 다시 열리지 않게 - 화면 데이터를 다시 받지 않도록 history만 바꾼다).
 * 지난 기록이라 첫 페이지에 없으면 아무것도 하지 않는다(그 탭만 열린 상태).
 */
export function useOpenTarget(id: string, ref: RefObject<HTMLElement | null>, open?: () => void) {
  const target = useSearchParams().get("open");
  const done = useRef(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    if (done.current || target !== id) return;
    done.current = true;
    const el = ref.current;
    el?.scrollIntoView({ block: "center" });
    if (openRef.current) openRef.current();
    else el?.focus({ preventScroll: true });
    const url = new URL(window.location.href);
    url.searchParams.delete("open");
    window.history.replaceState(window.history.state, "", url);
  }, [id, target, ref]);
}
