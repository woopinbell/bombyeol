import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
export const S = "/tmp/claude-0/-home-user-bombyeol/91e60626-bec0-5a75-95bf-99a48db36912/scratchpad";
export const seed = () => JSON.parse(readFileSync(`${S}/seed.json`, "utf8"));
export const BASE = "http://localhost:3100";
export async function open(uid, opts = {}) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: opts.dark ? "dark" : "light", ...opts.ctx });
  if (uid) {
    const v = execSync(`node zz-cookie.mjs ${uid}`, { cwd: "/home/user/bombyeol" }).toString();
    await ctx.addCookies([{ name: "authjs.session-token", value: v, url: BASE }]);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { browser, ctx, page, errors };
}
export function check(cond, label) { console.log(`${cond ? "PASS" : "FAIL"} ${label}`); if (!cond) process.exitCode = 1; }
