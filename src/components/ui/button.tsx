import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * 버튼(DESIGN §9.1·§12). 주 버튼은 화면당 하나, 아이콘만 있는 버튼은 만들지 않는다(글자 라벨 필수).
 * 누름 피드백은 PressFeedback이 data-press 요소에 거리 2px 배율을 계산해 준다.
 */
const variants = {
  primary: "bg-strong text-on-strong border-strong",
  secondary: "bg-transparent text-fg border-line-strong",
  text: "bg-transparent text-fg-muted border-transparent px-2 font-medium",
} as const;

const sizes = {
  default: "min-h-(--touch) text-body",
  elder: "min-h-(--touch-elder) text-title-s",
} as const;

export type ButtonStyle = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  block?: boolean;
};

export function buttonClass({ variant = "secondary", size = "default", block }: ButtonStyle = {}) {
  return cn(
    "press inline-flex items-center justify-center gap-2 rounded-md border-(length:--bw) px-4 font-bold",
    "disabled:opacity-60 aria-disabled:opacity-60",
    variants[variant],
    sizes[size],
    block && "w-full",
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonStyle) {
  return (
    <button
      type={type}
      data-press=""
      className={cn(buttonClass({ variant, size, block }), className)}
      {...props}
    />
  );
}
