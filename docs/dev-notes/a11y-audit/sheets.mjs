import { open, seed, BASE, S } from "./lib.mjs";
import { readFileSync } from "node:fs";
const axe = readFileSync(`${S}/node_modules/axe-core/axe.min.js`, "utf8");
const s = seed();
const sp = `/s/${s.spaceId}`;
const flows = [
  ["moment sheet", s.mom, sp, async (p) => p.getByRole("button", { name: /댓글 0/ }).first().click()],
  ["record picker", s.mom, sp, async (p) => p.getByRole("button", { name: "기록하기" }).click()],
  ["story sheet", s.mom, `${sp}/story`, async (p) => p.getByRole("button", { name: /눈 오던 날/ }).click()],
  ["story write", s.grandma, `${sp}/story`, async (p) => p.getByRole("button", { name: "직접 쓰기" }).click()],
  ["ask sheet", s.mom, `${sp}/story`, async (p) => p.getByRole("button", { name: /물어보기/ }).first().click()],
  ["calendar new", s.mom, `${sp}/us/calendar`, async (p) => p.getByRole("button", { name: /일정|더하기/ }).first().click()],
];
for (const mode of ["light", "dark"]) {
  for (const [name, uid, path, act] of flows) {
    const o = await open(uid, { dark: mode === "dark" });
    await o.ctx.addInitScript((t) => localStorage.setItem("bombyeol.display", JSON.stringify({ theme: t, text: "normal", motion: "reduce" })), mode);
    await o.page.goto(BASE + path, { timeout: 180000, waitUntil: "networkidle" }).catch(() => {});
    try { await act(o.page); } catch (e) { console.log(`${mode} ${name}: 열기 실패 ${String(e).slice(0, 80)}`); await o.browser.close(); continue; }
    await o.page.getByRole("dialog").first().waitFor({ timeout: 20000 }).catch(() => {});
    await o.page.waitForTimeout(700);
    await o.page.addScriptTag({ content: axe });
    const r = await o.page.evaluate(async () => {
      const d = document.querySelector("dialog[open], [role=dialog]");
      const res = await axe.run(d ?? document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] });
      const small = [...(d ?? document).querySelectorAll("button, a[href], input, textarea, select")].filter((el) => {
        let b = el.getBoundingClientRect(); if (el.type === "checkbox" || el.type === "radio") b = (el.closest("label") ?? el).getBoundingClientRect();
        return b.height > 0 && (b.height < 44 || b.width < 44);
      }).map((el) => `${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 20)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      const inputs = [...(d ?? document).querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea")].filter((el) => el.getBoundingClientRect().height && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.name);
      return { dialog: !!d, v: res.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]).join(" | ")}`), small, inputs };
    });
    console.log(`${mode} ${name} dialog=${r.dialog} violations=${r.v.length} small=${r.small.length} inputs<16=${r.inputs.length}`);
    for (const x of [...r.v, ...r.small, ...r.inputs]) console.log("   ", x.slice(0, 260));
    await o.browser.close();
  }
}
