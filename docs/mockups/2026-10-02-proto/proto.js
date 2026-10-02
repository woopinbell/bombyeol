// 봄별 모션 프로토타입 — 의존성 없음. 값은 motion.css 토큰과 아래 SPRING 후보만 쓴다(DESIGN §11).
"use strict";
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $("#app");

const SPRING = {
  boop: { stiffness: 300, damping: 10 },    // Josh Comeau Boop(react-spring tension/friction)
  settle: { stiffness: 158, damping: 20 },  // ≈ duration 0.5s · bounce 0.2 (Emil)
};
const SHEET = { closeRatio: 0.25, velocity: 0.4, scrollLock: 100 }; // Vaul 상수
const TOAST = { swipe: 45, velocity: 0.11, max: 3 };                // Sonner 상수
const SPARKLE = { minGap: 50, maxGap: 450, life: 750, total: 2000 }; // Josh Sparkles + SEED 2초 상한

const slow = () => (root.dataset.slow === "on" ? 5 : 1);
const reduced = () => root.dataset.motion === "reduce" || !matchMedia("(prefers-reduced-motion: no-preference)").matches;
const dur = (name) => { const el = document.createElement("i"); el.style.transitionDuration = `var(${name})`; document.body.append(el); const v = parseFloat(getComputedStyle(el).transitionDuration) * 1000; el.remove(); return v; };
const toastLife = () => (root.dataset.toast === "long" ? 6000 : 4000) * slow();

/* ── 스프링: 반-암시적 오일러, 프레임당 4번 나눠 적분 ───────────────── */
function spring({ from = 0, to = 1, stiffness, damping, mass = 1, onUpdate, onDone }) {
  let x = from, v = 0, target = to, last = performance.now(), raf = 0, done = false;
  const step = (now) => {
    const dt = Math.min(0.064, (now - last) / 1000) / slow(); last = now;
    for (let i = 0; i < 4; i++) { const h = dt / 4; const a = (-stiffness * (x - target) - damping * v) / mass; v += a * h; x += v * h; }
    onUpdate(x);
    if (Math.abs(v) < 0.002 && Math.abs(x - target) < 0.002) { onUpdate(target); raf = 0; if (!done) { done = true; onDone && onDone(); } return; }
    raf = requestAnimationFrame(step);
  };
  if (from !== to) raf = requestAnimationFrame(step); // 같은 값이면 놓아 두다가 set()에서 시작
  return { set(t) { target = t; done = false; last = performance.now(); if (!raf) raf = requestAnimationFrame(step); } };
}

/* ── 누름 피드백: SEED 거리 기반(세로 2px) ──────────────────────────── */
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest("[data-press]"); if (!el) return;
  const r = el.getBoundingClientRect(); const basis = Math.max(r.height, r.width / 4, 24);
  el.style.setProperty("--ps", ((basis - 2) / basis).toFixed(4));
  el.classList.add("pressed");
  const up = () => { el.classList.remove("pressed"); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointerup", up); addEventListener("pointercancel", up);
});

/* ── 탭: 이동 없이 200ms 페이드(빈도 높음 → 최소 모션) ───────────────── */
const TAB_ICON = { today: ["today", "todayOn"], story: ["star", "starOn"], us: ["us", "usOn"] };
function setTab(name) {
  $$(".tab").forEach((t) => {
    const on = t.dataset.tab === name; t.classList.toggle("on", on);
    on ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current");
    $(".ic", t).innerHTML = I[TAB_ICON[t.dataset.tab][on ? 1 : 0]];
  });
  $$(".view").forEach((v) => { const on = v.id === "v-" + name; v.hidden = !on; v.classList.remove("enter"); if (on) { void v.offsetWidth; v.classList.add("enter"); } });
  app.classList.toggle("night", name === "story");
  $("#toasts").classList.toggle("no-dock", name !== "today");
}
$$(".tab").forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));
setTab("today");

