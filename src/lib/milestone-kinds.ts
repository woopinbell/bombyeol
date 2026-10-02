/**
 * 마일스톤 종류의 화면용 목록(zod 없이 - 브라우저 번들에 검증 스키마를 싣지 않는다).
 * 값 검증 원본은 src/lib/milestones.ts이고, 둘이 어긋나지 않는지 tests/milestone-kinds.test.ts가 본다.
 */
export type KindInput = "none" | "measure" | "title";

type KindInfo = { input: KindInput; unit?: "cm" | "kg"; once: boolean };

export const MILESTONE_KINDS = {
  child: {
    first_roll: { input: "none", once: true },
    first_sit: { input: "none", once: true },
    first_crawl: { input: "none", once: true },
    first_tooth: { input: "none", once: true },
    first_step: { input: "none", once: true },
    first_word: { input: "none", once: true },
    height: { input: "measure", unit: "cm", once: false },
    weight: { input: "measure", unit: "kg", once: false },
    head: { input: "measure", unit: "cm", once: false },
    custom: { input: "title", once: false },
  },
  pet: {
    adoption: { input: "none", once: true },
    first_walk: { input: "none", once: true },
    weight: { input: "measure", unit: "kg", once: false },
    vaccination: { input: "none", once: false },
    vet_visit: { input: "none", once: false },
    custom: { input: "title", once: false },
  },
} as const satisfies Record<"child" | "pet", Record<string, KindInfo>>;

export function kindInfo(subject: "child" | "pet", kind: string): KindInfo | null {
  const table: Record<string, KindInfo> = MILESTONE_KINDS[subject];
  return Object.hasOwn(table, kind) ? table[kind] : null;
}
