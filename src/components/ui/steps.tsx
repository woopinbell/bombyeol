/**
 * 단계 표시(DESIGN §9.5, 서울 고령층 표준 2-2): 점 + 남은 단계 문구. 문구는 부르는 쪽이 문구 파일에서 넘긴다.
 */
export function Steps({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <ol aria-hidden="true" className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={
              i < current
                ? "size-3 rounded-full bg-strong"
                : "size-3 rounded-full border-(length:--bw) border-strong"
            }
          />
        ))}
      </ol>
      <p className="text-caption font-bold text-fg-muted">{label}</p>
    </div>
  );
}
