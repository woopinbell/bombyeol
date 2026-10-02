import { describe, expect, it } from "vitest";
import ko from "../messages/ko.json";
import { MILESTONE_KINDS } from "@/lib/milestone-kinds";
import { CHILD_MILESTONES, PET_MILESTONES } from "@/lib/milestones";

describe("마일스톤 화면용 종류 목록", () => {
  it("검증 원본(milestones.ts)과 종류, 한 번뿐인지, 처음을 붙일 수 있는지가 같다", () => {
    for (const [subject, table] of [
      ["child", CHILD_MILESTONES],
      ["pet", PET_MILESTONES],
    ] as const) {
      const ui = MILESTONE_KINDS[subject] as Record<string, { once: boolean; firstable: boolean }>;
      expect(Object.keys(ui).sort()).toEqual(Object.keys(table).sort());
      for (const [kind, preset] of Object.entries(table))
        expect(ui[kind].once, kind).toBe(preset.once);
    }
  });

  it("모든 종류에 고르기 이름과 피드 문구가 있다", () => {
    for (const subject of ["child", "pet"] as const) {
      for (const kind of Object.keys(MILESTONE_KINDS[subject])) {
        expect((ko.milestoneKind[subject] as Record<string, string>)[kind], kind).toBeTruthy();
        expect((ko.milestone[subject] as Record<string, string>)[kind], kind).toBeTruthy();
      }
    }
  });
});
