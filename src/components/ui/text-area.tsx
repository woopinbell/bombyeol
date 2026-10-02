import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 여러 줄 입력칸: Field와 같은 규칙(보이는 라벨, 16px 이상 글자, 오류는 바로 아래 + aria-live) */
export function TextArea({
  label,
  hint,
  error,
  className,
  ...input
}: ComponentProps<"textarea"> & { label: ReactNode; hint?: ReactNode; error?: ReactNode }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <textarea
        id={id}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "w-full resize-y rounded-md border-(length:--bw) border-line-strong bg-transparent px-4 py-3 text-body text-fg",
          "placeholder:text-fg-muted focus:border-(length:--bw-sel) focus:border-fg focus:outline-none",
          "aria-invalid:border-(length:--bw-sel) aria-invalid:border-fg",
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
