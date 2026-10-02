"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { createFamily, type FamilyFormState } from "./actions";

const CHILD_ERRORS = ["NAME_REQUIRED", "ONE_DATE_REQUIRED", "DATE_IN_FUTURE"];

export function FamilyForm() {
  const t = useTranslations("onboarding.family");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<FamilyFormState, FormData>(createFamily, {
    attempt: 0,
  });
  const v = state.values ?? {};
  const childError =
    state.error && CHILD_ERRORS.includes(state.error) ? te(state.error) : undefined;
  const generalError = state.error && !childError ? te(state.error) : undefined;

  return (
    // 실패 뒤 다시 그릴 때 입력값을 되살린다(React는 액션 뒤 폼을 비운다)
    <form
      key={state.attempt}
      action={action}
      className="flex flex-1 flex-col gap-8"
      noValidate={false}
    >
      <Field
        label={t("name")}
        name="name"
        required
        maxLength={40}
        placeholder={t("namePlaceholder")}
        defaultValue={v.name}
        autoComplete="off"
      />
      <div className="group flex flex-col gap-3">
        <ChoiceChips
          name="relation"
          legend={t("relation")}
          defaultValue={v.relation || t("relationMom")}
          options={[
            { value: t("relationMom"), label: t("relationMom") },
            { value: t("relationDad"), label: t("relationDad") },
            { value: "custom", label: t("relationCustom") },
          ]}
        />
        {/* '직접 쓸게요'를 골랐을 때만 보인다(자바스크립트 없이 :has) */}
        <Field
          label={t("relationCustomLabel")}
          name="relationCustom"
          maxLength={20}
          defaultValue={v.relationCustom}
          className="hidden group-has-[input[value=custom]:checked]:flex"
        />
      </div>
      <section aria-labelledby="child-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="child-heading" className="text-title font-heavy">
            {t("childTitle")}
          </h2>
          <p className="text-body text-fg-muted">{t("childHint")}</p>
        </div>
        <ChoiceChips
          name="childStatus"
          legend={t("childStatus")}
          defaultValue={v.childStatus || "born"}
          options={[
            { value: "born", label: t("childBorn") },
            { value: "expecting", label: t("childExpecting") },
          ]}
        />
        <Field label={t("childName")} name="childName" maxLength={30} defaultValue={v.childName} />
        <Field
          label={t("childDate")}
          name="childDate"
          type="date"
          defaultValue={v.childDate}
          hint={t("childDateHint")}
          error={childError}
        />
      </section>
      <p role="alert" className="text-body font-bold empty:hidden">
        {generalError}
      </p>
      <div className="mt-auto">
        <Button type="submit" variant="primary" size="elder" block disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
