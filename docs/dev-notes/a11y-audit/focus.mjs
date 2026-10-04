import { open, seed, BASE } from "./lib.mjs";
const s = seed();
const sp = `/s/${s.spaceId}`;
for (const [uid, path] of [[null, "/login"], [s.mom, sp], [s.mom, `${sp}/story`], [s.mom, `${sp}/us`], [s.mom, `${sp}/us/settings`], [s.mom, `${sp}/us/pet/${s.petId}`]]) {
  const o = await open(uid);
  await o.page.goto(BASE + path, { timeout: 180000, waitUntil: "networkidle" }).catch(() => {});
  await o.page.waitForTimeout(500);
  const bad = new Set(); let n = 0;
  for (let i = 0; i < 60; i++) {
    await o.page.keyboard.press("Tab");
    const r = await o.page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const target = el.matches("input[type=checkbox], input[type=radio], input[type=file]") ? (el.nextElementSibling ?? el) : el;
      const st = getComputedStyle(target);
      const visible = (st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0) || (st.boxShadow && st.boxShadow !== "none");
      return { id: `${el.tagName} ${(el.textContent || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 24)}`, visible };
    });
    if (!r) continue; n++;
    if (!r.visible) bad.add(r.id);
  }
  console.log(`${path.replace(s.spaceId, "S")}: 초점 ${n}회, 표시 없음 ${bad.size} ${[...bad].slice(0, 8).join(" / ")}`);
  await o.browser.close();
}
