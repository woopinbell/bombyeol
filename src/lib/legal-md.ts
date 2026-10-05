/**
 * 약관, 처리방침 본문(src/content/legal)의 마크다운 일부만 읽는다: # 제목, ## 소제목, 문단, - 목록, 1. 목록, 표, **굵게**.
 * 의존성 없이 서버에서 블록으로 나누고 화면은 src/components/legal/legal-doc.tsx가 그린다.
 */
export type Inline = { text: string; bold: boolean }[];
export type LegalBlock =
  | { type: "h1" | "h2"; text: string; id: string }
  | { type: "p"; text: Inline }
  | { type: "ul" | "ol"; items: Inline[] }
  | { type: "table"; head: Inline[]; rows: Inline[][] };

export function inline(text: string): Inline {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => inline(c.trim()));

export function parseLegal(md: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = md.split("\n");
  let section = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim(), id: "top" });
    } else if (line.startsWith("## ")) {
      section += 1;
      blocks.push({ type: "h2", text: line.slice(3).trim(), id: `s${section}` });
    } else if (line.startsWith("|")) {
      const head = cells(line);
      const rows: Inline[][] = [];
      i += 1; // 구분선(|---|)
      while (i + 1 < lines.length && lines[i + 1].startsWith("|")) rows.push(cells(lines[++i]));
      blocks.push({ type: "table", head, rows });
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const pattern = ordered ? /^\d+\. / : /^- /;
      const items: Inline[] = [];
      i -= 1;
      while (i + 1 < lines.length && pattern.test(lines[i + 1])) {
        items.push(inline(lines[++i].replace(pattern, "")));
        // 들여쓴 하위 항목은 앞 항목에 이어 붙인다(본문은 한 단계만 쓴다)
        while (i + 1 < lines.length && /^\s+- /.test(lines[i + 1])) {
          items[items.length - 1].push({ text: `\n${lines[++i].trim().slice(2)}`, bold: false });
        }
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
    } else {
      blocks.push({ type: "p", text: inline(line.trim()) });
    }
  }
  return blocks;
}
