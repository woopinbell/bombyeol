"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  DEFAULT_DISPLAY_PREFS,
  DISPLAY_PREF_VALUES,
  readDisplayPrefs,
  setDisplayPref,
  type DisplayPrefKey,
  type DisplayPrefs,
} from "@/lib/display-prefs";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const KEYS: DisplayPrefKey[] = ["text", "theme", "motion"];

/**
 * 화면 설정(DESIGN §10.6, §11): 글자 크기, 밝기, 움직임 줄이기. 누르면 바로 화면 전체에 적용되고
 * 이 기기에만 저장된다(서버는 모른다 - src/lib/display-prefs.ts).
 */
export function DisplaySettings() {
  const t = useTranslations("settings");
  // 저장된 값은 브라우저에만 있다: 서버와 하이드레이션 때는 기본값, 그 뒤 저장된 값으로
  const stored = useSyncExternalStore(
    noop,
    () => JSON.stringify(readDisplayPrefs()),
    () => JSON.stringify(DEFAULT_DISPLAY_PREFS),
  );
  const [chosen, setChosen] = useState<DisplayPrefs | null>(null);
  const current = chosen ?? (JSON.parse(stored) as DisplayPrefs);
  return (
    <div className="flex flex-col gap-6">
      {KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <span id={`pref-${key}`} className="font-bold">
            {t(`${key}.label`)}
          </span>
          <div role="radiogroup" aria-labelledby={`pref-${key}`} className="flex flex-wrap gap-2">
            {DISPLAY_PREF_VALUES[key].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={current[key] === value}
                data-press=""
                onClick={() => setChosen(setDisplayPref(key, value as DisplayPrefs[typeof key]))}
                className={cn(
                  buttonClass(),
                  "grow basis-0 px-2 whitespace-nowrap",
                  current[key] === value && "border-(length:--bw-sel) border-fg font-heavy",
                )}
              >
                {t(`${key}.${value}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-caption text-fg-muted">{t("deviceOnly")}</p>
    </div>
  );
}
