"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { joinFamily, type JoinFormState } from "./actions";

/** 어르신 합류: 입력은 하나(부를 이름, 초대한 가족이 적은 값을 미리 채움) + 큰 버튼 하나 */
export function JoinForm({ code, relationLabel }: { code: string; relationLabel: string | null }) {
  const t = useTranslations("onboarding.join");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<JoinFormState, FormData>(joinFamily, {
    attempt: 0,
  });
  return (
    <form key={state.attempt} action={action} className="flex flex-1 flex-col gap-6">
      <input type="hidden" name="code" value={code} />
      <Field
        elder
        label={t("relationLabel")}
        name="relationLabel"
        maxLength={20}
        defaultValue={state.relationLabel ?? relationLabel ?? ""}
        hint={t("relationHint")}
        autoComplete="off"
      />
      <p role="alert" className="text-title-s font-bold empty:hidden">
        {state.error ? te(state.error) : null}
      </p>
      <div className="mt-auto">
        <Button type="submit" variant="primary" size="elder" block disabled={pending}>
          {pending ? t("joining") : t("join")}
        </Button>
      </div>
    </form>
  );
}
