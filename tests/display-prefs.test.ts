import { afterEach, describe, expect, it } from "vitest";
import {
  DISPLAY_PREFS_KEY,
  DISPLAY_PREFS_SCRIPT,
  readDisplayPrefs,
  setDisplayPref,
} from "../src/lib/display-prefs";

class FakeRoot {
  attrs = new Map<string, string>();
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
  }
  removeAttribute(k: string) {
    this.attrs.delete(k);
  }
}
function fakeStorage(initial?: string, broken = false) {
  const data = new Map<string, string>(initial === undefined ? [] : [[DISPLAY_PREFS_KEY, initial]]);
  return {
    getItem: (k: string) => {
      if (broken) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (broken) throw new Error("blocked");
      data.set(k, v);
    },
  };
}
/** 인라인 스크립트를 가짜 document, localStorage로 실행한다 */
function runScript(stored?: string, broken = false) {
  const root = new FakeRoot();
  new Function("localStorage", "document", DISPLAY_PREFS_SCRIPT)(fakeStorage(stored, broken), {
    documentElement: root,
  });
  return Object.fromEntries(root.attrs);
}

const g = globalThis as Record<string, unknown>;
afterEach(() => {
  delete g.localStorage;
  delete g.document;
});

describe("화면 설정 - 첫 페인트 전 스크립트", () => {
  it("저장된 값이 없으면 속성을 붙이지 않는다(기기 설정을 따름)", () => {
    expect(runScript()).toEqual({});
  });

  it("저장된 설정을 data-* 속성으로 붙인다", () => {
    expect(runScript(JSON.stringify({ theme: "dark", text: "large", motion: "reduce" }))).toEqual({
      "data-theme": "dark",
      "data-text": "large",
      "data-motion": "reduce",
    });
  });

  it("기본값과 허용 목록 밖의 값은 무시한다", () => {
    const stored = JSON.stringify({ theme: "system", text: '"><script>', motion: 1 });
    expect(runScript(stored)).toEqual({});
  });

  it("깨진 JSON, 저장소 차단에도 오류 없이 넘어간다", () => {
    expect(runScript("{not json")).toEqual({});
    expect(runScript(undefined, true)).toEqual({});
  });
});

describe("화면 설정 - 설정 화면용 함수", () => {
  it("setDisplayPref는 저장하고 바로 적용하며, 스크립트와 같은 결과를 낸다", () => {
    const storage = fakeStorage();
    const root = new FakeRoot();
    g.localStorage = storage;
    g.document = { documentElement: root };

    setDisplayPref("theme", "dark");
    setDisplayPref("text", "larger");
    expect(readDisplayPrefs()).toEqual({ theme: "dark", text: "larger", motion: "system" });
    expect(Object.fromEntries(root.attrs)).toEqual({ "data-theme": "dark", "data-text": "larger" });
    expect(runScript(storage.getItem(DISPLAY_PREFS_KEY) ?? undefined)).toEqual(
      Object.fromEntries(root.attrs),
    );

    setDisplayPref("theme", "system");
    expect(root.attrs.has("data-theme")).toBe(false);
  });

  it("저장이 막혀도 이번 화면에는 적용한다", () => {
    const root = new FakeRoot();
    g.localStorage = fakeStorage(undefined, true);
    g.document = { documentElement: root };
    setDisplayPref("motion", "reduce");
    expect(root.attrs.get("data-motion")).toBe("reduce");
  });
});
