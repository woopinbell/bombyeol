// 매년 돌아오는 날(기일, 생일, 입양기념일, 반복 일정) 계산. 정시 알림 없이 조회 시점에 계산한다(PRD §4.4 pull 원칙).
// 날짜는 @db.Date(UTC 자정)로 다룬다 - "오늘"은 클라이언트의 현지 날짜를 받는다.

const DAY_MS = 24 * 60 * 60 * 1000;

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 그 해의 같은 날(UTC 시각 유지). 2월 29일은 평년에 2월 28일로 본다 */
export function sameDayIn(year: number, date: Date) {
  const month = date.getUTCMonth();
  let day = date.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(year)) day = 28;
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export type Anniversary = {
  /** 다가오는(또는 오늘인) 기념일 */
  date: Date;
  /** 몇 주년(기일은 주기, 생일은 나이)인지 */
  years: number;
  /** 오늘부터 남은 날(오늘이면 0) */
  daysUntil: number;
};

/** 다음 기념일(1주년부터). 기준 날짜가 오늘보다 뒤면(입력 오류, 아직 오지 않은 날) 없음 */
export function nextAnniversary(since: Date, today: Date): Anniversary | null {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (since.getTime() > base.getTime()) return null;
  let year = base.getUTCFullYear();
  let date = sameDayIn(year, since);
  if (date.getTime() < base.getTime() || year === since.getUTCFullYear()) {
    year += 1;
    date = sameDayIn(year, since);
  }
  return {
    date,
    years: year - since.getUTCFullYear(),
    daysUntil: Math.round((date.getTime() - base.getTime()) / DAY_MS),
  };
}
