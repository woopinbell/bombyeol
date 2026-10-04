import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * 켜고 끄는 칸(DESIGN §9.1-3): 굵은 테두리 + 체크 표시(색만으로 구분하지 않음), 글자 라벨 전체가 누르는 곳.
 * 누르는 곳은 터치 크기 이상(--touch, WCAG 2.5.8, 서울 고령층 표준) - 체크박스는 이것만 쓴다(tests/a11y.test.ts).
 */
export function Checkbox({
  name,
  label,
  hint,
  checked,
  defaultChecked,
  onChange,
}: {
  name?: string;
  label: ReactNode;
  hint?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <label className="relative flex min-h-(--touch) items-center gap-3" data-press="">
      <input
        type="checkbox"
        name={name}
        value="1"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer absolute inset-0 z-10 size-full opacity-0"
      />
      <span
        aria-hidden="true"
        className="press flex size-(--icon) flex-none items-center justify-center rounded-sm border-(length:--bw) border-line-strong text-transparent peer-checked:border-(length:--bw-sel) peer-checked:border-fg peer-checked:text-fg peer-focus-visible:outline peer-focus-visible:outline-(length:--bw-sel) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg"
      >
        <Icon name="check" size="small" />
      </span>
      {hint ? (
        <span className="flex flex-col">
          <span className="font-bold">{label}</span>
          <span className="text-caption text-fg-muted">{hint}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </label>
  );
}
