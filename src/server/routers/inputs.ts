import { z } from "zod";

export const spaceName = z.string().trim().min(1).max(40);
export const relationLabel = z.string().trim().min(1).max(20);
export const personName = z.string().trim().min(1).max(30);
/** YYYY-MM-DD → UTC 자정 Date(@db.Date 저장용) */
export const isoDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`));
export const entityId = z.string().min(1).max(64);
/** 화면이 보여준 동의 문구 버전(src/lib/consents.ts) */
export const consentVersion = z.string().min(1).max(32);

const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜가 미래가 아닌지(시간대 차이를 감안해 하루 여유) */
export function isNotFuture(date: Date, now: Date = new Date()) {
  return date.getTime() <= now.getTime() + DAY_MS;
}
