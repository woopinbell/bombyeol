import { open, seed, BASE, S } from "./lib.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const axe = readFileSync(`${S}/node_modules/axe-core/axe.min.js`, "utf8");
const s = seed();
const sp = `/s/${s.spaceId}`;
const pages = [
  [null, "/login"], [null, "/invite"], [null, "/account/delete"],
  [s.mom, sp], [s.mom, `${sp}/story`], [s.mom, `${sp}/us`], [s.mom, `${sp}/us/settings`],
  [s.mom, `${sp}/us/calendar`], [s.mom, `${sp}/us/child/${s.bornId}`], [s.mom, `${sp}/us/pet/${s.petId}`],
  [s.mom, `${sp}/us/pregnancy/${s.childId}`], [s.mom, `${sp}/us/export`], [s.mom, `/start/invite/${s.spaceId}`],
  [s.mom, `${sp}/us/child/new`], [s.mom, `${sp}/us/pet/new`], [s.mom, "/account/delete"],
  [s.grandma, sp], [s.grandma, `${sp}/story`],
];
const modes = (process.env.MODES ?? "light,dark,large320").split(",");
const out = {};
for (const mode of modes) {
  for (const [uid, path] of pages) {
    const width = mode === "large320" ? 320 : 390;
    const o = await open(uid, { ctx: { viewport: { width, height: 800 } }, dark: mode === "dark" });
    const prefs = { theme: mode === "dark" ? "dark" : "light", text: mode === "large320" ? "larger" : "normal", motion: "reduce" };
    await o.ctx.addInitScript((p) => localStorage.setItem("bombyeol.display", JSON.stringify(p)), prefs);
    await o.page.goto(BASE + path, { timeout: 180000, waitUntil: "networkidle" }).catch(() => {});
    await o.page.waitForTimeout(800);
    await o.page.addScriptTag({ content: axe });
    const res = await o.page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] });
      // 고정된 하단 탭, 행동 막대에 그 스크롤 위치에서만 가려진 것은 화면 가운데로 옮겨 다시 본다
      for (const v of r.violations.filter((x) => x.id === "target-size")) {
        const still = [];
        for (const n of v.nodes) {
          const el = document.querySelector(n.target[0]);
          if (!el) { still.push(n); continue; }
          el.scrollIntoView({ block: "center" });
          const again = await axe.run(el, { runOnly: ["target-size"] });
          if (again.violations.length) still.push(n);
        }
        v.nodes = still;
      }
      r.violations = r.violations.filter((v) => v.nodes.length);
      // 터치 타깃: 보이는 버튼, 링크, 입력(글 안 링크 제외) 높이와 너비
      const small = [];
      for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=radio], [role=checkbox]")) {
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || st.display === "none") continue;
        let box = el.getBoundingClientRect();
        if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) box = (el.closest("label") ?? el).getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        if (el.tagName === "A" && st.display === "inline" && el.closest("p")) continue;
        if (box.height < 44 || box.width < 44) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
      const inputs = [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")]
        .filter((el) => el.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => `${el.name} ${getComputedStyle(el).fontSize}`);
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      return {
        violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary || "").split("\n").slice(1, 2).join("")}`) })),
        small, inputs, overflow,
      };
    });
    out[`${mode} ${uid ? (uid === s.mom ? "mom" : "grandma") : "anon"} ${path.replace(s.spaceId, "S").replace(s.bornId, "B").replace(s.petId, "P").replace(s.childId, "C")}`] = res;
    await o.browser.close();
  }
}
writeFileSync(`${S}/a11y-${process.env.TAG ?? "run"}.json`, JSON.stringify(out, null, 1));
const summary = {};
for (const [k, v] of Object.entries(out)) {
  for (const x of v.violations) (summary[`${x.impact} ${x.id}: ${x.help}`] ??= []).push(k);
  if (v.small.length) (summary["touch<44"] ??= []).push(`${k}: ${v.small.join(", ")}`);
  if (v.inputs.length) (summary["input<16px"] ??= []).push(`${k}: ${v.inputs.join(", ")}`);
  if (v.overflow) (summary["horizontal overflow"] ??= []).push(k);
}
for (const [k, v] of Object.entries(summary)) console.log(`\n## ${k} (${v.length})\n  ${v.slice(0, 12).join("\n  ")}`);
