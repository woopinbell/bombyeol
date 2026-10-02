"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { readDisplayPrefs, setDisplayPref, type DisplayPrefs } from "@/lib/display-prefs";
import { cn } from "@/lib/utils";

const SIZES: DisplayPrefs["text"][] = ["normal", "large", "larger"];
const noop = () => () => {};

/** 글자 크기 고르기(DESIGN §10.6): 드래그 없는 세 단계 버튼, 누르면 바로 화면 전체가 바뀐다 */
export function TextSizeChoice({ next }: { next: string }) {
  const t = useTranslations("onboarding.textSize");
  // 저장된 값은 브라우저에만 있다: 서버와 하이드레이션 때는 "보통", 그 뒤 저장된 값으로(불일치 없이)
  const stored = useSyncExternalStore(
    noop,
    () => readDisplayPrefs().text,
    () => "normal" as const,
  );
  const [chosen, setChosen] = useState<DisplayPrefs["text"] | null>(null);
  const current = chosen ?? stored;
  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="rounded-md border border-line p-4 text-title font-medium">{t("sample")}</p>
      <div role="radiogroup" aria-label={t("label")} className="grid grid-cols-3 gap-2">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={current === size}
            data-press=""
            onClick={() => setChosen(setDisplayPref("text", size).text)}
            className={cn(
              buttonClass({ size: "elder" }),
              "px-2",
              current === size && "border-(length:--bw-sel) border-fg font-heavy",
            )}
          >
            {t(size)}
          </button>
        ))}
      </div>
      <p className="text-body text-fg-muted">{t("hint")}</p>
      <div className="mt-auto">
        <Link
          href={next}
          className={buttonClass({ variant: "primary", size: "elder", block: true })}
        >
          {t("done")}
        </Link>
      </div>
    </div>
  );
}
