"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { agreeToTerms } from "@/app/(onboarding)/agree/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ErrorKey } from "@/lib/action-errors";

const ITEMS = ["age", "terms", "privacy"] as const;

/**
 * 가입 동의(PRIVACY §2.4): 만 14세 이상, 이용약관, 개인정보 처리방침 - 셋 다 필수라 모두 골라야 시작된다.
 * 각 문서는 같은 창에서 읽고 돌아온다(어르신에게 새 창은 헷갈린다).
 */
export function AgreeForm({
  versions,
  next,
}: {
  versions: { terms: string; privacy: string };
  next: string;
}) {
  const t = useTranslations("agree");
  const errors = useTranslations("errors");
  const [checked, setChecked] = useState<Record<(typeof ITEMS)[number], boolean>>({
    age: false,
    terms: false,
    privacy: false,
  });
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const all = ITEMS.every((k) => checked[k]);
  const here = `/agree?next=${encodeURIComponent(next)}`;
  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        label={t("all")}
        checked={all}
        onChange={(on) => setChecked({ age: on, terms: on, privacy: on })}
      />
      <div className="flex flex-col gap-1 border-t-(length:--bw-hair) border-line pt-3">
        {ITEMS.map((key) => (
          <div key={key} className="flex flex-col">
            <Checkbox
              label={t(`${key}.label`)}
              checked={checked[key]}
              onChange={(on) => setChecked((c) => ({ ...c, [key]: on }))}
            />
            {key === "age" ? null : (
              <Link
                href={`/${key}?back=${encodeURIComponent(here)}`}
                className="ml-9 inline-flex min-h-(--touch) items-center self-start font-bold underline"
              >
                {t(`${key}.read`)}
              </Link>
            )}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
      <Button
        variant="primary"
        size="elder"
        block
        disabled={!all || pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await agreeToTerms(versions, next);
            if (result?.error) setError(result.error);
          })
        }
      >
        {t("submit")}
      </Button>
    </div>
  );
}
