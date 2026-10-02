import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tokens from "../src/design/tokens.json";

const APP = join(__dirname, "..", "src", "app");
const tokensCss = readFileSync(join(APP, "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const globalsCss = readFileSync(join(APP, "globals.css"), "utf8");

/** 선택자로 시작하는 첫 블록의 `--이름: 값` 목록 */
function block(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`블록 없음: ${selector}`);
  const body = tokensCss.slice(tokensCss.indexOf("{", start) + 1, tokensCss.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [
      k,
      v.replace(/\s+/g, " ").trim(),
    ]),
  );
}
const root = block(":root");
const ref = (name: string) => (name.startsWith("rgb(") ? name : `var(--${name})`);

// WCAG 2.x 상대 휘도, 대비
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const palette = tokens.palette as Record<string, string>;
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(palette[a]), luminance(palette[b])].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("디자인 토큰 v1 - CSS가 tokens.json과 같다", () => {
  it("팔레트", () => {
    for (const [name, hex] of Object.entries(palette)) {
      expect(root[name]?.toLowerCase(), name).toBe(hex.toLowerCase());
    }
  });

  it.each([
    ["light", ":root"],
    ["dark", ':root[data-theme="dark"]'],
    ["night", '[data-surface="night"]'],
  ] as const)("역할 - %s", (mode, selector) => {
    const css = mode === "light" ? root : block(selector);
    for (const [role, value] of Object.entries(tokens.roles[mode])) {
      expect(css[role], `${mode}.${role}`).toBe(ref(value));
    }
  });

  it("기기 다크 설정 블록이 앱 다크 설정과 같다", () => {
    const media = tokensCss.slice(tokensCss.indexOf("@media (prefers-color-scheme: dark)"));
    for (const [role, value] of Object.entries(tokens.roles.dark)) {
      expect(media, role).toContain(`--${role}: ${ref(value)};`);
    }
  });

  it("간격, 라운드, 선, 터치, 레이아웃", () => {
    const px = {
      ...tokens.space,
      ...tokens.radius,
      ...tokens.touch,
      "content-max": tokens.layout["content-max"],
    };
    for (const [name, value] of Object.entries(px)) expect(root[name], name).toBe(`${value}px`);
    for (const [name, value] of Object.entries(tokens.border))
      expect(root[name], name).toBe(`${value}px`);
  });

  it("글자", () => {
    const short: Record<string, string> = {
      caption: "caption",
      body: "body",
      "title-s": "title-s",
      title: "title",
      display: "display",
    };
    for (const [key, name] of Object.entries(short)) {
      expect(root[`t-${name}`], key).toBe(
        `${tokens.font.size[key as keyof typeof tokens.font.size]}rem`,
      );
      expect(root[`lh-${name}`], key).toBe(
        String(tokens.font["line-height"][key as keyof typeof tokens.font.size]),
      );
    }
    for (const [name, value] of Object.entries(tokens.font.weight))
      expect(root[`w-${name}`], name).toBe(String(value));
    expect(root["font-stack"]).toContain('"Pretendard Variable"');
    expect(tokensCss).toContain(`font-size: ${tokens.font.root.large}px`);
    expect(tokensCss).toContain(`font-size: ${tokens.font.root.larger}px`);
  });

  it("모션", () => {
    const m = tokens.motion;
    for (const ease of ["ease-out", "ease-in-out", "ease-sheet", "ease-press"] as const)
      expect(root[ease], ease).toBe(m[ease]);
    for (const d of ["d-press", "d-fast", "d-base", "d-sheet", "d-toast", "stagger"] as const)
      expect(root[d], d).toBe(`${m[d]}ms`);
    expect(root["toast-life"]).toBe(`${m["toast-life"]}ms`);
  });

  it("외부 로그인 버튼(공식 가이드 값)", () => {
    const { kakao, google } = tokens.external;
    expect(root["kakao-container"]).toBe(kakao.container.toLowerCase());
    expect(root["kakao-label"]).toBe(kakao.label);
    expect(root["kakao-radius"]).toBe(`${kakao.radius}px`);
    for (const k of ["fill", "stroke", "label"] as const) {
      expect(root[`google-${k}`], k).toBe(google.light[k].toLowerCase());
      expect(block(':root[data-theme="dark"]')[`google-${k}`], `dark ${k}`).toBe(
        google.dark[k].toLowerCase(),
      );
    }
  });

  it("Tailwind 기본 팔레트, 라운드, 글자, 그림자, 곡선을 지워 토큰 밖 값이 유틸리티로 새지 않는다", () => {
    for (const ns of ["color", "radius", "text", "font", "font-weight", "shadow", "ease"]) {
      expect(globalsCss, ns).toContain(`--${ns}-*: initial;`);
    }
    expect(globalsCss).toContain("--spacing: 4px;");
  });
});

describe("디자인 토큰 v1 - 대비(DESIGN.md §12.1)", () => {
  const roles = tokens.roles as Record<string, Record<string, string>>;
  const cases: [string, string, string, number][] = [];
  for (const [mode, r] of Object.entries(roles)) {
    cases.push(
      [`${mode} 본문`, r.fg, r.bg, 7],
      [`${mode} 보조 글자`, r["fg-muted"], r.bg, 4.5],
      [`${mode} 누를 수 있는 테두리`, r["line-strong"], r.bg, 3],
      [`${mode} 주 버튼`, r["on-strong"], r.strong, 7],
      [`${mode} 강조 면 위 본문`, "paper", r.surface, 7],
    );
  }
  cases.push(
    ["골드 라벨 / navy", "starlight-gold", "night-navy", 4.5],
    ["골드 라벨 / indigo", "starlight-gold", "night-indigo", 4.5],
    ["골드 / deep", "starlight-gold", "night-deep", 4.5],
    ...(["spring-pink", "spring-green", "spring-yellow", "spring-sky"] as const).map(
      (s) => [`봄 색 위 ink / ${s}`, "ink", s, 4.5] as [string, string, string, number],
    ),
  );

  it.each(cases)("%s ≥ 기준", (_name, a, b, need) => {
    expect(contrast(a, b)).toBeGreaterThanOrEqual(need);
  });

  // 쓰지 않기로 한 조합은 실제로 기준 미달이어야 규칙이 의미가 있다
  it.each([
    ["골드 글자 / paper", "starlight-gold", "paper", 4.5],
    ["봄 색 글자 / paper", "spring-pink", "paper", 4.5],
    ["silver를 누를 수 있는 테두리로 / paper", "night-silver", "paper", 3],
    ["indigo를 누를 수 있는 테두리로 / navy", "night-indigo", "night-navy", 3],
  ] as const)("금지 조합 %s 은 기준 미달", (_name, a, b, need) => {
    expect(contrast(a, b)).toBeLessThan(need);
  });
});
