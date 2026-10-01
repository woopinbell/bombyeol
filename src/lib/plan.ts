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
  /** G-07: 글 기록(마일스톤·일기·임신 기록) 작성(사용자당) — 파일 없는 쓰기도 폭주를 막는다 */
  recordWritePerUser: { limit: 300, windowSec: 24 * 60 * 60 },
  /** G-07: 좋아요 토글(사용자당) */
  likePerUser: { limit: 300, windowSec: 60 * 60 },
  /** G-07: 별 하나 토글(사용자당) */
  starPerUser: { limit: 300, windowSec: 60 * 60 },
  /** G-07: 댓글 작성(사용자당) */
  commentPerUser: { limit: 60, windowSec: 60 * 60 },
  /** G-07: 이야기 작성(사용자당, 대필 포함) */
  storyWritePerUser: { limit: 100, windowSec: 24 * 60 * 60 },
  /** G-07: 물어보기(사용자당) */
  storyAskPerUser: { limit: 30, windowSec: 24 * 60 * 60 },
  /** G-07: 가족 캘린더 일정 쓰기·고치기(사용자당) */
  eventWritePerUser: { limit: 100, windowSec: 24 * 60 * 60 },
  /** G-07: 내보내기 페이지 요청(사용자당) — 읽기 URL 서명이 몰리지 않게 */
  archivePagePerUser: { limit: 500, windowSec: 24 * 60 * 60 },
  /** G-07: 푸시 토큰 등록(사용자당) — 앱을 열 때마다 갱신하므로 여유 있게 */
  pushRegisterPerUser: { limit: 30, windowSec: 24 * 60 * 60 },
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

/** 반응(좋아요·댓글) 정책 */
export const REACTION_POLICY = {
  /** 댓글 최대 글자 수 */
  commentMaxChars: 500,
  /** 댓글 한 번에 가져오는 수 */
  pageSize: 50,
} as const;

/** 이야기(별) 정책(요금제 무관) */
export const STORY_POLICY = {
  /** 본문 최대 글자 수(옛 기억은 길다) */
  bodyMaxChars: 5000,
  /** 제목 최대 글자 수 */
  titleMaxChars: 60,
  /** 이야기 속 시기(연) 하한 — DB 체크 제약(1850)과 맞춘다 */
  minYear: 1850,
  /** 직접 쓴 질문 최대 글자 수 */
  questionMaxChars: 200,
  /** G-07: 어르신 한 분께 동시에 열려 있는(답 없는) 물어보기 수 */
  openAsksPerMember: 30,
  /** 목록 한 번에 가져오는 수 */
  pageSize: 20,
} as const;

/** 임신 기록 정책(요금제 무관, PRIVACY §3) */
export const PREGNANCY_POLICY = {
  /** 메모 최대 글자 수 */
  noteMaxChars: 1000,
  /** 검진 일정은 미래 날짜를 받는다 — 출생 예정일(없으면 오늘) 뒤로 이 날 수까지 */
  checkupMaxDaysAhead: 60,
  /** 목록 한 번에 가져오는 수 */
  pageSize: 30,
} as const;

/** 가족 캘린더 정책(요금제 무관) */
export const EVENT_POLICY = {
  /** G-11: Space당 일정 수(반복 일정은 하나로 센다) */
  maxPerSpace: 500,
  /** 제목 최대 글자 수 */
  titleMaxChars: 40,
  /** 메모 최대 글자 수 */
  noteMaxChars: 500,
  /** 일정 하나의 최대 길이(일) — 여행 같은 며칠짜리 모임까지 */
  maxSpanDays: 31,
  /** 한 번에 조회하는 최대 범위(일) */
  maxRangeDays: 400,
  /** 우리 탭 카드: 기본으로 앞으로 며칠 안의 생일·기념일을 보여주나 */
  upcomingDays: 30,
  /** 우리 탭 카드: 요청할 수 있는 최대 날 수 */
  upcomingMaxDays: 90,
} as const;

/** 웹푸시 정책(요금제 무관, ARCHITECTURE §7). FCM은 무료지만 Workers 하위 요청·소음을 막는다 */
export const PUSH_POLICY = {
  /** G-11: 사용자당 기기 토큰 수. 넘으면 가장 오래 안 쓴 토큰부터 지운다 */
  tokensPerUser: 10,
  /** G-17: 이 날 수 동안 갱신(재등록)되지 않은 토큰은 정리 Cron이 지운다 */
  tokenStaleDays: 60,
  /** FCM 등록 토큰 최대 길이(문자) */
  tokenMaxChars: 4096,
  /** 수신자 한 명에게 시간당 보내는 알림 수(가족 안의 폭주로부터 어르신 보호) */
  perRecipientPerHour: 20,
  /** 이벤트 하나에서 수신자당 보내는 기기 수(최근에 쓴 기기부터) */
  tokensPerRecipient: 3,
  /** 이벤트 하나의 최대 발송 수 — Workers 무료 플랜 하위 요청 50개 안(토큰 교환 1회 포함) */
  maxSendsPerEvent: 40,
  /** 좋아요·별 하나 알림: 같은 대상에 이 시간(초)에 한 번(누가 눌렀든) */
  heartCooldownSec: 6 * 60 * 60,
  /** 댓글 알림: 같은 대상에 이 시간(초)에 한 번 */
  commentCooldownSec: 30 * 60,
} as const;

/** 삭제 정책(PRIVACY §2.5·§5, G-06). 유예 기간은 Q-EXPORT 초안 */
export const DELETION_POLICY = {
  /** Space 삭제 요청 후 파기까지(일). 이 동안 읽기·내보내기·취소만 된다 */
  spaceGraceDays: 30,
  /** 정리 Cron 한 번에 파기 단계를 진행하는 Space 수 */
  spacesPerRun: 10,
  /** 내보내기: 원본 목록 한 페이지(읽기 URL 수) */
  archiveMediaPageSize: 100,
  /** 내보내기: 글 기록 한 페이지 */
  archiveRecordPageSize: 200,
} as const;

/**
 * 기념(별이 되신 가족·반려동물) 정책(PRD §4.5, PRIVACY §5). 요금제와 무관하다 —
 * 구독이 만료돼도 기념 대상의 이야기·사진은 지우지 않고 읽기·내려받기를 유지한다(Phase 8 게이팅의 상위 제약).
 */
export const MEMORIAL_POLICY = {
  /** 기억 메모 최대 글자 수 */
  noteMaxChars: 500,
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
