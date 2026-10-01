// 무료/프리미엄 경계와 남용 방지 상한을 이 파일 한 곳에서만 정의한다(PRD §5, COST_GUARDS).
// 수치는 초안 — 단가 확인 후 확정(OPEN_QUESTIONS Q-PRICE). 결제(Phase 8) 전에는 모든 Space가 free.

import type { MemberRole } from "@/generated/prisma/client";
import type { RateLimitRule } from "@/server/rate-limit";

export type PlanTier = "free" | "premium";

export const RATE_LIMITS = {
  /** G-07: 로그인 시작·콜백 요청(IP당) */
  authPerIp: { limit: 30, windowSec: 60 * 60 },
  /** G-07: 초대 발급(사용자당) */
  inviteIssuePerUser: { limit: 20, windowSec: 24 * 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/** G-11: 계정 단위 상한(요금제와 무관) */
export const ACCOUNT_LIMITS = {
  /** 한 사용자가 만들 수 있는 Space 수. 쿨다운 안에 삭제한 Space도 센다 */
  spacesCreatedPerUser: 2,
  /** 삭제된 Space를 다시 만들 수 있게 되기까지(일) */
  deletedSpaceCooldownDays: 30,
  /** 한 사용자가 속할 수 있는 Space 수(양가 조부모 등) */
  membershipsPerUser: 6,
} as const;

/** 초대코드 정책 */
export const INVITE_POLICY = {
  /** 유효 시간 */
  ttlHours: 72,
  /** G-11: Space당 동시에 유효한(미사용·미회수·미만료) 초대 수 */
  activePerSpace: 10,
  /** G-07·G-11: 코드 입력 실패 허용(사용자당) */
  failedAttemptsPerUser: { limit: 5, windowSec: 15 * 60 },
  /** G-07·G-11: 코드 입력 실패 허용(IP당, 여러 계정으로 시도하는 경우) */
  failedAttemptsPerIp: { limit: 20, windowSec: 60 * 60 },
} as const;

type TierLimits = {
  /** G-11: Space당 역할별 멤버 수 */
  membersByRole: Record<MemberRole, number>;
  /** G-11: Space당 아이 수 */
  children: number;
};

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: { membersByRole: { parent: 2, grandparent: 4, relative: 0 }, children: 3 },
  premium: { membersByRole: { parent: 2, grandparent: 4, relative: 14 }, children: 10 },
};

/** Space의 요금제. 구독(Phase 8) 전에는 항상 free */
export function tierOf(): PlanTier {
  return "free";
}
