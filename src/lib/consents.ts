// 동의 항목과 현재 문구 버전(PRIVACY §2.4). 문구(약관, 처리방침, 동의 안내)를 고치면 여기 버전을 올린다 - // 옛 버전 동의는 유효하지 않게 되어 다시 받는다. 문구 초안은 릴리스 전 전문가 검토(PRIVACY §6).

import type { ConsentKind } from "@/generated/prisma/client";

export const CONSENT_VERSIONS = {
  /** 이용약관 */
  terms: "2026-10-05",
  /** 개인정보 처리방침 */
  privacy: "2026-10-05",
  /** 아이 정보 처리(법정대리인 동의) - Space 단위 */
  child_data: "2026-10-05",
  /** 임신(건강) 정보 별도 동의 - Space 단위, 임신 기록 기능을 처음 켤 때 */
  pregnancy: "2026-10-01",
} as const satisfies Record<ConsentKind, string>;

/** 사용자 단위 동의(가입 시) */
export const ACCOUNT_CONSENTS = ["terms", "privacy"] as const satisfies readonly ConsentKind[];

/** Space 단위 동의(그 가족의 아이, 임신 정보를 다루는 parent가 한다) */
export const SPACE_CONSENTS = ["child_data", "pregnancy"] as const satisfies readonly ConsentKind[];

export type AccountConsentKind = (typeof ACCOUNT_CONSENTS)[number];
export type SpaceConsentKind = (typeof SPACE_CONSENTS)[number];
