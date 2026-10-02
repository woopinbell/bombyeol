// 목업 전용 — 사진 자리(평면 도형)와 아이콘을 채운다. 사진 색은 콘텐츠 자리 표시일 뿐 UI 색이 아니다.
// ?theme=dark|light 로 모드를 고정할 수 있다(없으면 기기 설정을 따른다).
{ const t = new URLSearchParams(location.search).get("theme"); if (t) document.documentElement.dataset.theme = t; }
const C = { paper:"#F7F1E6", ink:"#2C2621", navy:"#232B4D", indigo:"#34406B", silver:"#C7CEDD", gold:"#E8C77A", pink:"#F2A7B3", green:"#A9C88C", yellow:"#F4CB6E", sky:"#A8D8E8" };
const SCENES = {
  park: `<rect width="400" height="300" fill="${C.sky}"/><circle cx="320" cy="70" r="34" fill="${C.yellow}"/><path d="M0 220 Q120 150 240 210 T400 190 V300 H0Z" fill="${C.green}"/><circle cx="170" cy="168" r="16" fill="${C.ink}"/><path d="M158 186h24l6 44h-36z" fill="${C.pink}"/><path d="M160 230v24M180 230v24" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`,
  cake: `<rect width="400" height="300" fill="${C.pink}"/><rect x="0" y="220" width="400" height="80" fill="${C.paper}"/><rect x="130" y="150" width="140" height="74" rx="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="4"/><path d="M130 178h140" stroke="${C.ink}" stroke-width="4"/><path d="M200 150v-26" stroke="${C.ink}" stroke-width="5"/><ellipse cx="200" cy="114" rx="7" ry="11" fill="${C.yellow}"/>`,
  dog: `<rect width="400" height="300" fill="${C.yellow}"/><rect x="0" y="230" width="400" height="70" fill="${C.green}"/><ellipse cx="200" cy="200" rx="70" ry="42" fill="${C.ink}"/><circle cx="268" cy="160" r="32" fill="${C.ink}"/><ellipse cx="290" cy="140" rx="10" ry="20" fill="${C.ink}" transform="rotate(30 290 140)"/><path d="M150 236v28M180 236v28M220 236v28M250 236v28" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><path d="M130 190q-30-20-20-50" stroke="${C.ink}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  hands: `<rect width="400" height="300" fill="${C.green}"/><circle cx="150" cy="150" r="60" fill="${C.paper}"/><circle cx="240" cy="160" r="38" fill="${C.pink}"/><path d="M60 300 Q150 220 250 300" fill="${C.paper}"/>`,
  old: `<rect width="400" height="300" fill="${C.silver}"/><rect x="24" y="24" width="352" height="252" fill="none" stroke="${C.paper}" stroke-width="8"/><path d="M40 210h320" stroke="${C.indigo}" stroke-width="3"/><rect x="90" y="120" width="60" height="90" fill="${C.indigo}"/><path d="M80 120l40-36 40 36z" fill="${C.indigo}"/><circle cx="250" cy="150" r="18" fill="${C.navy}"/><path d="M232 170h36l8 40h-52z" fill="${C.navy}"/><circle cx="296" cy="164" r="12" fill="${C.navy}"/><path d="M284 178h24l6 32h-36z" fill="${C.navy}"/>`,
  sea: `<rect width="400" height="300" fill="${C.sky}"/><rect y="180" width="400" height="120" fill="${C.indigo}"/><path d="M0 180h400" stroke="${C.paper}" stroke-width="4"/><circle cx="90" cy="80" r="26" fill="${C.paper}"/>`,
};
const I = {
  sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12C12 8.5 9.5 6 6 6c0 3.5 2.5 6 6 6z"/><path d="M12 10c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>`,
  starFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>`,
  us: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-3.5 2.8-5.5 5.5-5.5s5 2 5.5 5.5"/><path d="M14 15.5c.9-.7 1.9-1 3-1 2.3 0 4 1.7 4.5 5"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
  talk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
  left: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
};
document.querySelectorAll("[data-scene]").forEach(el => { el.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[el.dataset.scene]}</svg>`); });
document.querySelectorAll("[data-i]").forEach(el => { el.innerHTML = I[el.dataset.i]; });
document.querySelectorAll("[data-tabs]").forEach(el => {
  const on = el.dataset.tabs;
  el.innerHTML = [["today","sprout","오늘"],["story","star","이야기"],["us","us","우리"]].map(([k,i,l]) => `<div class="tab${k===on?" on":""}">${I[i]}<span>${l}</span></div>`).join("");
});
