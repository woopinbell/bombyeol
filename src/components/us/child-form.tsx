"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { markChildBorn, saveChild, type ProfileFormState } from "@/app/s/[spaceId]/us/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";

const NAME_ERRORS = ["NAME_REQUIRED"];
const DATE_ERRORS = ["ONE_DATE_REQUIRED", "DATE_IN_FUTURE", "USE_MARK_BORN"];

export type ChildValues = {
  id: string;
  name: string | null;
  nickname: string | null;
  status: "expecting" | "born";
  /** YYYY-MM-DD(곧 태어나면 출생 예정일, 태어났으면 생일) */
  date: string | null;
};

/**
 * 아이 더하기, 고치기(parent). 이름, 태명 중 하나 이상, 날짜는 비워 두고 나중에 채워도 된다.
 * 자바스크립트가 늦게 떠도 폼 전송으로 동작한다. 실패하면 입력값을 되살린다.
 */
export function ChildForm({
  spaceId,
  child,
  todayKey,
}: {
  spaceId: string;
  child?: ChildValues;
  todayKey: string;
}) {
  const t = useTranslations("childForm");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    saveChild.bind(null, spaceId, child?.id ?? null),
    { attempt: 0 },
  );
  const v = state.values ?? {};
  const nameError = state.error && NAME_ERRORS.includes(state.error) ? te(state.error) : undefined;
  const dateError = state.error && DATE_ERRORS.includes(state.error) ? te(state.error) : undefined;
  const generalError = state.error && !nameError && !dateError ? te(state.error) : undefined;
  const expecting = child?.status === "expecting";

  return (
    <form key={state.attempt} action={action} className="flex flex-col gap-8">
      {child ? (
        <input type="hidden" name="status" value={child.status} />
      ) : (
        <ChoiceChips
          name="status"
          legend={t("status")}
          defaultValue={v.status || "born"}
          options={[
            { value: "born", label: t("born") },
            { value: "expecting", label: t("expecting") },
          ]}
        />
      )}
      <div className="flex flex-col gap-4">
        <Field
          label={t("name")}
          name="name"
          maxLength={30}
          autoComplete="off"
          defaultValue={v.name ?? child?.name ?? ""}
          error={nameError}
        />
        <Field
          label={t("nickname")}
          name="nickname"
          maxLength={30}
          autoComplete="off"
          defaultValue={v.nickname ?? child?.nickname ?? ""}
          hint={t("nameHint")}
        />
      </div>
      <Field
        label={child ? (expecting ? t("dueDate") : t("birthDate")) : t("date")}
        name="date"
        type="date"
        // 출생 예정일은 앞날이어도 된다
        max={expecting ? undefined : todayKey}
        defaultValue={v.date ?? child?.date ?? ""}
        hint={child ? (child.date ? t("keepHint") : t("laterHint")) : t("dateHint")}
        error={dateError}
      />
      <p role="alert" className="font-bold empty:hidden">
        {generalError}
      </p>
      <Button type="submit" variant="primary" size="elder" block disabled={pending}>
        {pending ? t("submitting") : child ? t("submitEdit") : t("submitNew")}
      </Button>
    </form>
  );
}

/** 곧 태어날 아이 → 태어났어요. 태어난 날은 꼭 적는다(나이를 그날부터 센다) */
export function MarkBornForm({
  spaceId,
  child,
  todayKey,
}: {
  spaceId: string;
  child: ChildValues;
  todayKey: string;
}) {
  const t = useTranslations("childForm");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    markChildBorn.bind(null, spaceId, child.id),
    { attempt: 0 },
  );
  const v = state.values ?? {};
  return (
    <section aria-labelledby="born-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="born-heading" className="text-title font-heavy">
          {t("bornTitle")}
        </h2>
        <p className="text-fg-muted">{t("bornLead")}</p>
      </div>
      <form key={state.attempt} action={action} className="flex flex-col gap-4">
        <Field
          label={t("bornDate")}
          name="birthDate"
          type="date"
          required
          max={todayKey}
          defaultValue={v.birthDate}
          error={state.error ? te(state.error) : undefined}
        />
        <Field
          label={t("bornName")}
          name="name"
          maxLength={30}
          autoComplete="off"
          hint={t("bornNameHint")}
          defaultValue={v.name ?? child.name ?? ""}
        />
        <Button type="submit" block disabled={pending}>
          {pending ? t("submitting") : t("bornSubmit")}
        </Button>
      </form>
    </section>
  );
}
