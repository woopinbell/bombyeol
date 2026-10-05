"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setPushMute } from "@/app/s/[spaceId]/us/settings/actions";
import { Checkbox } from "@/components/ui/checkbox";
import type { ErrorKey } from "@/lib/action-errors";
import type { NoticeKind } from "@/server/push/types";

const KINDS: NoticeKind[] = ["moment", "story", "ask", "heart", "comment", "news", "day"];

/**
 * 이 가족에서 받을 알림 종류(계정 단위 - 내 모든 기기에 함께 적용). 누르면 바로 저장하고,
 * 안 되면 원래대로 돌리고 문구를 보인다. 기기 알림을 켜는 것은 위의 이 기기 알림에서.
 */
export function PushMutes({ spaceId, muted }: { spaceId: string; muted: NoticeKind[] }) {
  const t = useTranslations("settings.pushKinds");
  const errors = useTranslations("errors");
  const [current, setCurrent] = useState(muted);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const toggle = (kind: NoticeKind, on: boolean) => {
    const before = current;
    setCurrent(on ? current.filter((k) => k !== kind) : [...current, kind]);
    start(async () => {
      setError(null);
      const result = await setPushMute(spaceId, kind, !on);
      if ("error" in result) {
        setCurrent(before);
        setError(result.error);
        return;
      }
      setCurrent(result.muted);
    });
  };
  return (
    <fieldset className="flex flex-col gap-3" aria-busy={pending}>
      <legend className="mb-1 font-bold">{t("title")}</legend>
      {KINDS.map((kind) => (
        <Checkbox
          key={kind}
          label={t(kind)}
          checked={!current.includes(kind)}
          onChange={(on) => toggle(kind, on)}
        />
      ))}
      <p className="text-caption text-fg-muted">{t("hint")}</p>
      <p aria-live="polite" className="font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
    </fieldset>
  );
}
