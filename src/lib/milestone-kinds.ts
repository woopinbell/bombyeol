/**
 * 마일스톤 종류의 화면용 목록(zod 없이 - 브라우저 번들에 검증 스키마를 싣지 않는다).
 * 값 검증 원본은 src/lib/milestones.ts이고, 둘이 어긋나지 않는지 tests/milestone-kinds.test.ts가 본다.
 * firstable: "처음" 표시를 켤 수 있는지(사람이 켠다 - 첫 기록이라고 자동으로 붙이지 않는다).
 */
export type KindInput = "none" | "measure" | "title";

export type KindInfo = { input: KindInput; unit?: "cm" | "kg"; once: boolean; firstable: boolean };

const moment = { input: "none", once: false, firstable: true } as const;

export const MILESTONE_KINDS = {
  child: {
    roll: moment,
    sit: moment,
    crawl: moment,
    tooth: moment,
    step: moment,
    word: moment,
    height: { input: "measure", unit: "cm", once: false, firstable: false },
    weight: { input: "measure", unit: "kg", once: false, firstable: false },
    head: { input: "measure", unit: "cm", once: false, firstable: false },
    custom: { input: "title", once: false, firstable: true },
  },
  pet: {
    adoption: { input: "none", once: true, firstable: false },
    walk: moment,
    weight: { input: "measure", unit: "kg", once: false, firstable: false },
    vaccination: { input: "none", once: false, firstable: false },
    vet_visit: { input: "none", once: false, firstable: false },
    custom: { input: "title", once: false, firstable: true },
  },
} as const satisfies Record<"child" | "pet", Record<string, KindInfo>>;

export function kindInfo(subject: "child" | "pet", kind: string): KindInfo | null {
  const table: Record<string, KindInfo> = MILESTONE_KINDS[subject];
  return Object.hasOwn(table, kind) ? table[kind] : null;
}
