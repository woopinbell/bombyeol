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
  /** G-04: 업로드 URL 발급(사용자당) */
  uploadIssuePerUser: { limit: 120, windowSec: 60 * 60 },
  /** G-04: 업로드 URL 발급(Space당) */
  uploadIssuePerSpace: { limit: 500, windowSec: 24 * 60 * 60 },
  /** G-07: 글 기록(마일스톤·일기) 작성(사용자당) — 파일 없는 쓰기도 폭주를 막는다 */
  recordWritePerUser: { limit: 300, windowSec: 24 * 60 * 60 },
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

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** 업로드 허용 형식(G-01). HEIC 등은 클라이언트가 JPEG로 변환해 올린다 */
export const MEDIA_CONTENT_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/quicktime"],
} as const;

export type MediaKindName = keyof typeof MEDIA_CONTENT_TYPES;

/** 미디어 정책(요금제 무관) */
export const MEDIA_POLICY = {
  /** 업로드 URL 유효 시간(초) */
  uploadUrlTtlSec: 10 * 60,
  /** 발급 후 이 시간 안에 confirm하지 않으면 버려진 업로드로 본다(한도 계산 제외, Cron 정리) */
  pendingTtlSec: 60 * 60,
  /** G-04: Space당 동시에 열린(미확정) 업로드 수 */
  pendingPerSpace: 20,
  /** 읽기용 서명 URL 유효 시간(초) */
  readUrlTtlSec: 60 * 60,
} as const;

/** 오늘(봄) 기록 정책(요금제 무관) */
export const MOMENT_POLICY = {
  /** Moment 하나에 붙일 수 있는 사진·영상 수 */
  maxMediaPerMoment: 10,
  /** 본문(설명·일기) 최대 글자 수 */
  bodyMaxChars: 2000,
  /** 피드 한 번에 가져오는 수 */
  pageSize: 20,
} as const;

type TierLimits = {
  /** G-11: Space당 역할별 멤버 수 */
  membersByRole: Record<MemberRole, number>;
  /** G-11: Space당 아이 수 */
  children: number;
  /** G-11: Space당 반려동물 수 */
  pets: number;
  /** G-01: 파일 하나의 최대 바이트(종류별) */
  maxUploadBytes: Record<MediaKindName, number>;
  /** G-03: Space 총 저장 상한(confirmed + 진행 중 업로드) */
  storageBytes: number;
};

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    membersByRole: { parent: 2, grandparent: 4, relative: 0 },
    children: 3,
    pets: 3,
    maxUploadBytes: { image: 10 * MB, video: 50 * MB },
    storageBytes: 2 * GB,
  },
  premium: {
    membersByRole: { parent: 2, grandparent: 4, relative: 14 },
    children: 10,
    pets: 10,
    maxUploadBytes: { image: 20 * MB, video: 200 * MB },
    storageBytes: 50 * GB,
  },
};

/** Space의 요금제. 구독(Phase 8) 전에는 항상 free */
export function tierOf(): PlanTier {
  return "free";
}
