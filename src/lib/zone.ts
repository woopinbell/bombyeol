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

/**
 * 그 시간대의 날짜(YYYY-MM-DD)와 시각(HH:mm)을 순간으로. 화면이 일정을 가족 시간대로 보여주므로 입력도 같은
 * 시간대로 읽는다(기기 시간대가 달라도 적은 그대로 보이게).
 */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // 차이는 그 순간 기준이라 한 번 맞춘 뒤 다시 계산한다(일광 절약 시간 경계)
  const first = asUtc - zoneOffsetMinutes(timeZone, new Date(asUtc)) * 60_000;
  return new Date(asUtc - zoneOffsetMinutes(timeZone, new Date(first)) * 60_000);
}