/* ── 시트: Vaul 방식 ─────────────────────────────────────────────── */
const layer = $("#layer"), sheet = $("#sheet"), scrim = $("#scrim"), list = $("#cmt-list");
let opener = null, sheetOpen = false, lastListScroll = 0;
list.addEventListener("scroll", () => (lastListScroll = performance.now()));
function sheetTransition(on) {
  if (!on) { sheet.style.transition = scrim.style.transition = "none"; return; }
  if (reduced()) { sheet.style.transition = "opacity var(--d-fast) linear"; scrim.style.transition = "opacity var(--d-fast) linear"; }
  else { sheet.style.transition = "transform var(--d-sheet) var(--ease-sheet)"; scrim.style.transition = "opacity var(--d-sheet) var(--ease-sheet)"; }
}
function openSheet(btn) {
  opener = btn; sheetOpen = true;
  $("#sheet-title").textContent = btn.dataset.title || "사진";
  $("#sheet-photo").innerHTML = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[btn.dataset.scene]}</svg>`;
  layer.hidden = false; sheetTransition(false);
  if (reduced()) { sheet.style.transform = "none"; sheet.style.opacity = "0"; } else { sheet.style.transform = "translateY(100%)"; sheet.style.opacity = "1"; }
  scrim.style.opacity = "0"; void sheet.offsetHeight;
  sheetTransition(true); sheet.style.transform = reduced() ? "none" : "translateY(0)"; sheet.style.opacity = "1"; scrim.style.opacity = "1";
  $("#toasts").classList.add("over-sheet");
  $("#sheet-close").focus({ preventScroll: true });
}
function closeSheet() {
  if (!sheetOpen) return; sheetOpen = false; sheetTransition(true);
  if (reduced()) sheet.style.opacity = "0"; else sheet.style.transform = "translateY(100%)";
  scrim.style.opacity = "0";
  setTimeout(() => { if (!sheetOpen) { layer.hidden = true; $("#toasts").classList.remove("over-sheet"); } }, reduced() ? dur("--d-fast") : dur("--d-sheet"));
  opener && opener.focus({ preventScroll: true });
}
$$("#album .photo").forEach((b) => b.addEventListener("click", () => openSheet(b)));
$("#open-cmt").addEventListener("click", () => { openSheet($("#album .photo")); setTimeout(() => $("#cmt-input").focus(), 50); });
$("#sheet-close").addEventListener("click", closeSheet);
scrim.addEventListener("click", closeSheet);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

// 끌어서 닫기: 아래로는 손가락을 그대로, 위로는 로그 감쇠. 놓을 때 25% 또는 0.4px/ms면 닫기
let drag = null;
sheet.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, input, form")) return;
  if (e.target.closest(".list") && (list.scrollTop > 0 || performance.now() - lastListScroll < SHEET.scrollLock)) return;
  drag = { y: e.clientY, t: performance.now(), dy: 0, h: sheet.getBoundingClientRect().height };
  sheet.setPointerCapture(e.pointerId); sheetTransition(false);
});
sheet.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const raw = e.clientY - drag.y; drag.dy = raw;
  const off = raw >= 0 ? raw : -8 * Math.log(1 - raw);
  if (!reduced()) sheet.style.transform = `translateY(${off}px)`;
  scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, raw) / drag.h));
});
const endDrag = () => {
  if (!drag) return; const d = drag; drag = null;
  const v = d.dy / Math.max(1, performance.now() - d.t) / slow();
  if (d.dy > d.h * SHEET.closeRatio || (d.dy > 0 && v > SHEET.velocity)) closeSheet();
  else { sheetTransition(true); sheet.style.transform = reduced() ? "none" : "translateY(0)"; scrim.style.opacity = "1"; }
};
sheet.addEventListener("pointerup", endDrag); sheet.addEventListener("pointercancel", endDrag);

// 댓글
$("#cmt-form").addEventListener("submit", (e) => {
  e.preventDefault(); const inp = $("#cmt-input"); const text = inp.value.trim();
  if (!text) { $("#hint").textContent = "남길 말을 먼저 써 주세요"; inp.focus(); return; }
  $("#hint").textContent = "";
  const c = document.createElement("div"); c.className = "c"; c.innerHTML = `<b>엄마</b> ${text.replace(/[<>&]/g, "")} <span class="cap-t muted">방금</span>`;
  list.append(c); list.scrollTop = list.scrollHeight; inp.value = "";
  $("#cmt-n").textContent = String(+$("#cmt-n").textContent + 1);
  toast("댓글을 남겼어요");
});

/* ── 토스트: Sonner 방식 ─────────────────────────────────────────── */
function toast(msg) {
  const box = $("#toasts");
  while (box.children.length >= TOAST.max) box.firstElementChild.remove();
  const el = document.createElement("div"); el.className = "toast from";
  el.innerHTML = `<span class="msg">${msg}</span><button class="btn" data-press>닫기</button>`;
  box.append(el); void el.offsetHeight; el.classList.remove("from");
  let remaining = toastLife(), started = performance.now(), timer = 0, gone = false;
  const dismiss = () => { if (gone) return; gone = true; clearTimeout(timer); el.classList.add("from"); setTimeout(() => el.remove(), reduced() ? dur("--d-fast") : dur("--d-toast")); };
  const run = () => { started = performance.now(); timer = setTimeout(dismiss, remaining); };
  const pause = () => { clearTimeout(timer); remaining -= performance.now() - started; };
  el.addEventListener("pointerenter", pause); el.addEventListener("pointerleave", run);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : run()));
  $("button", el).addEventListener("click", dismiss);
  let sw = null;
  el.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; sw = { y: e.clientY, t: performance.now() }; el.setPointerCapture(e.pointerId); el.style.transition = "none"; });
  el.addEventListener("pointermove", (e) => { if (sw) el.style.transform = `translateY(${Math.max(0, e.clientY - sw.y)}px)`; });
  el.addEventListener("pointerup", (e) => {
    if (!sw) return; const dy = e.clientY - sw.y, v = dy / Math.max(1, performance.now() - sw.t); sw = null; el.style.transition = ""; el.style.transform = "";
    if (dy > TOAST.swipe || v > TOAST.velocity) dismiss();
  });
  run();
}

/* ── 좋아요: 누름 피드백 + 상태만(축하 모션 없음 — 자주 쓰는 것) ─────── */
$("#like").addEventListener("click", (e) => {
  const b = e.currentTarget; const on = b.getAttribute("aria-pressed") !== "true";
  b.setAttribute("aria-pressed", String(on)); b.classList.toggle("on-like", on); $(".ic", b).classList.toggle("fill", on);
  $("#like-n").textContent = String(+$("#like-n").textContent + (on ? 1 : -1));
});

/* ── 별 하나: Boop(드문 순간 → 즐거움 허용) ───────────────────────── */
$$(".star-btn").forEach((b) => {
  const icon = $(".ic", b);
  const s = spring({ from: 0, to: 0, ...SPRING.boop, onUpdate: (p) => (icon.style.transform = `rotate(${p * 20}deg) scale(${1 + p * 0.2})`) });
  b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") !== "true"; const n = +b.dataset.star + (on ? 1 : 0);
    b.setAttribute("aria-pressed", String(on)); icon.innerHTML = I[on ? "starOn" : "star"];
    $(".num", b).textContent = String(n); b.setAttribute("aria-label", `별 하나 ${on ? "보냈어요" : "보내기"}, 지금 별 ${n}개`);
    $("#star-total").textContent = String(+$("#star-total").textContent + (on ? 1 : -1));
    if (on && !reduced()) { s.set(1); setTimeout(() => s.set(0), 150 * slow()); }
  });
});

/* ── 사진 안착: settle 스프링 + 50ms 간격 ──────────────────────────── */
function addPhotos(scenes) {
  const album = $("#album");
  scenes.forEach((sc, i) => {
    const b = document.createElement("button"); b.className = "photo"; b.dataset.scene = sc; b.dataset.title = "방금 올린 사진"; b.setAttribute("aria-label", "새 사진 자세히 보기"); b.setAttribute("data-press", "");
    b.innerHTML = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[sc]}</svg>`;
    b.addEventListener("click", () => openSheet(b)); b.style.opacity = "0"; album.append(b);
    setTimeout(() => {
      if (reduced()) { b.style.transition = "opacity var(--d-fast) linear"; b.style.opacity = "1"; return; }
      spring({ from: 0, to: 1, ...SPRING.settle, onUpdate: (p) => { b.style.opacity = String(Math.min(1, p)); b.style.transform = `translateY(${(1 - p) * 8}px) scale(${0.95 + 0.05 * p})`; }, onDone: () => (b.style.transform = "") });
    }, i * dur("--stagger"));
  });
  const n = $$("#album .photo").length; $("#photo-count").textContent = `사진 ${n}`;
  toast(`사진 ${scenes.length}장을 올렸어요`);
}
$("#add-photos").addEventListener("click", () => addPhotos(["dog", "sea"]));
$("#demo-photos").addEventListener("click", () => { setTab("today"); addPhotos(["dog", "sea"]); });

