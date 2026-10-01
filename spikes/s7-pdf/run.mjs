import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage();
await p.goto("http://127.0.0.1:8799/");
await p.waitForFunction(() => window.ready);
for (const cfg of [
  { pages: 100, subset: true, images: false },
  { pages: 100, subset: false, images: false },
  { pages: 100, subset: true, images: true },
]) {
  const r = await p.evaluate((c) => window.runPdf(c), cfg);
  console.log(JSON.stringify(cfg), "->", r.ms, "ms,", (r.bytes / 1024 / 1024).toFixed(2), "MB");
}
await b.close();
