"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { cancelSpaceDeletion, requestSpaceDeletion } from "@/app/s/[spaceId]/us/settings/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DeleteConfirm } from "@/components/us/delete-confirm";
import type { ErrorKey } from "@/lib/action-errors";

/**
 * 가족 지우기(parent, PRIVACY §5): 가족 이름을 다시 써서 요청 → 유예 기간 동안 보기, 내려받기만 →
 * 어느 엄마 아빠든 취소할 수 있다. 요청돼 있으면 지워질 날, 내려받기, 취소를 보여준다.
 */
export function SpaceDeletion({
  spaceId,
  spaceName,
  purgeOn,
}: {
  spaceId: string;
  spaceName: string;
  /** 진행 중인 요청이 있으면 지워질 날(보이는 글자) */
  purgeOn: string | null;
}) {
  const t = useTranslations("privacy.space");
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  if (!purgeOn) {
    return (
      <DeleteConfirm
        name={spaceName}
        label={t("confirmLabel")}
        hint={t("confirmHint", { name: spaceName })}
        submit={t("submit")}
        done={t("done")}
        onDelete={(confirmName) => requestSpaceDeletion(spaceId, confirmName)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold">{t("pending", { date: purgeOn })}</p>
      <p className="text-fg-muted">{t("pendingLead")}</p>
      <Link href={`/s/${spaceId}/us/export`} className={`${buttonClass()} self-start`}>
        {t("exportLink")}
      </Link>
      <p aria-live="polite" className="font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
      <Button
        variant="primary"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await cancelSpaceDeletion(spaceId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            toast({ message: t("canceled") });
            router.refresh();
          })
        }
      >
        {t("cancel")}
      </Button>
    </div>
  );
}
