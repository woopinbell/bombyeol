// 사진 기록 시드: 캔버스로 만든 사진을 실제 업로드 경로(tRPC + dev-media PUT)로 올린다
import { chromium } from "playwright-core";
import superjson from "superjson";
import { execSync } from "node:child_process";
import { seed, BASE } from "./lib.mjs";
const s = seed();
const cookie = (uid) => "authjs.session-token=" + execSync(`node zz-cookie.mjs ${uid}`, { cwd: "/home/user/bombyeol" }).toString().trim();
async function call(uid, path, input) {
  const r = await fetch(`${BASE}/api/trpc/${path}`, { method: "POST", headers: { "content-type": "application/json", cookie: cookie(uid) }, body: JSON.stringify(superjson.serialize(input)) });
  const j = await r.json();
  if (!r.ok) throw new Error(path + " " + JSON.stringify(j).slice(0, 400));
  return superjson.deserialize(j.result.data);
}
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
async function photo(seedN, w, h) {
  const b64 = await page.evaluate(([n, w, h]) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    const pal = [["#9fc6e6", "#e9f1f7", "#7fa36a"], ["#f3d1b5", "#fbe9d8", "#c98f6b"], ["#b7d3a8", "#eef4e6", "#6e8f5c"], ["#d9c4e8", "#f4eefa", "#8c79a6"], ["#f6dd9a", "#fff6df", "#c7a14a"]][n % 5];
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = pal[2]; g.beginPath(); g.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.68 + 0.05 * Math.sin(x / 90 + n))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.arc(w * (0.3 + 0.1 * (n % 4)), h * 0.3, Math.min(w, h) * 0.09, 0, 7); g.fill();
    g.fillStyle = "rgba(60,50,40,.55)"; g.beginPath(); g.ellipse(w * 0.6, h * 0.66, w * 0.07, h * 0.12, 0, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.6, h * 0.5, w * 0.05, 0, 7); g.fill();
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, [seedN, w, h]);
  return Buffer.from(b64, "base64");
}
async function moment(uid, subject, body, when, sizes, n0) {
  const blobs = []; for (let i = 0; i < sizes.length; i++) blobs.push(await photo(n0 + i, ...sizes[i]));
  const tickets = await call(uid, "media.requestUploads", { spaceId: s.spaceId, items: blobs.map((b) => ({ kind: "image", contentType: "image/jpeg", bytes: b.length })) });
  for (let i = 0; i < tickets.length; i++) {
    const r = await fetch(BASE + tickets[i].uploadUrl, { method: "PUT", headers: { ...tickets[i].headers, cookie: cookie(uid) }, body: blobs[i] });
    if (!r.ok) throw new Error("put " + r.status);
  }
  const ids = tickets.map((t) => t.assetId);
  await call(uid, "media.confirmMany", { spaceId: s.spaceId, assetIds: ids });
  return call(uid, "moment.create", { spaceId: s.spaceId, subject, body, takenAt: new Date(when), media: ids.map((assetId) => ({ assetId })) });
}
const kid = { type: "child", childId: s.bornId };
const L = [1200, 900], P = [900, 1200], Q = [1000, 1000];
const m1 = await moment(s.mom, kid, "처음 이유식 먹은 날", "2026-10-05T08:30:00+09:00", [L, P, Q, L, P], 0);
await moment(s.dad, kid, undefined, "2026-10-05T11:00:00+09:00", [P], 5);
await moment(s.mom, { type: "pet", petId: s.petId }, "보리랑 지우, 둘이 낮잠", "2026-10-04T13:00:00+09:00", [L, L], 6);
await moment(s.mom, { type: "family" }, "할머니 댁 마당에서", "2026-10-02T16:00:00+09:00", [L, P, Q], 8);
await moment(s.dad, kid, "목욕하고 나서 기분 최고", "2026-09-28T19:00:00+09:00", [P, Q, L, L, Q, P, L, P, Q], 11);
await call(s.grandma, "reaction.toggleLike", { spaceId: s.spaceId, target: { type: "moment", momentId: m1.id } });
await call(s.dad, "reaction.toggleLike", { spaceId: s.spaceId, target: { type: "moment", momentId: m1.id } });
await call(s.grandma, "reaction.addComment", { spaceId: s.spaceId, target: { type: "moment", momentId: m1.id }, body: "아이고 잘 먹네. 할머니도 먹여 보고 싶다" });
console.log("ok", m1.id);
await browser.close();
