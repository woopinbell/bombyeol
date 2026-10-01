// 가족 캘린더(PRD §4.4) 조회 계산. 시각 있는 일정은 UTC 순간, 종일 일정은 그 날의 UTC 자정(날짜만 의미).
// 매년 반복 일정은 저장하지 않고 조회 범위 안의 회차를 펼친다(조회 시점 계산).

import { sameDayIn } from "./anniversary";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type Span = { startsAt: Date; endsAt: Date | null };

/** 반 열린 창 [from, to) */
export type Window = { from: Date; to: Date };

function overlaps(span: Span, window: Window) {
  const end = span.endsAt ?? span.startsAt;
  return span.startsAt < window.to && end >= window.from;
}

/** 창 안에 드는 회차. 반복은 처음 해부터, 길이(끝-시작)를 유지한다. 2월 29일은 평년에 2월 28일 */
export function occurrencesIn(
  event: Span & { recurrence: "none" | "yearly" },
  window: Window,
): Span[] {
  if (event.recurrence === "none") return overlaps(event, window) ? [event] : [];
  const duration = event.endsAt ? event.endsAt.getTime() - event.startsAt.getTime() : null;
  const first = event.startsAt.getUTCFullYear();
  const result: Span[] = [];
  for (
    let year = Math.max(first, window.from.getUTCFullYear() - 1);
    year <= window.to.getUTCFullYear();
    year++
  ) {
    const startsAt = sameDayIn(year, event.startsAt);
    const span = {
      startsAt,
      endsAt: duration === null ? null : new Date(startsAt.getTime() + duration),
    };
    if (overlaps(span, window)) result.push(span);
  }
  return result;
}

/**
 * 클라이언트의 현지 날짜 범위(from~to, 둘 다 포함)를 조회 창으로 바꾼다.
 * 종일 일정은 날짜 그대로(UTC 자정 기준), 시각 있는 일정은 현지 자정을 UTC 순간으로(offset = 현지 - UTC, 분).
 */
export function localRangeWindows(from: Date, to: Date, utcOffsetMinutes: number) {
  const end = new Date(to.getTime() + DAY_MS);
  const shift = utcOffsetMinutes * MINUTE_MS;
  return {
    allDay: { from, to: end },
    timed: { from: new Date(from.getTime() - shift), to: new Date(end.getTime() - shift) },
  };
}
