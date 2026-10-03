"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";

type Done = { ok: true } | { error: ErrorKey };

/**
 * 되돌릴 수 없는 삭제(DESIGN §9.1-7, PRIVACY §2.5): 이름을 똑같이 다시 써야 버튼이 눌린다.
 * 서버도 같은 이름을 다시 확인한다(CONFIRM_MISMATCH). 되면 토스트 후 다음 화면으로.
 */
export function DeleteConfirm({
  name,
  label,
  hint,
  submit,
  done,
  next,
  onDelete,
}: {
  /** 똑같이 써야 하는 이름 */
  name: string;
  label: string;
  hint: string;
  submit: string;
  done: string;
  /** 지운 뒤 갈 곳(없으면 지금 화면을 다시 받는다) */
  next?: string;
  onDelete: (confirmName: string) => Promise<Done>;
}) {
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim() === name;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!matches) return;
        start(async () => {
          setError(null);
          const result = await onDelete(typed.trim());
          if ("error" in result) {
            setError(result.error);
            return;
          }
          toast({ message: done });
          if (next) router.push(next);
          else router.refresh();
        });
      }}
      className="flex flex-col gap-3"
    >
      <Field
        name="confirmName"
        label={label}
        hint={hint}
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        error={error ? errors(error) : undefined}
      />
      <Button type="submit" disabled={!matches || pending} aria-busy={pending}>
        {submit}
      </Button>
    </form>
  );
}
