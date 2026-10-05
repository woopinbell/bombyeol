import { open, seed, BASE, S } from "./lib.mjs";
import { mkdirSync } from "node:fs";
const s = seed();
const sp = `/s/${s.spaceId}`, ep = `/s/${s.emptySpaceId}`;
const pages = [
  ["01-today", s.mom, sp], ["02-story", s.mom, `${sp}/story`], ["03-us", s.mom, `${sp}/us`],
  ["04-child", s.mom, `${sp}/us/child/${s.bornId}`], ["05-pet", s.mom, `${sp}/us/pet/${s.petId}`],
  ["06-preg", s.mom, `${sp}/us/pregnancy/${s.childId}`], ["07-cal", s.mom, `${sp}/us/calendar`],
  ["08-settings", s.mom, `${sp}/us/settings`], ["09-gma-today", s.grandma, sp], ["10-gma-story", s.grandma, `${sp}/story`],
  ["11-empty-today", s.solo, ep], ["12-empty-story", s.solo, `${ep}/story`], ["13-empty-us", s.solo, `${ep}/us`],
  ["14-login", null, "/login"], ["15-invite", null, "/invite"], ["16-start", s.nofam, "/start"],
];
const only = process.env.ONLY?.split(",");
const modes = (process.env.MODES ?? "light,dark,large320").split(",");
const dir = `${S}/${process.env.OUT ?? "base"}`;
for (const mode of modes) {
  mkdirSync(`${dir}/${mode}`, { recursive: true });
  for (const [name, uid, path] of pages) {
    if (only && !only.includes(name)) continue;
    const width = mode === "large320" ? 320 : 390;
    const o = await open(uid, { ctx: { viewport: { width, height: 844 } }, dark: mode === "dark" });
    const prefs = { theme: mode === "dark" ? "dark" : "light", text: mode === "large320" ? "larger" : "normal", motion: "reduce" };
    await o.ctx.addInitScript((p) => localStorage.setItem("bombyeol.display", JSON.stringify(p)), prefs);
    await o.page.goto(BASE + path, { timeout: 180000, waitUntil: "networkidle" }).catch(() => {});
    await o.page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await o.page.waitForTimeout(500);
    const h = await o.page.evaluate(() => document.documentElement.scrollHeight);
    await o.page.setViewportSize({ width, height: Math.max(844, h) });
    await o.page.waitForLoadState("networkidle").catch(() => {});
    await o.page.waitForTimeout(900);
    await o.page.screenshot({ path: `${dir}/${mode}/${name}.png` });
    if (o.errors.length) console.log(mode, name, o.page.url().replace(BASE, ""), o.errors.slice(0, 2));
    await o.browser.close();
  }
}
console.log("done");
