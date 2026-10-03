import { describe, expect, it } from "vitest";
import { STORY_PROMPTS } from "../src/lib/story-prompts";
import { dailyPrompt, parseNarrator, type Narrator } from "../src/lib/story-view";

const keys = Object.keys(STORY_PROMPTS);

describe("이야기 화면 도우미", () => {
  it("오늘의 질문은 같은 날 같은 카드, 날이 바뀌거나 다른 질문을 누르면 다음 카드", () => {
    const none = new Set<string>();
    const a = dailyPrompt(none, "2026-10-02");
    expect(dailyPrompt(none, "2026-10-02")).toBe(a);
    const b = dailyPrompt(none, "2026-10-03");
    expect(b).not.toBe(a);
    expect(dailyPrompt(none, "2026-10-02", 1)).toBe(b);
    // 음수 offset도 카탈로그 안에서 돈다
    expect(keys).toContain(dailyPrompt(none, "2026-10-02", -100));
  });

  it("이미 답한 카드는 건너뛰고, 다 답했으면 전체에서 고른다", () => {
    const answered = new Set(keys.slice(0, keys.length - 1));
    expect(dailyPrompt(answered, "2026-10-02")).toBe(keys.at(-1));
    expect(keys).toContain(dailyPrompt(new Set(keys), "2026-10-02"));
  });

  it("화자 고르기 값은 가족 안의 멤버만 받는다", () => {
    const narrators = [{ memberId: "m1" }, { memberId: "m2" }] as Narrator[];
    expect(parseNarrator("m2", narrators)).toBe("m2");
    expect(parseNarrator("other", narrators)).toBeNull();
    expect(parseNarrator(["m1"], narrators)).toBeNull();
    expect(parseNarrator(undefined, narrators)).toBeNull();
  });
});
