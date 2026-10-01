// 출시는 한국어만. 라우팅(경로 접두사) 없이 단일 로캘로 운용한다(ARCHITECTURE §1).
export const locales = ["ko"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";
export const timeZone = "Asia/Seoul";
