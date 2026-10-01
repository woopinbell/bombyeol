import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import ko from "../messages/ko.json";

const SRC = join(__dirname, "..", "src");
const HANGUL = /[ㄱ-ㆎ가-힣]/;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : listFiles(path);
    return [path];
  });
}

// 주석은 검사 대상이 아니다(한국어 주석 허용).
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function collectStrings(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === "string") return [[path.join("."), value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, [...path, key]));
  }
  return [];
}

describe("i18n", () => {
  it("UI 컴포넌트(.tsx)에 한국어 문구를 하드코딩하지 않는다(messages/ko.json 사용)", () => {
    const offenders = listFiles(SRC)
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => HANGUL.test(stripComments(readFileSync(file, "utf8"))))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it("ko 문구에 빈 값이 없다", () => {
    const empty = collectStrings(ko)
      .filter(([, text]) => text.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
