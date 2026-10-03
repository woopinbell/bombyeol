"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { setStar } from "@/app/s/[spaceId]/story/actions";
import { useSettledToggle, type LikeState } from "@/components/today/reactions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { motion, prefersReducedMotion } from "@/lib/design-tokens";
import { springCurve } from "@/lib/spring";
import { cn } from "@/lib/utils";

/** 별 하나: 좋아요처럼 연달아 누른 것을 모아 마지막 상태만 보낸다(setStar는 멱등) */
export function useStar(
  spaceId: string,
  storyId: string,
  initial: LikeState,
  onSettled?: (star: LikeState) => void,
) {
  const { state, toggle } = useSettledToggle(
    `story:${storyId}`,
    initial,
    async (on) => {
      const result = await setStar(spaceId, storyId, on);
      return "error" in result ? result : { on: result.starred, count: result.stars };
    },
    onSettled,
  );
  return { star: state, toggle };
}

/**
 * 별 하나 버튼(DESIGN §9.3, §11 spring-boop): 보낼 때만 별이 짧게 튀었다(회전 20도, 1.2배) 150ms 뒤 돌아온다.
 * 드문 순간이라 즐거움을 허용한다. 감소 모션이면 움직이지 않는다. 켜짐은 채운 별 + 굵은 테두리 + 골드 별 표식.
 */
export function StarButton({
  star,
  onToggle,
  size = "default",
}: {
  star: LikeState;
  onToggle: () => LikeState;
  size?: "default" | "small";
}) {
  const t = useTranslations("storyTab");
  const icon = useRef<HTMLSpanElement>(null);
  const click = () => {
    const next = onToggle();
    if (next.on && icon.current) boop(icon.current);
  };
  return (
    <Button
      aria-pressed={star.on}
      onClick={click}
      className={cn(star.on && "border-fg", size === "small" && "px-3")}
    >
      <span ref={icon} className={cn("inline-flex", star.on && "text-starlight-gold")}>
        <Icon name={star.on ? "starOn" : "star"} size="small" />
      </span>
      <span className="tabular-nums">{t("star", { count: star.count })}</span>
    </Button>
  );
}

function boop(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  const spec = motion["spring-boop"];
  const curve = springCurve(spec);
  const easing = CSS.supports("animation-timing-function", curve.easing)
    ? curve.easing
    : motion["ease-out"];
  const up = `rotate(${spec.rotate}deg) scale(${spec.scale})`;
  el.animate([{ transform: "none" }, { transform: up }], {
    duration: curve.duration,
    easing,
    fill: "forwards",
  });
  setTimeout(
    () =>
      el.animate([{ transform: up }, { transform: "none" }], {
        duration: curve.duration,
        easing,
        fill: "forwards",
      }),
    spec["return-after"],
  );
}
