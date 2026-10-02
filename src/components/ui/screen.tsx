import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 한 화면 틀: 가운데 한 기둥(최대 480px), 좌우 20px, 위쪽 머리말 · 본문 · 아래 행동(주 버튼).
 * 아래 행동은 화면 아래에 붙고 안전 영역(홈 바)만큼 띄운다.
 */
export function Screen({
  top,
  children,
  actions,
  className,
}: {
  top?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-(--content-max) flex-col px-5 pt-4",
        "pb-[max(var(--sp-6),env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {top ? (
        <div className="flex min-h-(--touch-elder) items-center justify-between">{top}</div>
      ) : null}
      <div className="flex flex-1 flex-col gap-6 pt-4">{children}</div>
      {actions ? <div className="mt-8 flex flex-col gap-3">{actions}</div> : null}
    </main>
  );
}

export function Title({
  children,
  size = "display",
}: {
  children: ReactNode;
  size?: "display" | "title";
}) {
  return (
    <h1
      className={cn(
        "font-heavy whitespace-pre-line text-balance",
        size === "display" ? "text-display" : "text-title",
      )}
    >
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-title-s text-fg">{children}</p>;
}
