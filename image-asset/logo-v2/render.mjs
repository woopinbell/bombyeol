// 파생 PNG 렌더러(Playwright/Chromium). 실행: node render.mjs  (image-asset/ 기준 상대 경로)
import { chromium } from "playwright";
import path from "node:path"; import fs from "node:fs";
const A = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const jobs = [ // [원본 SVG, 결과 PNG, 폭, 높이, 투명 바탕]
  ["icon/_favicon-png.svg", "icon/favicon-16.png", 16, 16, true],
  ["icon/_favicon-png.svg", "icon/favicon-32.png", 32, 32, true],
  ["icon/_favicon-png.svg", "icon/favicon-48.png", 48, 48, true],
  ["icon/_app.svg", "icon/icon-180.png", 180, 180, false],
  ["icon/_app.svg", "icon/icon-192.png", 192, 192, false],
  ["icon/_app.svg", "icon/icon-512.png", 512, 512, false],
  ["icon/_app.svg", "icon/icon-1024.png", 1024, 1024, false],
  ["icon/_maskable.svg", "icon/maskable-512.png", 512, 512, false],
  ["logo/symbol.svg", "logo/symbol.png", 1040, 1040, true],
  ["logo/symbol-dark.svg", "logo/symbol-dark.png", 1040, 1040, true],
  ["logo/wordmark.svg", "logo/wordmark.png", 1008, 648, true],
  ["logo/wordmark-dark.svg", "logo/wordmark-dark.png", 1008, 648, true],
  ["logo/primary.svg", "logo/primary.png", 1760, 688, true],
  ["logo/primary-dark.svg", "logo/primary-dark.png", 1760, 688, true],
  ["logo/monochrome.svg", "logo/monochrome.png", 1760, 688, true],
  ["logo/stacked.svg", "logo/stacked.png", 1008, 1200, true],
  ["og/og-image.svg", "og/og-image.png", 1200, 630, false],
];
const b = await chromium.launch();
for (const [src, out, w, h, transparent] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const svg = fs.readFileSync(path.join(A, src), "utf8");
  await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${w}" height="${h}" style="display:block"></body></html>`);
  await p.waitForTimeout(50);
  await p.screenshot({ path: path.join(A, out), omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
}
await b.close(); console.log(jobs.length, "png");
