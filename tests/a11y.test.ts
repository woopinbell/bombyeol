import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../src/components/ui/checkbox";
import { Field } from "../src/components/ui/field";
import { TextArea } from "../src/components/ui/text-area";
import tokens from "../src/design/tokens.json";

/**
 * 접근성 게이트(DESIGN §8, §9.1, §12, COMMIT_PLAN Phase 9 `test(a11y)`).
 * 토큰 대비는 tests/design-tokens.test.ts가 본다. 여기서는 터치 크기, 글자 크기, 확대 허용, 공통 조각을 본다.
 * 화면 전체(axe-core, 키보드 초점)는 브라우저 점검으로 따로 한다(docs 브랜치 dev-notes/a11y-audit).
 */

const SRC = join(__dirname, "..", "src");
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

function listTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : listTsx(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("터치 크기(WCAG 2.5.5, 2.5.8, 서울 고령층 표준)", () => {
  it("기본 터치 48px, 어르신 56px - 둘 다 WCAG 2.5.5(44px) 이상", () => {
    expect(tokens.touch.touch).toBeGreaterThanOrEqual(48);
    expect(tokens.touch["touch-elder"]).toBeGreaterThanOrEqual(56);
  });

  it("체크박스는 공통 조각 하나: 글자 라벨 전체가 누르는 곳이고 높이가 터치 크기 이상", () => {
    const out = html(h(Checkbox, { name: "x", label: "라벨", hint: "도움말" }));
    expect(out).toMatch(/<label class="[^"]*min-h-\(--touch\)/);
    // 보이지 않는 실제 입력이 라벨 전체를 덮는다(누르는 곳 = 라벨)
    expect(out).toMatch(/<input type="checkbox"[^>]*class="[^"]*absolute inset-0[^"]*size-full/);
    // 켜짐은 색이 아니라 굵은 테두리와 체크 표시로(색만으로 전하지 않음, WCAG 1.4.1)
    expect(out).toContain("peer-checked:border-(length:--bw-sel)");
    expect(out).toContain("peer-focus-visible:outline");
  });

  it("체크박스를 화면마다 따로 만들지 않는다(src/components/ui/checkbox.tsx만)", () => {
    const offenders = listTsx(SRC)
      .filter((file) => readFileSync(file, "utf8").includes('type="checkbox"'))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual(["components/ui/checkbox.tsx"]);
  });
});

describe("글자 크기(WCAG 1.4.4, 1.4.12, DESIGN §9.1-9)", () => {
  const rem = (key: keyof typeof tokens.font.size) =>
    tokens.font.size[key] * tokens.font.root.normal;

  it("본문 16px 이상, 어르신 입력 18px 이상, 보조 글자도 14px 이상", () => {
    expect(rem("body")).toBeGreaterThanOrEqual(16);
    expect(rem("title-s")).toBeGreaterThanOrEqual(18);
    expect(rem("caption")).toBeGreaterThanOrEqual(14);
  });

  it("본문 줄 간격 1.5 이상", () => {
    expect(tokens.font["line-height"].body).toBeGreaterThanOrEqual(1.5);
  });

  it("글자 크게, 더 크게는 루트 크기를 키운다(rem 기반이라 화면 전체가 함께 커진다)", () => {
    expect(tokens.font.root.large).toBeGreaterThan(tokens.font.root.normal);
    expect(tokens.font.root.larger).toBeGreaterThan(tokens.font.root.large);
  });

  it("입력칸은 본문 크기(iOS 확대 방지 16px 이상), 어르신 화면은 한 단계 크게", () => {
    expect(html(h(Field, { label: "이름", name: "n" }))).toContain("text-body");
    expect(html(h(Field, { label: "이름", name: "n", elder: true }))).toContain("text-title-s");
    expect(html(h(TextArea, { label: "내용", name: "b" }))).toContain("text-body");
  });

  it("화면 확대를 막지 않는다(user-scalable, maximum-scale 없음)", () => {
    const offenders = listTsx(SRC)
      .filter((file) => /user-?scalable|maximum-?scale/i.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
