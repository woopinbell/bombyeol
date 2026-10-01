// 기일 카드(PRD §4.5): 정시 알림 없이 조회 시점에 계산한다(PRD §4.4 pull 원칙).
// 날짜는 @db.Date(UTC 자정)로 다룬다 — "오늘"은 클라이언트의 현지 날짜를 받는다.

const DAY_MS = 24 * 60 * 60 * 1000;

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 그 해의 기일. 2월 29일은 평년에 2월 28일로 본다 */
function anniversaryIn(year: number, passedAt: Date) {
  const month = passedAt.getUTCMonth();
  let day = passedAt.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(year)) day = 28;
  return new Date(Date.UTC(year, month, day));
}

export type Anniversary = {
  /** 다가오는(또는 오늘인) 기일 */
  date: Date;
  /** 그 기일이 몇 주기인지 */
  years: number;
  /** 오늘부터 남은 날(오늘이면 0) */
  daysUntil: number;
};

/** 다음 기일. 떠난 날이 오늘보다 뒤면(입력 오류) 없음 */
export function nextAnniversary(passedAt: Date, today: Date): Anniversary | null {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (passedAt.getTime() > base.getTime()) return null;
  let year = base.getUTCFullYear();
  let date = anniversaryIn(year, passedAt);
  if (date.getTime() < base.getTime() || year === passedAt.getUTCFullYear()) {
    year += 1;
    date = anniversaryIn(year, passedAt);
  }
  return {
    date,
    years: year - passedAt.getUTCFullYear(),
    daysUntil: Math.round((date.getTime() - base.getTime()) / DAY_MS),
  };
}
