/** 달력 한 달(YYYY-MM): 첫날, 마지막 날(YYYY-MM-DD)과 앞뒤 달 */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const key = (d: Date) => d.toISOString().slice(0, 7);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
    prev: key(new Date(Date.UTC(y, m - 2, 1))),
    next: key(new Date(Date.UTC(y, m, 1))),
  };
}

/** 주소의 month 값(YYYY-MM, 1900~2200년)을 받고, 아니면 오늘이 든 달 */
export function parseMonth(value: string | string[] | undefined, todayKey: string): string {
  const raw = typeof value === "string" ? value : "";
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
  if (match && Number(match[1]) >= 1900 && Number(match[1]) <= 2200) return raw;
  return todayKey.slice(0, 7);
}
