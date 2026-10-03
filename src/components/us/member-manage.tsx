"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import {
  leaveFamily,
  markMemorial,
  removeMember,
  setMemberLabel,
  setMemberRole,
  unmarkMemorial,
  updateMemorial,
} from "@/app/s/[spaceId]/us/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MEMORIAL_POLICY } from "@/lib/plan";

type Done = { ok: true } | { error: ErrorKey };

/** 바로 하는 일: 보내고, 되면 토스트 + 화면 다시 받기, 안 되면 폼 안에 문구 */
function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const act = (task: () => Promise<Done>, done: string, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await task();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      toast({ message: done });
      after?.();
      router.refresh();
    });
  return { error, pending, act };
}

function ErrorLine({ error }: { error: ErrorKey | null }) {
  const errors = useTranslations("errors");
  return (
    <p aria-live="polite" className="font-bold empty:hidden">
      {error ? errors(error) : null}
    </p>
  );
}

export function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t-(length:--bw-hair) border-line pt-6">
      <div>
        <h2 className="text-title font-heavy">{title}</h2>
        {lead ? <p className="text-fg-muted">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** 부르는 이름(본인 또는 parent) */
export function LabelForm({
  spaceId,
  memberId,
  value,
}: {
  spaceId: string;
  memberId: string;
  value: string | null;
}) {
  const t = useTranslations("member");
  const { error, pending, act } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const label = String(new FormData(e.currentTarget).get("label") ?? "");
        act(() => setMemberLabel(spaceId, memberId, label), t("labelSaved"));
      }}
      className="flex flex-col gap-3"
    >
      <Field
        name="label"
        label={t("labelTitle")}
        hint={t("labelHint")}
        maxLength={20}
        autoComplete="off"
        defaultValue={value ?? ""}
      />
      <ErrorLine error={error} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {t("labelSave")}
      </Button>
    </form>
  );
}

/** 역할 바꾸기(parent, 바꿀 수 있는 멤버만) */
export function RoleForm({
  spaceId,
  memberId,
  role,
}: {
  spaceId: string;
  memberId: string;
  role: "parent" | "grandparent" | "relative";
}) {
  const t = useTranslations("member");
  const { error, pending, act } = useAction();
  const roles = ["grandparent", "parent", "relative"] as const;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next = String(new FormData(e.currentTarget).get("role")) as typeof role;
        if (next === role) return;
        act(() => setMemberRole(spaceId, memberId, next), t("roleSaved"));
      }}
      className="flex flex-col gap-3"
    >
      <ChoiceChips
        name="role"
        legend={t("roleTitle")}
        defaultValue={role}
        options={roles.map((r) => ({ value: r, label: t(`role.${r}`) }))}
      />
      <p className="text-caption text-fg-muted">{t("roleHint")}</p>
      <ErrorLine error={error} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {t("roleSave")}
      </Button>
    </form>
  );
}

/**
 * 확인 한 번 더(되돌릴 수 없는 일 - DESIGN §9.1-7): 버튼을 누르면 확인 문구와 [그만두기] [네]가 나온다.
 */
export function ConfirmAction({
  label,
  confirm,
  onConfirm,
  pending,
}: {
  label: string;
  confirm: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  const t = useTranslations("member");
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button onClick={() => setAsking(true)} className="self-start">
        {label}
      </Button>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-md border-(length:--bw-sel) border-fg p-4"
    >
      <p className="font-bold">{confirm}</p>
      <div className="flex gap-2">
        <Button onClick={() => setAsking(false)} disabled={pending}>
          {t("confirmNo")}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={onConfirm}
          disabled={pending}
          aria-busy={pending}
        >
          {t("confirmYes")}
        </Button>
      </div>
    </div>
  );
}

export function RemoveMember({
  spaceId,
  memberId,
  name,
  backHref,
}: {
  spaceId: string;
  memberId: string;
  name: string;
  backHref: string;
}) {
  const t = useTranslations("member");
  const router = useRouter();
  const { error, pending, act } = useAction();
  return (
    <>
      <ConfirmAction
        label={t("remove", { name })}
        confirm={t("removeConfirm")}
        pending={pending}
        onConfirm={() =>
          act(
            () => removeMember(spaceId, memberId),
            t("removed"),
            () => router.push(backHref),
          )
        }
      />
      <ErrorLine error={error} />
    </>
  );
}

export function LeaveFamily({ spaceId }: { spaceId: string }) {
  const t = useTranslations("member");
  const { error, pending, act } = useAction();
  return (
    <>
      <ConfirmAction
        label={t("leave")}
        confirm={t("leaveConfirm")}
        pending={pending}
        onConfirm={() => act(() => leaveFamily(spaceId), t("leave"))}
      />
      <ErrorLine error={error} />
    </>
  );
}

/**
 * 별이 되신 분(parent): 아직 아니면 [바꾸기] → 떠난 날, 기억하고 싶은 말 → 확인. 이미 별이면 고치기와 되돌리기.
 * 사람과 반려동물이 함께 쓴다.
 */
export function MemorialPanel({
  spaceId,
  target,
  memorial,
  todayKey,
}: {
  spaceId: string;
  target: { type: "member"; memberId: string } | { type: "pet"; petId: string };
  memorial: { id: string; passedAt: string | null; note: string | null } | null;
  todayKey: string;
}) {
  const t = useTranslations("member");
  const { error, pending, act } = useAction();
  const [open, setOpen] = useState(false);
  const read = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      passedAt: String(data.get("passedAt") ?? ""),
      note: String(data.get("note") ?? ""),
    };
  };
  if (!memorial && !open) {
    return (
      <Button onClick={() => setOpen(true)} className="self-start">
        {t("memorialMark")}
      </Button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = read(e.currentTarget);
        if (memorial) act(() => updateMemorial(spaceId, memorial.id, input), t("memorialSaved"));
        else act(() => markMemorial(spaceId, target, input), t("memorialMarked"));
      }}
      className="flex flex-col gap-4"
    >
      {memorial ? null : <p className="font-bold">{t("memorialConfirm")}</p>}
      <Field
        name="passedAt"
        type="date"
        label={t("passedAt")}
        hint={t("passedAtHint")}
        max={todayKey}
        defaultValue={memorial?.passedAt ?? ""}
      />
      <TextArea
        name="note"
        label={t("note")}
        hint={t("noteHint")}
        rows={3}
        maxLength={MEMORIAL_POLICY.noteMaxChars}
        defaultValue={memorial?.note ?? ""}
      />
      <ErrorLine error={error} />
      <div className="flex flex-wrap gap-2">
        {memorial ? (
          <Button
            onClick={() => act(() => unmarkMemorial(spaceId, memorial.id), t("unmarked"))}
            disabled={pending}
          >
            {t("unmark")}
          </Button>
        ) : (
          <Button onClick={() => setOpen(false)} disabled={pending}>
            {t("confirmNo")}
          </Button>
        )}
        <Button
          type="submit"
          variant={memorial ? "secondary" : "primary"}
          className="flex-1"
          disabled={pending}
          aria-busy={pending}
        >
          {memorial ? t("memorialSave") : t("memorialMark")}
        </Button>
      </div>
    </form>
  );
}
