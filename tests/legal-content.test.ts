import { describe, expect, it } from "vitest";
import { PRIVACY_MD } from "../src/content/legal/privacy";
import { TERMS_MD } from "../src/content/legal/terms";
import { CONSENT_VERSIONS } from "../src/lib/consents";
import { inline, parseLegal } from "../src/lib/legal-md";

describe("약관, 처리방침 본문", () => {
  it.each([
    ["terms", TERMS_MD, CONSENT_VERSIONS.terms],
    ["privacy", PRIVACY_MD, CONSENT_VERSIONS.privacy],
  ] as const)(
    "%s: 시행일이 동의 버전과 같다(문구를 고치면 버전을 올려 다시 동의받는다)",
    (_k, md, version) => {
      expect(md).toContain(`시행일: ${version}`);
    },
  );

  it.each([
    ["terms", TERMS_MD],
    ["privacy", PRIVACY_MD],
  ] as const)("%s: 검토 메모(확인 필요, 근거, 코드 이름)가 화면 본문에 새지 않는다", (_k, md) => {
    expect(md).not.toMatch(/확인 필요|근거:|`|^>/m);
  });

  it("처리방침은 법이 요구하는 항목을 빠짐없이 소제목으로 가진다(개인정보 보호법 제30조 - 초안 기준)", () => {
    const headings = parseLegal(PRIVACY_MD)
      .filter((b) => b.type === "h2")
      .map((b) => (b.type === "h2" ? b.text : ""));
    for (const topic of [
      "처리하는 개인정보와 목적",
      "만 14세 미만",
      "민감정보",
      "보유 기간과 파기",
      "제3자 제공",
      "처리 위탁과 국외 이전",
      "권리",
      "안전하게",
      "쿠키",
      "보호책임자",
    ]) {
      expect(
        headings.some((h) => h.includes(topic)),
        topic,
      ).toBe(true);
    }
  });
});

describe("본문 읽기(parseLegal)", () => {
  it("제목, 소제목(앵커), 문단, 목록, 표, 굵게", () => {
    const blocks = parseLegal(
      [
        "# 제목",
        "",
        "## 1. 첫째",
        "",
        "문단 **굵게** 끝",
        "",
        "- 가",
        "  - 하위",
        "- 나",
        "",
        "1. 하나",
        "2. 둘",
        "",
        "| 머리 | 둘 |",
        "|---|---|",
        "| 칸 | **굵은 칸** |",
        "| 칸2 | 칸3 |",
        "",
        "## 2. 둘째",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.type)).toEqual(["h1", "h2", "p", "ul", "ol", "table", "h2"]);
    expect(blocks[1]).toMatchObject({ id: "s1" });
    expect(blocks[6]).toMatchObject({ id: "s2" });
    expect(blocks[2]).toEqual({
      type: "p",
      text: [
        { text: "문단 ", bold: false },
        { text: "굵게", bold: true },
        { text: " 끝", bold: false },
      ],
    });
    expect(blocks[3]).toMatchObject({
      type: "ul",
      items: [inline("가").concat({ text: "\n하위", bold: false }), inline("나")],
    });
    expect(blocks[5]).toMatchObject({
      type: "table",
      rows: [
        [inline("칸"), inline("**굵은 칸**")],
        [inline("칸2"), inline("칸3")],
      ],
    });
  });

  it("실제 본문의 표는 칸 수가 머리와 같다", () => {
    for (const md of [TERMS_MD, PRIVACY_MD]) {
      for (const b of parseLegal(md)) {
        if (b.type === "table") for (const row of b.rows) expect(row.length).toBe(b.head.length);
      }
    }
  });
});
