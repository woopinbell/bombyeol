import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FilterItem = { key: string; href: string; on: boolean; label: ReactNode };

/**
 * 탭 머리의 "누구 것만 보기" 고르기(오늘, 이야기). 항목이 넘치면 옆으로 숨기지 않고 다음 줄로 내린다 -
 * 밀어서 넘기는 동작 없이 모두 보이게(DESIGN §9.1-5, 9). 글자 더 크게, 320px에서도 글자가 겹치지 않는다.
 */
export function FilterNav({ label, items }: { label: string; items: FilterItem[] }) {
  return (
    <nav aria-label={label} className="mt-2">
      <ul className="flex flex-wrap gap-1 rounded-md border-(length:--bw) border-line-strong p-1">
        {items.map((item) => (
          <li key={item.key} className="min-w-20 grow">
            <Link
              href={item.href}
              aria-current={item.on ? "page" : undefined}
              scroll={false}
              data-press=""
              className={cn(
                "press flex min-h-(--touch) items-center justify-center rounded-sm px-3 text-center wrap-anywhere",
                item.on ? "bg-strong font-bold text-on-strong" : "font-medium text-fg-muted",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
