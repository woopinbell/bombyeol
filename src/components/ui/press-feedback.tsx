"use client";

import { useEffect } from "react";

/**
 * 누름 피드백(DESIGN §11, SEED): data-press 요소를 누르는 동안 세로 2px만큼 줄인다.
 * 배율 = (b − 2) / b, b = max(높이, 폭 ÷ 4, 24). 감소 모션이면 CSS가 변형을 끈다.
 */
export function PressFeedback() {
  useEffect(() => {
    const down = (event: PointerEvent) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-press]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const basis = Math.max(r.height, r.width / 4, 24);
      el.style.setProperty("--ps", ((basis - 2) / basis).toFixed(4));
      el.dataset.pressed = "";
      const up = () => {
        delete el.dataset.pressed;
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
      };
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
    };
    addEventListener("pointerdown", down);
    return () => removeEventListener("pointerdown", down);
  }, []);
  return null;
}
