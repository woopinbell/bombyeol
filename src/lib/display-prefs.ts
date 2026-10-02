/**
 * 화면 설정(테마·글자 크기·움직임 줄이기)을 <html data-*>로 적용한다.
 * 서버는 설정을 모르므로 첫 페인트 전에 인라인 스크립트가 localStorage를 읽어 속성을 붙인다
 * (Next 가이드 "Preventing Flash Before Hydration"). 값의 의미는 src/app/tokens.css와 DESIGN.md §3.1·§11·§12.
 */
export const DISPLAY_PREFS_KEY = "bombyeol.display";

export const DISPLAY_PREF_VALUES = {
  /** system = 기기 설정을 따른다(속성 없음) */
  theme: ["system", "light", "dark"],
  /** normal = 루트 16px, large 20px, larger 22px */
  text: ["normal", "large", "larger"],
  /** system = 기기 설정을 따른다, reduce = 기기와 상관없이 줄인다 */
  motion: ["system", "reduce"],
} as const;

export type DisplayPrefKey = keyof typeof DISPLAY_PREF_VALUES;
export type DisplayPrefs = { [K in DisplayPrefKey]: (typeof DISPLAY_PREF_VALUES)[K][number] };

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  theme: "system",
  text: "normal",
  motion: "system",
};

/** 기본값이면 속성을 지운다(기기 설정을 따름). 허용 목록 밖의 값은 무시한다. */
function applyTo(root: HTMLElement, prefs: Partial<Record<DisplayPrefKey, unknown>>) {
  for (const key of Object.keys(DISPLAY_PREF_VALUES) as DisplayPrefKey[]) {
    const value = prefs[key];
    const allowed = DISPLAY_PREF_VALUES[key] as readonly unknown[];
    if (!allowed.includes(value) || value === DEFAULT_DISPLAY_PREFS[key])
      root.removeAttribute(`data-${key}`);
    else root.setAttribute(`data-${key}`, String(value));
  }
}

/**
 * <head>에 넣는 인라인 스크립트. applyTo와 같은 규칙을 의존성 없이 다시 쓴 것이다
 * (tests/display-prefs.test.ts가 두 구현이 같은 결과를 내는지 확인한다).
 */
export const DISPLAY_PREFS_SCRIPT = `(function(){try{var a=${JSON.stringify(DISPLAY_PREF_VALUES)},d=${JSON.stringify(
  DEFAULT_DISPLAY_PREFS,
)},p=JSON.parse(localStorage.getItem(${JSON.stringify(DISPLAY_PREFS_KEY)})||"{}")||{},r=document.documentElement;for(var k in a){var v=p[k];if(a[k].indexOf(v)<0||v===d[k])r.removeAttribute("data-"+k);else r.setAttribute("data-"+k,v)}}catch(e){}})()`;

export function readDisplayPrefs(): DisplayPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(DISPLAY_PREFS_KEY) ?? "{}") as Record<
      string,
      unknown
    >;
    const prefs = { ...DEFAULT_DISPLAY_PREFS };
    for (const key of Object.keys(DISPLAY_PREF_VALUES) as DisplayPrefKey[]) {
      if ((DISPLAY_PREF_VALUES[key] as readonly unknown[]).includes(raw?.[key])) {
        (prefs as Record<string, unknown>)[key] = raw[key];
      }
    }
    return prefs;
  } catch {
    return { ...DEFAULT_DISPLAY_PREFS };
  }
}

/** 설정 화면에서 쓴다: 저장하고 바로 적용(새로고침 없이). 저장이 막혀도 이번 화면에는 적용한다. */
export function setDisplayPref<K extends DisplayPrefKey>(
  key: K,
  value: DisplayPrefs[K],
): DisplayPrefs {
  const next = { ...readDisplayPrefs(), [key]: value };
  try {
    localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(next));
  } catch {
    // 사생활 보호 모드 등 — 적용만 한다
  }
  applyTo(document.documentElement, next);
  return next;
}
