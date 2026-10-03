"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/(onboarding)/account/delete/actions";
import { ConfirmAction } from "@/components/us/member-manage";
import type { ErrorKey } from "@/lib/action-errors";

/** 계정 지우기 단추: 한 번 더 묻고(DESIGN §9.1-7) 지운다. 되면 서버가 로그아웃 후 안내 화면으로 보낸다 */
export function AccountDelete() {
  const t = useTranslations("privacy.account");
  const errors = useTranslations("errors");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ConfirmAction
        label={t("submit")}
        confirm={t("confirm")}
        pending={pending}
        onConfirm={() =>
          start(async () => {
            setError(null);
            const result = await deleteMyAccount();
            setError(result.error);
          })
        }
      />
      <p aria-live="polite" className="font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
    </div>
  );
}
