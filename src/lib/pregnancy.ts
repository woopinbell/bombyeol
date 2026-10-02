// 임신 주차(PRD §4.2): 저장하지 않고 조회 시점에 출생 예정일로 계산한다(예정일이 바뀌어도 맞도록).
// 예정일 = 마지막 생리 시작일 + 280일(40주 0일) 기준. 날짜는 @db.Date(UTC 자정)로 다룬다.

const DAY_MS = 24 * 60 * 60 * 1000;
const FULL_TERM_DAYS = 280;

export type GestationalAge = { weeks: number; days: number };

/** 그 날짜의 임신 주수(주, 일). 예정일이 없거나 임신 전 날짜면 없음 */
export function gestationalAge(dueDate: Date | null, date: Date): GestationalAge | null {
  if (!dueDate) return null;
  const total = FULL_TERM_DAYS - Math.round((dueDate.getTime() - date.getTime()) / DAY_MS);
  if (total < 0) return null;
  return { weeks: Math.floor(total / 7), days: total % 7 };
}
