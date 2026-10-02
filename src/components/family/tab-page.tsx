import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 탭 화면 틀: 좌우 20px, 맨 위 머리말(가족 이름 같은 화면의 주인 - 탭 이름을 되풀이하지 않는다, DESIGN §10.6),
 * 아래 고정 행동(dock)은 하단 탭 바로 위에 붙는다.
 */
export function TabPage({
  header,
  children,
  dock,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  dock?: ReactNode;
  className?: string;
}) {
  return (
    <>
      <main className={cn("flex flex-1 flex-col px-5 pb-6", className)}>
        <header className="flex min-h-(--touch-elder) items-center justify-between gap-3 pt-2">
          {header}
        </header>
        {children}
      </main>
      {dock ? (
        <div className="sticky bottom-[calc(var(--touch-elder)+env(safe-area-inset-bottom))] z-10 border-t-(length:--bw-hair) border-line bg-bg px-5 py-3">
          {dock}
        </div>
      ) : null}
    </>
  );
}

export function TabTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-title-s font-bold">{children}</h1>;
}
