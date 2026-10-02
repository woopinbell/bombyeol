import tokens from "@/design/tokens.json";

/**
 * 디자인 토큰 v1(DESIGN.md §12) 중 JS에서 쓰는 값. CSS 값은 src/app/tokens.css가 같은 원본에서 온다.
 * 스프링·끌기 상수는 CSS로 표현할 수 없어 여기서만 쓴다.
 */
export const designTokens = tokens;
export const palette = tokens.palette;
export const motion = tokens.motion;

/** 감소 모션: 기기 설정 또는 앱 설정(`data-motion="reduce"`). 서버 렌더링에서는 움직이지 않는 쪽으로 본다. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  if (document.documentElement.dataset.motion === "reduce") return true;
  return !window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}
