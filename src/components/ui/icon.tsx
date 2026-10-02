import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 아이콘(DESIGN §10.5): 24px 격자, 획 1.75, 둥근 끝. 심볼의 세 도형에서 뽑았다 - 꽃잎 원 네 개 = 오늘,
 * 다섯 갈래 별 = 이야기, 네 갈래 반짝임 = 마일스톤. 아이콘은 늘 글자 라벨과 함께 쓴다(장식, aria-hidden).
 */
const FLOWER = (
  <>
    <circle cx="8.6" cy="9" r="4.1" />
    <circle cx="14.6" cy="7.6" r="3.6" />
    <circle cx="15.6" cy="14" r="3.9" />
    <circle cx="9.4" cy="15.4" r="3.6" />
  </>
);
const STAR = (
  <path d="M12 3.5l2.7 5.85 6.3 1.35-4.5 4.5 1.1 6.3L12 18.35 6.4 21.5l1.1-6.3L3 10.7l6.3-1.35z" />
);
const SPARK = <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />;
const HEART = (
  <path d="M12 19.5s-7-4.2-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.4-7 9.6-7 9.6z" />
);

type Shape = { d: ReactNode; fill?: boolean };

const ICONS = {
  today: { d: FLOWER },
  // 채운 꽃잎은 겹친 원의 경계가 보이게 바탕색 획을 둔다(SVG 속성은 CSS 변수를 못 읽어 style로)
  todayOn: { d: <g style={{ stroke: "var(--bg)" }}>{FLOWER}</g>, fill: true },
  star: { d: STAR },
  starOn: { d: STAR, fill: true },
  us: {
    d: (
      <>
        <circle cx="9" cy="8.5" r="3.4" />
        <circle cx="16" cy="9.6" r="2.7" />
        <path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6" />
        <path d="M15 14.9c.4-.2.8-.3 1.2-.3 2.4 0 4.2 1.8 4.8 5.4" />
      </>
    ),
  },
  usOn: {
    d: (
      <>
        <circle cx="16" cy="9.6" r="2.7" fill="currentColor" />
        <path d="M15 14.9c.4-.2.8-.3 1.2-.3 2.4 0 4.2 1.8 4.8 5.4" />
        <circle cx="9" cy="8.5" r="3.4" fill="currentColor" style={{ stroke: "var(--bg)" }} />
        <path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6z" fill="currentColor" />
      </>
    ),
  },
  spark: { d: SPARK, fill: true },
  heart: { d: HEART },
  heartOn: { d: HEART, fill: true },
  talk: {
    d: (
      <path d="M5 5.5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H10l-4.5 3.5V16H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
    ),
  },
  plus: { d: <path d="M12 5v14M5 12h14" /> },
  right: { d: <path d="M9.5 5.5L16 12l-6.5 6.5" /> },
  left: { d: <path d="M14.5 5.5L8 12l6.5 6.5" /> },
  pen: {
    d: (
      <>
        <path d="M4.5 19.5h4l10-10-4-4-10 10z" />
        <path d="M13 7l4 4" />
      </>
    ),
  },
  close: { d: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /> },
  check: { d: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
  play: { d: <path d="M8 5.5v13l10.5-6.5z" />, fill: true },
} satisfies Record<string, Shape>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = "default",
  className,
}: {
  name: IconName;
  size?: "default" | "small";
  className?: string;
}) {
  const shape: Shape = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      fill={shape.fill ? "currentColor" : "none"}
      stroke="currentColor"
      style={{ strokeWidth: "var(--icon-stroke)" }}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("flex-none", size === "small" ? "size-(--icon-s)" : "size-(--icon)", className)}
    >
      {shape.d}
    </svg>
  );
}
