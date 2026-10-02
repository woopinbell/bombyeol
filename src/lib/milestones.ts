// 마일스톤 프리셋(PRD §4.2, §4.2.1). 문구는 kind를 키로 messages에서 찾는다.
// 반려동물 의료 기록은 V1 범위 밖 - 예방접종, 병원 방문은 자유 메모까지만 둔다.

import { z } from "zod";

const note = z.string().trim().min(1).max(500);
const measurement = (min: number, max: number) =>
  z.object({ value: z.number().min(min).max(max), note: note.optional() }).strict();
const event = z.object({ note: note.optional() }).strict();
const custom = z
  .object({ title: z.string().trim().min(1).max(40), note: note.optional() })
  .strict();

/** 한 번만 있는 "처음" 기록인지(대상당 하나) */
type Preset = { value: z.ZodType; once: boolean };

export const CHILD_MILESTONES = {
  height: { value: measurement(20, 200), once: false }, // cm
  weight: { value: measurement(0.3, 150), once: false }, // kg
  head: { value: measurement(20, 70), once: false }, // 머리둘레 cm
  first_roll: { value: event, once: true },
  first_sit: { value: event, once: true },
  first_crawl: { value: event, once: true },
  first_tooth: { value: event, once: true },
  first_step: { value: event, once: true },
  first_word: { value: event, once: true },
  custom: { value: custom, once: false },
} satisfies Record<string, Preset>;

export const PET_MILESTONES = {
  adoption: { value: event, once: true },
  first_walk: { value: event, once: true },
  weight: { value: measurement(0.01, 150), once: false }, // kg
  vaccination: { value: event, once: false },
  vet_visit: { value: event, once: false },
  custom: { value: custom, once: false },
} satisfies Record<string, Preset>;

export type ChildMilestoneKind = keyof typeof CHILD_MILESTONES;
export type PetMilestoneKind = keyof typeof PET_MILESTONES;

export function milestonePreset(subject: "child" | "pet", kind: string): Preset | null {
  const table: Record<string, Preset> = subject === "child" ? CHILD_MILESTONES : PET_MILESTONES;
  return Object.hasOwn(table, kind) ? table[kind] : null;
}

/** 아이 나이(개월)에 맞는 "처음" 기록 제안 창. 의학 기준이 아니라 제안용 넓은 범위 */
const CHILD_AGE_WINDOWS: Partial<Record<ChildMilestoneKind, [number, number]>> = {
  first_roll: [2, 8],
  first_sit: [4, 10],
  first_tooth: [4, 14],
  first_crawl: [5, 12],
  first_word: [8, 20],
  first_step: [8, 20],
};

/** 생일 기준 만 개월 수 */
export function ageInMonths(birthDate: Date, today: Date) {
  let months =
    (today.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - birthDate.getUTCMonth());
  if (today.getUTCDate() < birthDate.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * 아이 나이 기반 제안: 나이 창에 들어온 아직 기록하지 않은 "처음" 기록을 먼저, 그다음 키, 몸무게.
 * 출생 전이면 제안하지 않는다.
 */
export function suggestChildMilestones(
  birthDate: Date | null,
  recorded: ReadonlySet<string>,
  today: Date = new Date(),
): ChildMilestoneKind[] {
  if (!birthDate) return [];
  const age = ageInMonths(birthDate, today);
  const firsts = (Object.entries(CHILD_AGE_WINDOWS) as [ChildMilestoneKind, [number, number]][])
    .filter(([kind, [from, to]]) => age >= from && age <= to && !recorded.has(kind))
    .map(([kind]) => kind);
  return [...firsts, "height", "weight"];
}
