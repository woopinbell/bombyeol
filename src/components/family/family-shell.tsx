"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PwaSync } from "@/components/pwa/pwa-sync";
import { Icon, type IconName } from "@/components/ui/icon";
import { ToastProvider, ToastRegion } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "today", path: "", icon: "today", iconOn: "todayOn" },
  { key: "story", path: "/story", icon: "star", iconOn: "starOn" },
  { key: "us", path: "/us", icon: "us", iconOn: "usOn" },
] as const satisfies readonly { key: string; path: string; icon: IconName; iconOn: IconName }[];

/**
 * 가족 홈 틀(DESIGN §6, §10.5): 하단 3탭(오늘, 이야기, 우리). 이야기 탭은 화면 전체가 별(night) 면이다.
 * 선택된 탭은 채운 아이콘 + 굵은 글자(밑줄 막대 없음), 탭 이름은 늘 글자로 보인다.
 */
export function FamilyShell({ spaceId, children }: { spaceId: string; children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("tabs");
  const base = `/s/${spaceId}`;
  const current =
    TABS.find((tab) => tab.path && pathname.startsWith(base + tab.path))?.key ?? "today";
  return (
    <ToastProvider>
      <PwaSync />
      <div
        data-surface={current === "story" ? "night" : undefined}
        className="flex min-h-dvh flex-col bg-bg text-fg transition-colors duration-(--d-fast) ease-linear"
      >
        <div className="mx-auto flex w-full max-w-(--content-max) flex-1 flex-col">{children}</div>
        <nav
          aria-label={t("label")}
          className="sticky bottom-0 z-10 border-t-(length:--bw-hair) border-line bg-bg pb-[env(safe-area-inset-bottom)] transition-colors duration-(--d-fast) ease-linear"
        >
          <ul className="mx-auto flex max-w-(--content-max)">
            {TABS.map((tab) => {
              const on = tab.key === current;
              return (
                <li key={tab.key} className="flex-1">
                  <Link
                    href={base + tab.path}
                    aria-current={on ? "page" : undefined}
                    data-press=""
                    className={cn(
                      "press flex min-h-(--touch-elder) flex-col items-center justify-center gap-1 text-caption",
                      on
                        ? "font-heavy text-fg in-data-[surface=night]:text-starlight-gold"
                        : "font-medium text-fg-muted",
                    )}
                  >
                    <Icon name={on ? tab.iconOn : tab.icon} />
                    {t(tab.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ToastRegion host="page" />
      </div>
    </ToastProvider>
  );
}