/* ── 마일스톤 반짝임: 2초 안에 끝남, 감소 모션이면 정지 ─────────────── */
function milestone() {
  setTab("today"); $("#today-scroll").scrollTop = 0;
  const slot = $("#ms-slot"); slot.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "ms-wrap";
  wrap.innerHTML = `<span class="ms" role="status">${I.spark.replace("<svg ", '<svg class="ic s" ')}지우가 처음 걸었어요</span>`;
  slot.append(wrap);
  if (reduced()) return;
  const chip = $(".ms", wrap);
  spring({ from: 0, to: 1, ...SPRING.settle, onUpdate: (p) => { chip.style.opacity = String(Math.min(1, p)); chip.style.transform = `scale(${0.95 + 0.05 * p})`; } });
  const t0 = performance.now(); const sizes = [12, 16, 20];
  const spawn = () => {
    if (performance.now() - t0 > (SPARKLE.total - SPARKLE.life) * slow()) return;
    const s = document.createElement("span"); s.className = "sparkle"; const z = sizes[Math.floor(Math.random() * 3)];
    Object.assign(s.style, { width: z + "px", height: z + "px", left: `${Math.random() * 100}%`, top: `${-20 + Math.random() * 140}%`, marginLeft: -z / 2 + "px", marginTop: -z / 2 + "px" });
    s.innerHTML = I.spark; wrap.append(s); setTimeout(() => s.remove(), SPARKLE.life * slow());
    setTimeout(spawn, (SPARKLE.minGap + Math.random() * (SPARKLE.maxGap - SPARKLE.minGap)) * slow());
  };
  spawn();
}
$("#demo-ms").addEventListener("click", milestone);
$("#demo-toast").addEventListener("click", () => ["첫 번째 알림이에요", "두 번째 알림이에요", "세 번째 알림이에요"].forEach((m, i) => setTimeout(() => toast(m), i * 300 * slow())));

/* ── 보드 설정 ────────────────────────────────────────────────────── */
$$(".panel [data-set]").forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.set, v = b.dataset.v;
  if (v) root.dataset[k] = v; else delete root.dataset[k];
  $$(`.panel [data-set="${k}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
{ const q = new URLSearchParams(location.search); for (const k of ["theme", "text", "motion", "slow", "sheet", "toast"]) { const v = q.get(k); if (v) { const b = $(`.panel [data-set="${k}"][data-v="${v}"]`); b && b.click(); } } }
window.__proto = { openSheet, closeSheet, toast, milestone, addPhotos, setTab };
