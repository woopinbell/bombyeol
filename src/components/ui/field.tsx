import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 입력칸(DESIGN §9.1-9): 보이는 라벨, 16px 이상 글자, 오류는 칸 바로 아래 + aria-live */
export function Field({
  label,
  hint,
  error,
  elder = false,
  className,
  ...input
}: ComponentProps<"input"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** 어르신 화면: 입력칸 56px·글자 19px */
  elder?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "w-full rounded-md border-(length:--bw) border-line-strong bg-transparent px-4 text-fg",
          "placeholder:text-fg-muted focus:border-(length:--bw-sel) focus:border-fg focus:outline-none",
          "aria-invalid:border-(length:--bw-sel) aria-invalid:border-fg",
          elder ? "min-h-(--touch-elder) text-title-s" : "min-h-(--touch) text-body",
        )}
        {...input}
      />
      {hint ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} aria-live="polite" className="text-caption font-bold text-fg empty:hidden">
        {error}
      </p>
    </div>
  );
}
