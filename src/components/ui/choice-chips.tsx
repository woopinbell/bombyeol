import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 하나만 고르는 칩(라디오). 자바스크립트 없이도 동작한다(폼 전송). 선택은 굵은 테두리 + 굵은 글자 —
 * 색만으로 구분하지 않는다(DESIGN §8). 칩 높이는 터치 최소 48px.
 */
export function ChoiceChips({
  name,
  legend,
  options,
  defaultValue,
  size = "default",
}: {
  name: string;
  legend: ReactNode;
  options: { value: string; label: ReactNode }[];
  defaultValue?: string;
  size?: "default" | "elder";
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer absolute inset-0 opacity-0"
              id={`${id}-${option.value}`}
            />
            <span
              data-press=""
              className={cn(
                "press flex items-center rounded-md border-(length:--bw) border-line-strong px-4 font-medium",
                "peer-checked:border-(length:--bw-sel) peer-checked:border-fg peer-checked:font-heavy",
                "peer-focus-visible:outline peer-focus-visible:outline-(length:--bw-sel) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
                size === "elder"
                  ? "min-h-(--touch-elder) text-title-s"
                  : "min-h-(--touch) text-body",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
