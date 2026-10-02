"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { savePet, type ProfileFormState } from "@/app/s/[spaceId]/us/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const NAME_ERRORS = ["NAME_REQUIRED", "INVALID_INPUT"];
const DATE_ERRORS = ["DATE_IN_FUTURE"];

export type PetValues = {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  speciesLabel: string | null;
  breed: string | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  birthDateEstimated: boolean;
  adoptedAt: string | null;
};

/**
 * 반려동물 더하기, 고치기(parent). 이름과 종만 꼭 적고, 품종, 날짜는 비워 두고 나중에 채워도 된다.
 * '다른 동물'을 고르면 어떤 동물인지 적는 칸이 보인다(자바스크립트 없이 :has).
 */
export function PetForm({
  spaceId,
  pet,
  todayKey,
}: {
  spaceId: string;
  pet?: PetValues;
  todayKey: string;
}) {
  const t = useTranslations("petForm");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    savePet.bind(null, spaceId, pet?.id ?? null),
    { attempt: 0 },
  );
  const v = state.values ?? {};
  const nameError = state.error && NAME_ERRORS.includes(state.error) ? te(state.error) : undefined;
  const dateError = state.error && DATE_ERRORS.includes(state.error) ? te(state.error) : undefined;
  const generalError = state.error && !nameError && !dateError ? te(state.error) : undefined;
  const value = (key: keyof PetValues) => v[key] ?? (pet?.[key] as string | null) ?? "";

  return (
    <form key={state.attempt} action={action} className="flex flex-col gap-8">
      <Field
        label={t("name")}
        name="name"
        required
        maxLength={30}
        autoComplete="off"
        defaultValue={value("name")}
        error={nameError}
      />
      <div className="group flex flex-col gap-3">
        <ChoiceChips
          name="species"
          legend={t("species")}
          defaultValue={value("species") || "dog"}
          options={[
            { value: "dog", label: t("dog") },
            { value: "cat", label: t("cat") },
            { value: "other", label: t("other") },
          ]}
        />
        <Field
          label={t("speciesLabel")}
          name="speciesLabel"
          maxLength={30}
          autoComplete="off"
          placeholder={t("speciesLabelPlaceholder")}
          defaultValue={value("speciesLabel")}
          className="hidden group-has-[input[value=other]:checked]:flex"
        />
      </div>
      <Field
        label={t("breed")}
        name="breed"
        maxLength={30}
        autoComplete="off"
        hint={t("optionalHint")}
        defaultValue={value("breed")}
      />
      <div className="flex flex-col gap-3">
        <Field
          label={t("birthDate")}
          name="birthDate"
          type="date"
          max={todayKey}
          hint={t("laterHint")}
          defaultValue={value("birthDate")}
          error={dateError}
        />
        <label className="relative flex items-center gap-3" data-press="">
          <input
            type="checkbox"
            name="birthDateEstimated"
            value="1"
            defaultChecked={v.birthDateEstimated ? true : (pet?.birthDateEstimated ?? false)}
            className="peer absolute inset-0 z-10 size-full opacity-0"
          />
          <span
            aria-hidden="true"
            className="press flex size-(--icon) flex-none items-center justify-center rounded-sm border-(length:--bw) border-line-strong text-transparent peer-checked:border-(length:--bw-sel) peer-checked:border-fg peer-checked:text-fg peer-focus-visible:outline peer-focus-visible:outline-(length:--bw-sel) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg"
          >
            <Icon name="check" size="small" />
          </span>
          <span>{t("estimated")}</span>
        </label>
      </div>
      <Field
        label={t("adoptedAt")}
        name="adoptedAt"
        type="date"
        max={todayKey}
        hint={t("laterHint")}
        defaultValue={value("adoptedAt")}
      />
      <p role="alert" className="font-bold empty:hidden">
        {generalError}
      </p>
      <Button type="submit" variant="primary" size="elder" block disabled={pending}>
        {pending ? t("submitting") : pet ? t("submitEdit") : t("submitNew")}
      </Button>
    </form>
  );
}
