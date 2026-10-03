/** 시간대의 UTC 차이(분). 서울은 +540. 일광 절약 시간이 있는 곳은 그 순간 기준 */
export function zoneOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, Number(p.value)]),
  );
  const local = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const utc = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((local - utc) / 60_000);
}
