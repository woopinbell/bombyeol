// 무료/프리미엄 경계와 남용 방지 상한을 이 파일 한 곳에서만 정의한다(PRD §5, COST_GUARDS).
// 수치는 초안 — 단가 확인 후 확정(OPEN_QUESTIONS Q-PRICE). 결제(Phase 8) 전에는 모든 Space가 free.

import type { RateLimitRule } from "@/server/rate-limit";

export const RATE_LIMITS = {
  /** G-07: 로그인 시작·콜백 요청(IP당) */
  authPerIp: { limit: 30, windowSec: 60 * 60 },
} satisfies Record<string, RateLimitRule>;
