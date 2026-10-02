import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// 사용자 결정(2026-10-02): AI 흔적으로 보이는 문자를 쓰지 않는다. 화면 문구, 코드, 주석 모두.
// 적용된 마이그레이션(prisma/migrations)은 체크섬이 바뀌므로 검사하지 않는다.
// 문자 자체를 쓰지 않으려고 코드 포인트로 만든다: 긴 대시, 짧은 대시, 가운뎃점, 글머리표, 말줄임표, 둥근 따옴표 넷
const BANNED = new RegExp(
  `[${[0x2014, 0x2013, 0xb7, 0x2022, 0x2026, 0x201c, 0x201d, 0x2018, 0x2019].map((c) => String.fromCharCode(c)).join("")}]`,
);
const ROOT = join(__dirname, "..");
const SKIP = new Set(["generated", "fonts", "node_modules"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(p);
    return /\.(ts|tsx|css|json|mjs|prisma|yml|jsonc|md)$/.test(e.name) ? [p] : [];
  });
}

describe("금지 문자(긴 대시, 가운뎃점, 말줄임표, 둥근 따옴표)", () => {
  it("화면 문구, 코드, 테스트에 없다", () => {
    const files = [
      ...walk(join(ROOT, "src")),
      ...walk(join(ROOT, "tests")),
      ...walk(join(ROOT, "messages")),
      ...walk(join(ROOT, "scripts")),
      join(ROOT, "prisma", "schema.prisma"),
    ];
    const offenders = files
      .filter((f) => BANNED.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
