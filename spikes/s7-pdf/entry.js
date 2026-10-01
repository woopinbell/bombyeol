import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

function hangulText(n, seed) {
  let s = seed, out = "";
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < n; i++) {
    out += i % 7 === 6 ? " " : String.fromCharCode(0xac00 + Math.floor(rnd() * 2400) * 4 % 11172);
  }
  return out;
}

async function photo(i) {
  const c = new OffscreenCanvas(1200, 900), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 1200, 900);
  gr.addColorStop(0, `hsl(${(i * 37) % 360},60%,60%)`); gr.addColorStop(1, `hsl(${(i * 91) % 360},50%,30%)`);
  g.fillStyle = gr; g.fillRect(0, 0, 1200, 900);
  for (let k = 0; k < 400; k++) { g.fillStyle = `hsla(${(k * i) % 360},70%,50%,0.3)`; g.fillRect((k * 53 * i) % 1200, (k * 31) % 900, 40, 40); }
  const b = await c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  return new Uint8Array(await b.arrayBuffer());
}

window.runPdf = async ({ pages, subset, images }) => {
  const fontBytes = new Uint8Array(await (await fetch("/font.ttf")).arrayBuffer());
  const imgs = [];
  if (images) for (let i = 0; i < pages; i++) imgs.push(await photo(i + 1));
  const t0 = performance.now();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset });
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${p + 1}쪽 — 할머니가 들려준 이야기`, { x: 50, y: 790, size: 18, font, color: rgb(0.2, 0.2, 0.2) });
    let y = images ? 470 : 750;
    if (images) {
      const img = await doc.embedJpg(imgs[p]);
      page.drawImage(img, { x: 50, y: 490, width: 495, height: 280 });
    }
    const text = hangulText(images ? 400 : 900, p + 1);
    for (let i = 0; i < text.length && y > 50; i += 38, y -= 20) {
      page.drawText(text.slice(i, i + 38), { x: 50, y, size: 12, font });
    }
  }
  const bytes = await doc.save();
  return { ms: Math.round(performance.now() - t0), bytes: bytes.length };
};
window.ready = true;
