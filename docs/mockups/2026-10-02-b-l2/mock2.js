// 목업 전용. ?theme=dark|light, ?text=large. 아이콘은 심볼(꽃잎 원·다섯 갈래 별·네 갈래 반짝임)의 도형 언어에서 뽑았다(DESIGN §10.4).
{ const q = new URLSearchParams(location.search); const t = q.get("theme"); if (t) document.documentElement.dataset.theme = t; if (q.get("text")) document.documentElement.dataset.text = q.get("text"); }
const C = { paper:"#F7F1E6", ink:"#2C2621", navy:"#232B4D", indigo:"#34406B", silver:"#C7CEDD", gold:"#E8C77A", pink:"#F2A7B3", green:"#A9C88C", yellow:"#F4CB6E", sky:"#A8D8E8" };
const SCENES = {
  park: `<rect width="400" height="300" fill="${C.sky}"/><circle cx="320" cy="70" r="34" fill="${C.yellow}"/><path d="M0 220 Q120 150 240 210 T400 190 V300 H0Z" fill="${C.green}"/><circle cx="170" cy="168" r="16" fill="${C.ink}"/><path d="M158 186h24l6 44h-36z" fill="${C.pink}"/><path d="M160 230v24M180 230v24" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`,
  cake: `<rect width="400" height="300" fill="${C.pink}"/><rect x="0" y="220" width="400" height="80" fill="${C.paper}"/><rect x="130" y="150" width="140" height="74" rx="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="4"/><path d="M130 178h140" stroke="${C.ink}" stroke-width="4"/><path d="M200 150v-26" stroke="${C.ink}" stroke-width="5"/><ellipse cx="200" cy="114" rx="7" ry="11" fill="${C.yellow}"/>`,
  dog: `<rect width="400" height="300" fill="${C.yellow}"/><rect x="0" y="230" width="400" height="70" fill="${C.green}"/><ellipse cx="200" cy="200" rx="70" ry="42" fill="${C.ink}"/><circle cx="268" cy="160" r="32" fill="${C.ink}"/><ellipse cx="290" cy="140" rx="10" ry="20" fill="${C.ink}" transform="rotate(30 290 140)"/><path d="M150 236v28M180 236v28M220 236v28M250 236v28" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>`,
  hands: `<rect width="400" height="300" fill="${C.green}"/><circle cx="150" cy="150" r="60" fill="${C.paper}"/><circle cx="240" cy="160" r="38" fill="${C.pink}"/><path d="M60 300 Q150 220 250 300" fill="${C.paper}"/>`,
  old: `<rect width="400" height="300" fill="${C.silver}"/><rect x="24" y="24" width="352" height="252" fill="none" stroke="${C.paper}" stroke-width="8"/><path d="M40 210h320" stroke="${C.indigo}" stroke-width="3"/><rect x="90" y="120" width="60" height="90" fill="${C.indigo}"/><path d="M80 120l40-36 40 36z" fill="${C.indigo}"/><circle cx="250" cy="150" r="18" fill="${C.navy}"/><path d="M232 170h36l8 40h-52z" fill="${C.navy}"/><circle cx="296" cy="164" r="12" fill="${C.navy}"/><path d="M284 178h24l6 32h-36z" fill="${C.navy}"/>`,
  sea: `<rect width="400" height="300" fill="${C.sky}"/><rect y="180" width="400" height="120" fill="${C.indigo}"/><path d="M0 180h400" stroke="${C.paper}" stroke-width="4"/><circle cx="90" cy="80" r="26" fill="${C.paper}"/>`,
};
const S = (d, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const STAR = `<path d="M12 3.5l2.7 5.85 6.3 1.35-4.5 4.5 1.1 6.3L12 18.35 6.4 21.5l1.1-6.3L3 10.7l6.3-1.35z"/>`;
const SPARK = `<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>`;
const FLOWER = `<circle cx="8.6" cy="9" r="4.1"/><circle cx="14.6" cy="7.6" r="3.6"/><circle cx="15.6" cy="14" r="3.9"/><circle cx="9.4" cy="15.4" r="3.6"/>`;
const I = {
  today: S(FLOWER), todayOn: S(FLOWER, true).replace("<svg ", '<svg style="stroke: var(--bg)" '),
  star: S(STAR), starOn: S(STAR, true),
  us: S(`<circle cx="9" cy="8.5" r="3.4"/><circle cx="16" cy="9.6" r="2.7"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"/><path d="M15 14.9c.4-.2.8-.3 1.2-.3 2.4 0 4.2 1.8 4.8 5.4"/>`),
  usOn: S(`<circle cx="16" cy="9.6" r="2.7" fill="currentColor"/><path d="M15 14.9c.4-.2.8-.3 1.2-.3 2.4 0 4.2 1.8 4.8 5.4"/><circle cx="9" cy="8.5" r="3.4" fill="currentColor" style="stroke: var(--bg)"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6z" fill="currentColor"/>`),
  spark: S(SPARK, true),
  heart: S(`<path d="M12 19.5s-7-4.2-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.4-7 9.6-7 9.6z"/>`),
  talk: S(`<path d="M5 5.5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H10l-4.5 3.5V16H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>`),
  plus: S(`<path d="M12 5v14M5 12h14"/>`),
  right: S(`<path d="M9.5 5.5L16 12l-6.5 6.5"/>`), left: S(`<path d="M14.5 5.5L8 12l6.5 6.5"/>`),
  pen: S(`<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="M13 7l4 4"/>`),
  close: S(`<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`),
  invite: S(`<circle cx="10" cy="8.5" r="3.4"/><path d="M3.5 20c.6-3.6 3.1-5.6 6.5-5.6 1.5 0 2.8.4 3.9 1.1"/><path d="M18 14v6M15 17h6"/>`),
  check: S(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
};
document.querySelectorAll("[data-scene]").forEach(el => el.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[el.dataset.scene]}</svg>`));
document.querySelectorAll("[data-i]").forEach(el => { el.innerHTML = I[el.dataset.i]; el.classList.add("ic"); });
document.querySelectorAll("[data-tabs]").forEach(el => {
  const on = el.dataset.tabs;
  el.innerHTML = [["today","today","오늘"],["story","star","이야기"],["us","us","우리"]].map(([k,i,l]) => `<div class="tab${k===on?" on":""}"><span class="ic">${I[k===on ? i + "On" : i]}</span><span>${l}</span></div>`).join("");
});
