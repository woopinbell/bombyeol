import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../src/components/ui/button";
import { ChoiceChips } from "../src/components/ui/choice-chips";
import { Field } from "../src/components/ui/field";
import { Steps } from "../src/components/ui/steps";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("공통 화면 조각", () => {
  it("버튼: 기본은 type=button, 누름 피드백 대상, 터치 48px", () => {
    const out = html(h(Button, null, "다음"));
    expect(out).toContain('type="button"');
    expect(out).toContain('data-press=""');
    expect(out).toContain("min-h-(--touch)");
  });

  it("입력칸: 라벨이 칸을 가리키고, 오류, 도움말이 aria로 연결된다", () => {
    const out = html(h(Field, { label: "가족 이름", name: "name", hint: "도움말", error: "오류" }));
    const id = /<input id="([^"]+)"/.exec(out)?.[1];
    expect(id).toBeTruthy();
    expect(out).toContain(`for="${id}"`);
    expect(out).toContain(`aria-describedby="${id}-hint ${id}-error"`);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain('aria-live="polite"');
  });

  it("선택 칩: 자바스크립트 없이 고를 수 있는 라디오, 기본 선택", () => {
    const out = html(
      h(ChoiceChips, {
        name: "relation",
        legend: "관계",
        defaultValue: "b",
        options: [
          { value: "a", label: "가" },
          { value: "b", label: "나" },
        ],
      }),
    );
    expect(out.match(/type="radio"/g)).toHaveLength(2);
    expect(out).toMatch(/<input(?=[^>]*value="b")(?=[^>]*checked="")[^>]*>/);
    expect(out.match(/checked=""/g)).toHaveLength(1);
    expect(out).toContain("<legend");
  });

  it("단계 표시: 점은 읽지 않고 문구만 읽는다", () => {
    const out = html(h(Steps, { current: 1, total: 3, label: "2단계 남았어요" }));
    expect(out).toContain('aria-hidden="true"');
    expect(out.match(/<li /g)).toHaveLength(3);
    expect(out).toContain("2단계 남았어요");
  });
});
