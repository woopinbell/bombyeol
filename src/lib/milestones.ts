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

/**
 * once: 대상당 하나뿐인 기록(입양일). firstable: "처음" 표시를 켤 수 있는 기록 - 뒤집기, 이 같은 순간은 여러 번
 * 남기고 그중 하나에만 "처음"을 붙인다(사용자 결정 2026-10-02: 첫 기록을 자동으로 "처음"이라 하면 사실과 다를 수 있다).
 * "처음"은 대상, 종류마다 하나(직접 쓰기는 제목이 달라 제한하지 않는다). 키, 몸무게 같은 측정에는 붙이지 않는다.
 */
type Preset = { value: z.ZodType; once: boolean; firstable: boolean };

const measure = (min: number, max: number): Preset => ({
  value: measurement(min, max),
  once: false,
  firstable: false,
});
const moment: Preset = { value: event, once: false, firstable: true };

export const CHILD_MILESTONES = {
  roll: moment,
  sit: moment,
  crawl: moment,
  tooth: moment,
  step: moment,
  word: moment,
  height: measure(20, 200), // cm
  weight: measure(0.3, 150), // kg
  head: measure(20, 70), // 머리둘레 cm
  custom: { value: custom, once: false, firstable: true },
} satisfies Record<string, Preset>;

export const PET_MILESTONES = {
  adoption: { value: event, once: true, firstable: false },
  walk: moment,
  weight: measure(0.01, 150), // kg
  vaccination: { value: event, once: false, firstable: false },
  vet_visit: { value: event, once: false, firstable: false },
  custom: { value: custom, once: false, firstable: true },
} satisfies Record<string, Preset>;

export type ChildMilestoneKind = keyof typeof CHILD_MILESTONES;
export type PetMilestoneKind = keyof typeof PET_MILESTONES;

export function milestonePreset(subject: "child" | "pet", kind: string): Preset | null {
  const table: Record<string, Preset> = subject === "child" ? CHILD_MILESTONES : PET_MILESTONES;
  return Object.hasOwn(table, kind) ? table[kind] : null;
}

/** "처음" 표시가 대상, 종류마다 하나로 제한되는 종류(직접 쓰기 제외) */
export function firstIsUnique(kind: string) {
  return kind !== "custom";
}

/** 아이 나이(개월)에 맞는 "처음" 순간 제안 창. 의학 기준이 아니라 제안용 넓은 범위 */
const CHILD_AGE_WINDOWS: Partial<Record<ChildMilestoneKind, [number, number]>> = {
  roll: [2, 8],
  sit: [4, 10],
  tooth: [4, 14],
  crawl: [5, 12],
  word: [8, 20],
  step: [8, 20],
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
 * 아이 나이 기반 제안: 나이 창에 들어왔고 아직 "처음"이 붙지 않은 순간을 먼저, 그다음 키, 몸무게.
 * recorded = "처음"이 붙은 종류.
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
