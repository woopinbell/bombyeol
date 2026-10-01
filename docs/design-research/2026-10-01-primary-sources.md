# 1차 자료 정독 — 디자인 앵커의 구체 규칙 (2026-10-01)

목적: [`2026-10-01-successor-research.md`](2026-10-01-successor-research.md) §7의 "1차 자료 정독" 작업. 앵커마다 **실제로 읽은 자료(URL)** 에서 수치가 있는 규칙만 뽑고, 봄별에 어떻게 쓸지는 **"우리 해석"** 으로 분리해 적는다.

표기 규칙
- **확인된 규칙**: 해당 URL의 원문(또는 공식 저장소 소스 코드)에서 직접 읽은 것. 따옴표는 원문 그대로.
- **봄별 적용(우리 해석)**: 원저자의 주장이 아니다.
- **미확인**: 읽으려 했으나 못 읽었거나, 검색 요약으로만 본 것. 승격 금지.
- 읽기 방법: WebFetch(페이지를 요약 모델이 읽어 인용), curl로 원문 받기(GitHub raw, llms.txt, PDF → pdftotext). 후자는 원문 전체를 직접 확인했다.

---

## 1. Emil Kowalski — 시트·토스트·이징

### 읽은 자료
- 블로그: [Great animations](https://emilkowal.ski/ui/great-animations), [You don't need animations](https://emilkowal.ski/ui/you-dont-need-animations), [Building a drawer component](https://emilkowal.ski/ui/building-a-drawer-component), [Building a toast component](https://emilkowal.ski/ui/building-a-toast-component)
- 강의 공개 페이지: [animations.dev](https://animations.dev/), [The Easing Blueprint](https://animations.dev/learn/animation-theory/the-easing-blueprint)(공개 열람 가능)
- 본인 저장소의 에이전트 스킬(원문 전체 확인, MIT): [emilkowalski/skills](https://github.com/emilkowalski/skills) — `skills/emil-design-eng/SKILL.md`, `skills/mobile-native/SKILL.md`
- 소스 코드(원문 확인): Vaul [`src/constants.ts`](https://github.com/emilkowalski/vaul/blob/main/src/constants.ts), [`src/index.tsx`](https://github.com/emilkowalski/vaul/blob/main/src/index.tsx), [Vaul README](https://github.com/emilkowalski/vaul), [Vaul API 문서](https://vaul.emilkowal.ski/api); Sonner [`src/index.tsx`](https://github.com/emilkowalski/sonner/blob/main/src/index.tsx), [`src/styles.css`](https://github.com/emilkowalski/sonner/blob/main/src/styles.css), [Toaster 문서](https://sonner.emilkowal.ski/toaster)

### 확인된 규칙

**언제 애니메이션하지 않나 (빈도 기준)** — `emil-design-eng` SKILL.md의 표:

| 빈도 | 결정 |
|---|---|
| 하루 100회+ (단축키, 커맨드 팔레트) | "No animation. Ever." |
| 하루 수십 회 (hover, 목록 이동) | "Remove or drastically reduce" |
| 가끔 (모달, 드로어, 토스트) | "Standard animation" |
| 드묾/처음 (온보딩, 피드백, 축하) | "Can add delight" |

- "Never animate keyboard initiated actions." (Great animations)
- "sometimes the best animation is no animation." / 자주 쓰는 컴포넌트에 넣으면 "a daily annoyance"가 된다 (You don't need animations)

**지속 시간**
- "UI animations should generally stay under `300ms`", "`180ms` dropdown animation feels more responsive than a `400ms` one" (You don't need animations)
- SKILL.md 표: 버튼 누름 100–160ms / 툴팁·작은 팝오버 125–200ms / 드롭다운·셀렉트 150–250ms / 모달·드로어 200–500ms
- 스태거: "Keep stagger delays short (30-80ms between items)… never block interaction while stagger animations are playing."
- 누름은 의도적일 때 느리게(hold-to-delete 2s linear), "release should always be snappy (200ms ease-out)". 퇴장은 등장보다 빠르게.

**이징 곡선 (실제 값)** — SKILL.md
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (강한 ease-out)
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` ("iOS-like drawer curve (from Ionic Framework)")
- "**Never use ease-in for UI animations.**"
- Easing Blueprint(공개 페이지): ease-out = 사용자가 시작한 열기(드롭다운·모달), ease-in-out = 이미 화면에 있는 요소의 이동/변형, ease = hover의 색·배경·투명도, linear = 마키처럼 일정한 것·시간 시각화. 강의 전용 커스텀 곡선 16종은 수강자 전용(미열람).

**스프링**
- 예시 값: `{ type: "spring", duration: 0.5, bounce: 0.2 }`. "Keep bounce subtle (0.1-0.3) when used. Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions."
- 스프링은 중단 시 속도를 유지 → 제스처처럼 중간에 바뀔 수 있는 것에 적합. CSS transition은 중간 재지정 가능, keyframes는 0부터 재시작.

**등장·누름 디테일**
- `scale(0)`에서 시작 금지 → `scale(0.95)` + `opacity: 0`.
- 누를 수 있는 요소 `:active`에 `scale(0.97)`, `transition: transform 160ms ease-out`, 범위 0.95–0.98.
- 팝오버는 트리거 기준 `transform-origin`, **모달은 center 유지**.
- `transform`/`opacity`만 애니메이션(레이아웃 유발 속성 금지). `transition: all` 금지.

**시트(Vaul) — 소스 코드 상수**
- `TRANSITIONS = { DURATION: 0.5, EASE: [0.32, 0.72, 0, 1] }` → 500ms, iOS 시트 곡선
- `VELOCITY_THRESHOLD = 0.4` (px/ms; 이보다 빠르게 내리면 거리와 무관하게 닫힘/스냅 이동)
- `CLOSE_THRESHOLD = 0.25` (시트 높이의 25% 이상 끌면 닫힘)
- `SCROLL_LOCK_TIMEOUT = 100` (내부 스크롤이 맨 위에 닿은 뒤 100ms 동안은 드래그로 닫히지 않음 — 스크롤 관성으로 실수로 닫히는 것 방지)
- 맨 위에서 더 위로 끌면 감쇠("the more you drag, the less the drawer will move"), 첫 터치 외 멀티터치 무시
- 스냅 포인트: 비율 또는 px, 속도로 포인트 건너뛰기 가능(`snapToSequentialPoint`로 끌 수 있음), `fadeFromIndex`로 오버레이 페이드 시작점 지정
- API 기본값: `dismissible: true`, `handleOnly: false`, `repositionInputs: true`. 키보드 등장은 Visual Viewport API로 대응
- **README: "This repo is unmaintained."** → 의존성으로 쓰면 유지보수 위험

**토스트(Sonner) — 소스·문서**
- `TOAST_LIFETIME = 4000`(ms), `VISIBLE_TOASTS_AMOUNT = 3`, `GAP = 14`, `MOBILE_VIEWPORT_OFFSET = '16px'`, `SWIPE_THRESHOLD = 45`(px), 스와이프 속도 `> 0.11`이면 거리와 무관하게 닫힘, `TIME_BEFORE_UNMOUNT = 200`
- `transition: transform 400ms ease` — "slightly slower than typical UI animations and uses `ease` rather than `ease-out` to feel more elegant"
- 쌓인 토스트는 index당 `scale` 0.05씩 축소
- 탭이 숨겨지면(`document.hidden`) 타이머 일시정지, hover 중 정지, 루트에 `aria-live="polite"`
- `@media (prefers-reduced-motion)`에서 토스트 transition/animation 전부 `none`

**감소된 모션**
- "Reduced motion means fewer and gentler animations, not zero. Keep opacity and color transitions that aid comprehension. Remove movement and position animations." 예: `animation: fade 0.2s ease`

**모바일 웹(`mobile-native` SKILL.md)**
- hover 스타일은 `@media (hover: hover) and (pointer: fine)` 안에만
- `-webkit-tap-highlight-color: transparent` + 모든 탭 요소에 자체 `:active`
- `touch-action: manipulation`(탭 지연 제거), 입력 글자 16px 이상(iOS 확대 방지; `maximum-scale=1`은 잘못된 해결)
- 앱 셸 `100dvh`, `overscroll-behavior: none`(루트) / `contain`(시트 등 자식)
- `viewport-fit=cover` + `env(safe-area-inset-*)` — 하단 탭바·토스트·시트에 필수
- 시트 제스처 면에 `touch-action` 축 지정. "Test on hardware before calling it done."

### 봄별 적용 (우리 해석)
- 빈도표를 그대로 쓴다: 탭 전환·목록 스크롤 = 거의 무모션, 시트·토스트 = 표준, "별 하나"·마일스톤 달성 = 드문 순간이라 즐거움 허용.
- 상세 = 시트. 곡선 `cubic-bezier(0.32,0.72,0,1)`은 채택 후보. 단 Vaul은 유지보수 중단 → 직접 구현하거나 Radix Dialog 위에 얇게 구현하고 상수(0.4/0.25/100ms)만 차용 검토.
- **어르신**: 드래그로 닫기는 "있으면 좋은 것"일 뿐, 항상 보이는 [닫기] 버튼을 함께 둔다(WCAG 2.5.7·KWCAG 6.5.1, §6). 실수로 닫히지 않게 어르신 모드에서는 `CLOSE_THRESHOLD`를 높이거나 `handleOnly`에 가깝게 하는 것을 테스트 후보로 둔다.
- 토스트 4초는 어르신에게 짧을 수 있다 → 중요한 결과는 토스트에만 두지 않고 화면에 남긴다. 토스트 시간 연장(예: 6초)은 **우리 가설**, 실사용 테스트로 확인.

### 미확인
- animations.dev 강의 내부 커스텀 곡선 16종(검색 요약에 이름·값이 돌았으나 원문 미열람 → 사용 금지).
- Emil의 현재 소속(이전 문서의 "Linear")은 이번에 재확인하지 않았다.

---

## 2. Rauno Freiberg — 인터랙션 디테일

### 읽은 자료
- [Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design) (rauno.me)
- [Web Interface Guidelines — interfaces.rauno.me](https://interfaces.rauno.me/) (원본 저장소 링크 `raunofreiberg/interfaces`)
- [vercel-labs/web-interface-guidelines README](https://github.com/vercel-labs/web-interface-guidelines) (원문 전체 확인; Vercel 쪽 후속판. **저자 표기는 문서에 없어 Rauno 개인 저작으로 단정하지 않는다**)
- [Devouring Details](https://devouringdetails.com/) 공개 랜딩(장 제목만)
- [interfacecraft.dev](https://www.interfacecraft.dev/)

### 확인된 규칙
**Invisible Details (원리)**
- 은유 재사용: "Great interaction design rewards learning by reusing metaphors"
- 운동량 보존: 던진 제스처는 "retains the momentum and angle at which it was thrown"; 모든 애니메이션은 중단 가능
- 제스처 중 즉시 반응; **가벼운 동작은 스와이프 도중 발동, 파괴적 동작은 제스처가 끝났을 때만**
- 공간 일관성: 나온 곳으로 돌아간다(방향이 위치를 알려준다)
- 빈도와 새로움: 자주 쓰는 것은 최소 모션
- 피츠의 법칙: 크고 가까운 타깃

**interfaces.rauno.me (수치)**
- "Animation duration should not be more than 200ms for interactions to feel immediate"
- 버튼 누름 축소는 "~0.96, ~0.9" 정도(1 → 0.8 같은 과한 값 금지)
- 입력 글자 16px 이상, 터치 기기에서 자동 포커스 금지(키보드가 올라옴), 토글은 확인 없이 즉시 적용, 제출 후 버튼 비활성화(중복 요청 방지), 라벨 클릭 시 입력 포커스, 입력은 `<form>`으로 감싸 Enter 제출

**Vercel Web Interface Guidelines (수치)**
- 히트 타깃: 시각 타깃이 24px 미만이면 히트 영역을 ≥24px로, "On mobile, the minimum size is 44px."
- 로딩 깜빡임 방지: 스피너/스켈레톤은 표시 지연 ~150–300ms + 최소 노출 ~300–500ms
- "Never disable browser zoom." 붙여넣기 막지 않기
- 파괴적 동작: "Require confirmation or provide Undo with a safe window."
- 낙관적 업데이트, 실패 시 롤백 또는 되돌리기
- "Gestures have alternatives": 모든 드래그·스와이프·핀치는 탭/키보드로도
- 토스트·인라인 검증은 `aria-live="polite"`
- 애니메이션: `prefers-reduced-motion` 변형 제공, `transform`/`opacity` 우선, "Only animate when it clarifies cause & effect or when it adds deliberate delight", 중단 가능, 5초 넘는 자동 재생 모션은 정지 수단
- 스켈레톤은 최종 레이아웃과 동일(레이아웃 이동 방지), "Loading…/Saving…"처럼 진행 상태는 말줄임표 `…`
- 모바일에서 자동 포커스 드물게, 시트·모달은 `overscroll-behavior: contain`, 뒤로/앞으로 시 스크롤 위치 복원

**Devouring Details**: 원리 단원 장 제목 — Inferring intent / Interaction metaphors / Ergonomic interactions / Simulating physics / Motion choreography / Responsive interfaces / Contained gestures / Drawing inspiration. 랜딩 문구: "some animation sequences can be improved with just a touch of delay… some interactions just feel better without any motion at all". 본문은 유료.

### 봄별 적용 (우리 해석)
- "파괴적 동작은 제스처 끝에만 + 확인 또는 되돌리기" → 어르신 모드 삭제 2단 확인(DESIGN §6)과 일치. 사진 삭제는 **되돌리기 토스트**를 1순위로, 이야기(녹음·글) 삭제는 확인 시트 + 되돌리기 둘 다.
- 공간 일관성: 시트는 아래에서 올라와 아래로 내려간다. 탭 전환은 슬라이드 없이 페이드(배경 톤 급변 방지, DESIGN §6).
- 사진 업로드: 낙관적 업데이트 + 업로드 중 "올리는 중…" + 스켈레톤 최소 노출 300ms.
- 질문 카드 답변 화면에서 자동 포커스 금지(키보드가 갑자기 올라오면 어르신이 당황) — 대신 큰 [말로 답하기]/[글로 답하기] 버튼.

### 미확인 / 정정
- **정정: interfacecraft.dev는 Rauno가 아니라 Josh Puckett가 만든 유료 멤버십 라이브러리**로 페이지에 표기되어 있다. 이전 연구 문서의 "Rauno — Interface Craft" 귀속은 틀렸다 → 연구 문서 표 수정 필요.
- Devouring Details 각 장의 구체 규칙(유료) 미열람. 랜딩 페이지에 저자 이름이 직접 보이진 않았다(이전 조사의 Rauno 귀속은 Raycast 인터뷰 근거).

---

## 3. Maggie Appleton — 손그림·디지털 가든

### 읽은 자료
- [A Brief History & Ethos of the Digital Garden](https://maggieappleton.com/garden-history)
- [Garden 인덱스](https://maggieappleton.com/garden), [About](https://maggieappleton.com/about), [FAQ](https://maggieappleton.com/faq), [What App is That?(/apps)](https://maggieappleton.com/apps), [Now](https://maggieappleton.com/now)
- [How to Draw Invisible Programming Concepts: Part I](https://maggieappleton.com/drawinginvisibles1)

### 확인된 규칙(특징)
**가든 6패턴** (garden-history): Topography over Timelines(시간순보다 연결) / Continuous Growth("constantly growing, evolving, and changing") / Imperfection & Learning in Public("imperfect by design") / Playful, Personal, Experimental / Intercropping(글·영상·그림 등 여러 매체) / Independent Ownership

**성장 단계(인식 상태)**: 🌱 Seedling "very rough and early ideas" → 🌿 Budding "cleaned up and clarified" → 🌳 Evergreen "reasonably complete"(그래도 계속 돌봄). 노트마다 "planted"(심은 날)와 "last tended"(마지막 돌본 날) 메타데이터. 인덱스는 성장 단계·유형(Essays/Notes/Patterns…)으로 필터.

**일러스트 스타일**
- "a painterly and loose hand-drawn feel", Procreate(iPad Pro) 또는 Photoshop(Wacom Cintiq), 래스터, 브러시는 Max Ulichney의 MaxPacks를 개인화 (/apps)
- 즉흥 스케치가 아니라 "far more crafted and planned" (FAQ)
- 방법: 4층 케이크 — ① 의미 있는 시각 은유 ② 명확한 드로잉 ③ 게슈탈트 기반 구성 ④ 빛·색. "A metaphor is when we understand one thing in terms of another." / "Which metaphor we pick depends on what qualities we want to highlight or hide." (drawinginvisibles1)
- 그림의 개인적 인쇄는 허용(FAQ). **상업적 재사용 라이선스는 명시 없음 → 그의 그림을 가져다 쓰지 않는다.**

### 봄별 적용 (우리 해석, 그의 주장 아님)
- **이야기 정원**: 질문 카드 하나 = 씨앗. 답변 상태를 3단계로 매핑 — 🌱 질문 받음(아직 답 없음) / 🌿 답하는 중(녹음 일부·초안) / 🌳 답 완료(책자에 들어갈 수 있음). 별 영역 톤에 맞게 "새싹 → 꽃 → 별이 켜짐"으로 바꿔 쓸 수도 있다(DESIGN §5 시그니처 순간 후보와 연결).
- "planted / last tended" → "처음 물어본 날 · 마지막으로 이야기한 날". 시간순 피드 대신 주제(어린 시절·일·사랑…)로 묶는 "Topography over Timelines"는 이야기 탭 정보구조 후보.
- "Imperfection by design" → 어르신에게 "완벽하지 않아도 돼요. 생각나는 만큼만 말해 주세요." 같은 부담 낮춤 문구의 근거(문구는 토스 원칙으로 다듬음).
- **빈 화면 일러스트**: 그의 방식에서 가져올 것은 *은유 먼저, 그림은 그다음*이라는 절차와 느슨한 붓 질감. 빈 상태 1장 = 빈 화분/밤하늘 한 장 + 한 줄 문구. 그림 위에 글자를 올리지 않는다(대비 확보). 손그림 여부·제작 방식은 사용자 결정(연구 문서 §7).

### 미확인
- 그가 성장 단계 아이콘을 실제로 어떤 그림으로 표시하는지(인덱스 페이지에서 확인 못 함; 이모지 표기는 garden-history 요약 기준).

---

## 4. Josh Comeau — 마이크로 인터랙션 3개 선정

### 읽은 자료
- [Boop!](https://www.joshwcomeau.com/react/boop/)
- [A Friendly Introduction to Spring Physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)
- [Animated Sparkles in React](https://www.joshwcomeau.com/react/animated-sparkles-in-react/)
- [Accessible Animations in React (prefers-reduced-motion)](https://www.joshwcomeau.com/react/prefers-reduced-motion/)
- [Building a Magical 3D Button](https://www.joshwcomeau.com/animation/3d-button/)
- [Particle effects ✨ (뉴스레터)](https://www.joshwcomeau.com/email/wham-waitlist-001-particles/), [Whimsical Animations](https://whimsy.joshwcomeau.com/)

### 확인된 규칙
- **Boop**: 변형을 잠깐 적용했다가 자동으로 되돌림. 기본 150ms, 스프링 tension 300 / friction 10. 감소 모션이면 "dummy" 스타일로 "the element will never move". "this effect is effective _because_ it's rare". hover뿐 아니라 아무 때나 트리거 가능(hook 분리).
- **스프링**: mass(무게) / tension(팽팽함, 클수록 튀고 빠름) / friction(감쇠, 클수록 덜 튐). 움직임에 적합, 색·투명도엔 덜 필요. JS 구동이라 메인 스레드가 바쁘면 끊길 수 있음.
- **Sparkles**: "something is new and shiny" — 긍정적으로 눈에 띄게. 시작 시 3개, 50–450ms 무작위 간격으로 추가, 각 750ms 후 제거. 감소 모션이면 정적 표시 + 생성 루프 중단. 시각 장식일 뿐이라 의미는 텍스트로.
- **감소 모션 기본값**: 애니메이션을 `@media (prefers-reduced-motion: no-preference)` 안에서만 켠다("start **without animations**, and enable them"). 근거: 전정기관 장애 — "up to 35% of adults 40+".
- **3D 버튼**: 누름 34ms, hover 상승 250ms, 복귀 600ms; 곡선 `cubic-bezier(.3, .7, .4, 1)`(강한 ease-out), 오버슈트 `cubic-bezier(.3, .7, .4, 1.5)`.
- 파티클 Like 버튼: 뉴스레터에는 수치 없음(강의 내용).

### 선정 (≤3) — 봄별 적용 (우리 해석)
1. **"별 하나" 보내기 → Boop** — 탭하면 별 아이콘이 짧게 회전·확대 후 제자리(150ms, tension 300/friction 10 출발값). 이유: 1비트 신호라 "보냈다"는 즉각 확인이 필요하고, 하루 몇 번 안 되는 드문 동작이며, 되돌아오는 모션이라 화면 상태를 바꾸지 않는다. 받는 쪽 알림은 무모션 + 텍스트.
2. **마일스톤 달성 → Sparkles(축소판)** — 마일스톤 칩 주변에 반짝임 2–3초만, 그 후 정지(상시 반복 금지: WCAG/KWCAG 정지 기능 요건과 유아용 앱 느낌 회피). 이유: 그가 말한 "new and shiny"의 긍정적 강조가 정확히 이 순간. 감소 모션이면 정적 반짝임 아이콘만. 의미("첫 걸음마를 기록했어요")는 반드시 글로.
3. **사진 추가 → 스프링으로 자리 잡기** — 새 사진 카드가 `scale(0.95)+opacity 0`에서 약한 스프링(bounce ≤0.2)으로 그리드에 안착. 이유: 쌓이는 즐거움을 움직임으로 보여주는 곳, 스프링은 위치 이동에 적합(그의 스프링 글). 여러 장은 30–80ms 스태거(Emil).
- 버림: 파티클 폭발·컨페티(과함, 수치 미공개), 3D 버튼(어르신 화면에서 그림자·입체 과다 — DESIGN "그림자 금지"와 충돌. 단, 서울디지털재단 키오스크 가이드는 "버튼은 아웃라인, 그림자 또는 입체감" 제공을 권한다 → **버튼 윤곽선**으로 해결).

### 미확인
- Whimsical Animations 강의 내부 수치(유료).

---

## 5. 한국 레퍼런스

### 읽은 자료
- 토스: [8가지 라이팅 원칙(toss.tech)](https://toss.tech/article/8-writing-principles-of-toss), [앱인토스 UI/UX 가이드(원문 .md)](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md) — 이전 문서의 `/design/ux-writing.html`은 **현재 404**, 내용은 consumer-ux-guide로 옮겨진 것으로 보임
- 당근 SEED: [seed-design.io](https://seed-design.io/), [Foundations llms.txt](https://seed-design.io/foundations/llms.txt), 원문: [Motion](https://seed-design.io/llms/foundations/motion.txt), [Feedback/Scale](https://seed-design.io/llms/foundations/feedback/scale.txt), [Inclusive Design](https://seed-design.io/llms/foundations/inclusive-design.txt), [Typography](https://seed-design.io/llms/foundations/typography.txt), [Writing](https://seed-design.io/llms/foundations/writing.txt), [Voice and Tone](https://seed-design.io/llms/foundations/voice-and-tone.txt)
- 배민: [공유마당 주아체](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13288252&menuNo=200023). `font.woowahan.com`(503), `woowahan.com/fonts`(403), 기술블로그(403) **열람 실패**
- 카카오: [더 쉬운 카톡설명서 보도(kakaocorp)](https://www.kakaocorp.com/page/detail/11024)
- 쑥쑥찰칵(아기 사진 앱, 직접 경쟁 영역): [큰글씨 모드를 만든 이유(brunch)](https://brunch.co.kr/@daybabyday/17)
- 네이버: 공식 어르신 UX 자료 **찾지 못함**

### 확인된 규칙
**토스**
- 8원칙: 다음 화면 예측 힌트 / 의미 없는 단어 제거 / 의미 없는 문장 제거 / 핵심 메시지만 / 쉬운 용어 / 강요·공포 대신 제안 / 모두에게 무해한 말 / 숨은 감정 공감
- 앱인토스 UX 라이팅: ① **모든 문구 해요체** ② 능동형("됐어요 → 했어요", '~었' 빼기) ③ 긍정형("안 돼요, 없어요 (X) → ~하면 할 수 있어요 (O)") ④ 캐주얼한 경어("~시겠어요?/~시나요?/~께" 지양, '계시다→있다', '여쭈다→확인하다·묻다')
- "다이얼로그 왼쪽 버튼은 **닫기**" — "취소"는 작업 취소로 오해 가능
- 금지 사례: CTA가 다음 행동을 알려주지 않는 버튼, 뒤로 가기 시 막는 바텀시트, 거절할 수 없는 구조

**당근 SEED**
- 모션: 마이크로 ≤0.2초, 매크로 >0.2초. 곡선 토큰: `easing cubic-bezier(0.35,0,0.35,1)`(기능적 마이크로), `enter (0,0,0.15,1)`, `exit (0.35,0,1,1)`, `enter-expressive (0.03,0.4,0.1,1)`, `exit-expressive (0.35,0,0.95,0.55)`, `pressed-scale (0,0,0.15,1)`. 시간 토큰 d1–d6 = 50/100/150/200/250/300ms, `color-transition`·`pressed-scale` = 150ms
- 누름 축소: **배율이 아니라 거리로** — 세로 2px, `basis = max(높이, 폭÷4, 24)`, `배율 = (basis−2)/basis`, 중심 기준, 자리 차지 불변, 문장 안 링크엔 적용 안 함
- 포용 디자인: 터치 영역 44×44px 이상 이상적, 최소 24×24px. 대비는 APCA — 읽는 텍스트 Lc 75 이상(권장 90), 기타 Lc 60(16px 미만이면 bold), placeholder·disabled Lc 30. 복잡한 제스처(핀치·드래그)엔 단순 터치 대안. 사용자 폰트 크기 설정 따르기. **2초 이상 애니메이션은 지양, 쓰면 건너뛰기 제공**, 초당 3회 이상 번쩍임 금지. 오류는 입력 근처 + `aria-live`
- 타이포: rem 토큰(1rem=16px), t1 11px ~ t14 48px; Windows는 Pretendard
- 라이팅: 익숙한 말(한자어·기술용어 지양), **존칭 최소화**, 숫자는 아라비아 숫자, 축약어 금지, 기능명보다 목적, 한 문장 한 내용, 느낌표는 꼭 필요할 때만, 제목·20pt 이상 큰 글씨·버튼·라벨엔 마침표 없음

**배민 서체**: 주아체는 공유마당에 **OFL**로 등록. 도현체는 한 폰트 유통 사이트 요약에 "임베딩은 별도 계약"이라는 문구가 있었으나 원문(우아한형제들) 미열람 → 서체별로 다를 수 있음.

**카카오**: 더 쉬운 카톡설명서(2024-05-16) — 자사 접근성 디자인 가이드에 따라 "텍스트 크기 확대, 충분한 터치 영역 확보, 명도 대비 조절", 하단 바에 화면 확대·축소·고대비 메뉴, 이지리드(쉬운 말 + 그림).

**쑥쑥찰칵**: 큰글씨 모드에서 "기존에 5개의 하단탭을 단 두개로", 버튼 크기 최적화·인터페이스 단순화, "단순히 글씨만 키우는 것을 넘어". 어르신 1,000명+ 조사로 "크기만 크게 + 갤러리뷰"와 "캘린더뷰"를 선택지로 제공. 수치는 공개 안 됨.

### 봄별 적용 (우리 해석)
- 다이얼로그 왼쪽 버튼 = [닫기]. 버튼 라벨은 결과 행동("이야기 보내기"), 마침표 없음. 숫자는 아라비아 숫자.
- **경어 수준은 결정 필요(신규 열린 질문)**: 토스·당근 모두 "존칭 최소화"지만 봄별의 주 사용자는 조부모. 해요체는 유지하되 조부모 대상 질문 카드 문구에 "~세요/~셨어요"를 허용할지 사용자 결정 → `OPEN_QUESTIONS.md` 추가 후보.
- SEED의 거리 기반 누름(2px)은 버튼 크기가 큰 어르신 화면에서 Emil의 고정 0.97보다 일관적 → 누름 피드백 채택 후보.
- 쑥쑥찰칵 사례는 "어르신 모드 = 탭 수 축소 + 큰 글자"가 같은 도메인에서 검증된 방향이라는 근거. 봄별 3탭은 이미 적다; 어르신 모드에서 탭을 더 줄일지(예: 이야기 + 가족 사진 2개)는 사용자 테스트 후 결정.
- 배민 서체는 손글씨 후보가 아니므로 우선순위 낮음.

### 미확인
- 토스 "타이포 리듬"(시각 규칙) — 이번에도 공개 자료 못 봄.
- 배민 디자인 시스템·서체 라이선스 원문(사이트 403/503).
- 카카오 "접근성 디자인 가이드" 원문(공개 여부 불명), 네이버 어르신 UX 공식 자료.

---

## 6. 어르신 접근성 — KWCAG 2.2 · WCAG 2.2 · 공공 가이드

### 읽은 자료
- **KWCAG 2.2 원문 PDF**(KS X OT0003:2022, 방송통신표준심의회, 2022-12-28 개정, 33개 검사항목): 공식 배포처 [webwatch.or.kr PDF](http://www.webwatch.or.kr/pds/(KS%20X%20OT0003)%20%ED%95%9C%EA%B5%AD%ED%98%95%20%EC%9B%B9%20%EC%BD%98%ED%85%90%EC%B8%A0%20%EC%A0%91%EA%B7%BC%EC%84%B1%20%EC%A7%80%EC%B9%A8%202.2.pdf)는 접속 실패(connection reset) → **동일 문서의 미러** [websoul.co.kr PDF](https://www.websoul.co.kr/accessibility/PDF/%ED%95%9C%EA%B5%AD%ED%98%95%EC%9B%B9%EC%BD%98%ED%85%90%EC%B8%A0%EC%A0%91%EA%B7%BC%EC%84%B1%EC%A7%80%EC%B9%A82.2.pdf)를 전문 확인(표지·심의회 명단 포함)
- **WCAG 2.2**: [W3C Recommendation](https://www.w3.org/TR/WCAG22/)
- **서울디지털재단 「고령층 친화 디지털 접근성 표준」 키오스크 적용가이드**(PDF 메타데이터 2022-01): [PDF(경향신문 게재본)](https://www.khan.co.kr/kh_storytelling/2022/kiosk_quiz/data/kiosk_guide.pdf) 전문 확인
- 같은 표준의 모바일 웹·앱 편: [전자신문 보도(2021-03-29)](https://www.etnews.com/20210329000217) — 원문 PDF는 못 찾음

### 확인된 규칙
**KWCAG 2.2 (원문)**
- 5.4.3 명도 대비 **4.5:1** 이상; 18pt 이상 또는 14pt 이상 굵은 글씨는 3:1까지; 로고·장식 예외
- 6.1.3 콘트롤 크기: "대각선 방향의 길이를 **6.0mm 이상**" 권장, 테두리 안쪽 1px 여백은 반응하지 않게. 기대효과에 "손 떨림이 있는 사용자" 명시
- 6.2.1 응답시간 조절: 시간제한 콘텐츠는 가급적 배제, 필요하면 해제/연장, **최소 20초 전에 사전 안내**. 세션 20시간 이상은 예외
- 6.2.2 자동 변경 콘텐츠는 정지 수단; 6.3.1 초당 3~50회 깜빡임 금지
- 6.5.1 단일 포인터 입력 지원: 핀치·스와이프·드래그·그리기 기능은 한 손가락 탭으로도
- 6.5.2 포인터 입력 취소: 다운 이벤트만으로 실행 금지 / 업 이벤트에 완료 + 중지·취소 가능
- 6.5.3 레이블과 네임: 보이는 텍스트를 접근성 이름에 포함(가능하면 동일)
- 6.5.4 동작기반 작동(흔들기 등)은 UI로도 조작 가능 + 비활성화 가능
- 7.2.2 찾기 쉬운 도움 정보: 각 페이지에서 같은 상대 순서
- 7.3.1 오류 정정: 어느 항목이 왜 틀렸는지 안내
- 7.3.3 접근 가능한 인증: 인지 기능 테스트(비밀번호·패턴·문자 기억·계산·이미지 찾기)에만 의존 금지 → 비밀번호 저장 가능한 마크업, OAuth, 생체·휴대폰 인증 중 하나 이상
- 7.3.4 반복 입력 정보: 같은 과정에서 이미 입력한 정보는 자동 입력 또는 선택 입력

**WCAG 2.2 (W3C)**
- 1.4.3 AA 4.5:1(큰 글씨 3:1) / 1.4.6 AAA **7:1**(큰 글씨 4.5:1)
- 1.4.4 AA 보조기술 없이 **200%** 확대 시 손실 없음 / 1.4.10 AA 리플로 **320 CSS px** 폭에서 2차원 스크롤 없음
- 1.4.11 AA 비텍스트 대비(UI 경계·그래픽) **3:1**
- 1.4.12 AA 텍스트 간격: 줄 간격 1.5배, 문단 2배, 자간 0.12배, 어간 0.16배로 바꿔도 손실 없음
- 2.2.1 A 시간 조절: 기본값의 **10배** 이상 조절 또는 만료 전 **20초** 이상 연장 기회
- 2.3.3 AAA 상호작용으로 생기는 모션은 끌 수 있어야
- 2.5.5 AAA 타깃 **44×44 CSS px** / 2.5.8 AA 타깃 **24×24 CSS px**
- 2.5.7 AA 드래그 동작엔 단일 포인터 대안
- 3.2.6 A 도움 수단 위치 일관 / 3.3.7 A 중복 입력 방지 / 3.3.8 AA 접근 가능한 인증(최소) / 3.3.9 AAA(향상)

**서울디지털재단 고령층 친화 디지털 접근성 표준**
- 기본 10원칙: 글자는 크고 선명 / 필수 요소로 구성 / 단순·친숙한 정보 구조 / 이해하기 쉬운 용어 / 시스템 상태 가시화 / 조작 기능은 행동 유발 / 신속·정확한 조작 / 조작 결과 피드백 / 오류 예방·복구 / 심리적 부담 감소
- 모바일 웹·앱(보도 인용): "글자 크기는 **14포인트 이상**", 필기체·흘림체 같은 복잡한 글꼴 자제, 보편적 용어. 영상 자막은 5초 이상 유지
- 키오스크편(원문): 정보 텍스트 가로·세로 10mm 이상(키오스크 기준), 대비 4.5:1 / 버튼은 **아웃라인·그림자·입체감** 중 하나로 버튼임을 보이게 / 중요 버튼은 색·크기로 구분, 선택 상태 명확 / 일관된 레이아웃 / 전문용어·외래어·약어 대체 / **아이콘은 텍스트와 함께** / 한 화면에 한 과업, 단순 선형 구조, 과업 중 추천·광고 배제 / 현재 단계 표시, "**2단계 남았어요**" 같은 남은 단계 안내 / 조작 결과 피드백 / 초기화 전 사전 안내 + 간단한 연장 / 선택 변경·이전 단계·종료 가능 / 복잡하면 첫 화면에 **간편 모드** / 불빛은 초당 2번 정도
- 서문: "과감히 정보량을 최소화하는 간편 모드를 제공하고, 익숙해지면 기본 모드로"

### 체크리스트 (봄별 구현 게이트 후보)
- [ ] 텍스트 대비 4.5:1 이상(KWCAG 5.4.3·WCAG 1.4.3), 본문은 7:1 목표(1.4.6). 현재 `ink-muted` 4.9:1은 AA만 → 어르신 화면 본문에 쓰지 않기
- [ ] 버튼 윤곽·입력 테두리·포커스 링 3:1 이상(1.4.11) — `night-silver`는 paper 위 대비를 계산해야 함(미계산)
- [ ] 글자 200% 확대·320px 폭에서 깨짐 없음(1.4.4·1.4.10), 텍스트 간격 변경 견딤(1.4.12). 글자 크기는 rem
- [ ] 어르신 화면 본문 18px 이상(DESIGN §4) — 서울 표준 "14포인트 이상"과의 환산은 미확인(아래)
- [ ] 손글씨 글꼴은 본문 금지(서울 표준 "필기체·흘림체 자제"와 일치)
- [ ] 터치 타깃: 최소 44×44(WCAG 2.5.5·SEED·Vercel), 어르신 기본 48–56px(DESIGN §5). 이웃 타깃 간격 확보(KWCAG 6.1.3)
- [ ] 모든 드래그·스와이프(시트 닫기, 토스트 밀기, 사진 넘기기)에 버튼 대안(KWCAG 6.5.1·WCAG 2.5.7)
- [ ] 실행은 손을 뗄 때(업 이벤트), 실수 취소 가능(KWCAG 6.5.2)
- [ ] 아이콘 버튼은 텍스트 라벨 동반, 보이는 라벨 = 접근성 이름(KWCAG 6.5.3·키오스크 1-3)
- [ ] 시간제한 없음: 로그인 세션·녹음·작성 중 초안이 시간 때문에 사라지지 않게(KWCAG 6.2.1·WCAG 2.2.1). 불가피하면 20초 전 안내 + 연장
- [ ] 자동 움직임 5초 넘으면 정지 수단, 2초 넘는 애니메이션 지양(SEED), 깜빡임 초당 3회 미만
- [ ] `prefers-reduced-motion` 존중 + 앱 내 "움직임 줄이기" 설정(WCAG 2.3.3 AAA·SEED)
- [ ] 인증: 비밀번호 암기에 의존하지 않기 — 카카오 로그인(OAuth)·초대 링크·기기 저장(KWCAG 7.3.3·WCAG 3.3.8)
- [ ] 반복 입력 없음: 가족 초대·프로필 정보 자동 채움(KWCAG 7.3.4·WCAG 3.3.7)
- [ ] 오류는 입력 근처에, 무엇을 어떻게 고치는지 + `aria-live`(KWCAG 7.3.1·SEED)
- [ ] 도움말 위치 일관(KWCAG 7.2.2·WCAG 3.2.6)
- [ ] 여러 단계 흐름(첫 가입·책자 만들기)은 현재 단계 + "2단계 남았어요" 안내, 이전·종료 가능(서울 키오스크 2-2·2-3)
- [ ] 과업 중 추천·광고 없음, 한 화면 한 과업(서울 키오스크 2-1)
- [ ] 어르신 모드 = 정보량 최소화한 간편 모드(서울 키오스크 Rule 3, 쑥쑥찰칵 사례)

### 미확인
- KWCAG 2.2 공식 배포처(webwatch.or.kr) 직접 열람 실패 — 미러본과 동일 문서인지 해시 비교는 못 함.
- 서울 표준 모바일편 원문(버튼 크기 수치 포함 여부). "14포인트"가 CSS pt(=18.67px)인지 기기 pt인지 불명.
- WCAG 2.2.6 Timeouts(AAA, 비활성으로 데이터 손실 시 경고) — 이번에 원문 미열람.
- 과기정통부/NIA 명의 고령친화 가이드 — 이번에 찾지 못함(서울디지털재단 것만 확인).

---

## 7. 화면 규칙 후보 (DESIGN.md 반영용, 미확정)

각 규칙 뒤 [출처]. "우리 해석"이 섞인 것은 (해석) 표시.

**모션 일반**
1. 빈도로 결정한다: 하루 수십 번 쓰는 것(탭 전환, 목록, 스크롤)은 무모션 또는 페이드만; 시트·토스트는 표준 모션; 마일스톤·"별 하나"·이야기 완료 같은 드문 순간에만 즐거움 [Emil SKILL 빈도표, Rauno Invisible Details, Josh Boop "effective because it's rare"]
2. UI 모션은 300ms 미만, 마이크로는 200ms 이하 [Emil, SEED Motion, interfaces.rauno.me 200ms]
3. 사용자가 연 것은 ease-out, ease-in 금지; 이미 있는 요소의 이동은 ease-in-out [Emil Easing Blueprint·SKILL]
4. `transform`/`opacity`만 움직이고, `scale(0)` 등장 금지(`0.95`+투명) [Emil SKILL, Vercel WIG]
5. 모든 모션은 중단 가능 [Rauno, Vercel WIG, Emil]
6. 감소 모션: 기본값을 "모션 없음"으로 두고 `no-preference`일 때만 켠다; 감소 모드에선 위치 이동 제거, 200ms 페이드는 유지 [Josh prefers-reduced-motion, Emil SKILL]
7. 2초 넘는 애니메이션 금지(축하 포함), 5초 넘는 자동 움직임 금지, 깜빡임 초당 3회 미만 [SEED Inclusive, Vercel WIG, KWCAG 6.3.1]

**시트**
8. 상세는 아래에서 올라오는 시트, 같은 방향으로 내려간다 [Rauno 공간 일관성, Vaul]
9. 시트에 항상 보이는 [닫기] 버튼; 드래그 닫기는 보조 [KWCAG 6.5.1, WCAG 2.5.7, SEED]
10. 드래그 닫기: 25% 이상 또는 0.4px/ms 이상 빠르게 내릴 때, 내부 스크롤이 맨 위 도달 후 100ms는 닫힘 잠금, 위로 끌면 감쇠 [Vaul 소스] — 어르신 모드는 임계값 상향 테스트 (해석)
11. 시트·모달 `overscroll-behavior: contain`, 하단 요소는 safe-area 여백 [Emil mobile-native, Vercel WIG]

**토스트·피드백**
12. 토스트는 하단 1개(최대 3개 쌓임), `aria-live="polite"`, 탭 숨김·누르는 동안 타이머 정지, 밀어서 닫기 + 닫기 버튼 [Sonner 소스, Vercel WIG]
13. 중요한 결과는 토스트에만 두지 않는다; 어르신 화면 토스트 표시 시간 4초→연장 검토 [Sonner 4000ms + KWCAG 6.2.1 취지] (해석)
14. 삭제는 확인 또는 되돌리기(사진 = 되돌리기 토스트, 이야기 = 확인 + 되돌리기) [Vercel WIG, Rauno "destructive on gesture end"] (적용은 해석)
15. 누름 피드백: 거리 기반 2px 축소(`basis=max(h, w/4, 24)`), 150ms, 문장 속 링크 제외 [SEED Feedback/Scale] — 대안 `scale(0.97)` 160ms [Emil]
16. 실행은 손을 뗄 때 [KWCAG 6.5.2]
17. 로딩: 150–300ms 지연 후 표시, 보이면 최소 300–500ms, 스켈레톤은 최종 레이아웃과 동일, 문구 "올리는 중…" [Vercel WIG]

**입력·모바일 웹**
18. 입력 글자 16px 이상(어르신은 18px+), 확대 막지 않기, 모바일 자동 포커스 금지 [Emil mobile-native, interfaces.rauno.me, Vercel WIG]
19. hover 스타일은 `(hover: hover) and (pointer: fine)` 안에만, 탭 하이라이트 제거 + 자체 `:active`, `touch-action: manipulation`, 앱 셸 `100dvh` [Emil mobile-native]
20. 붙여넣기 막지 않기, 반복 입력 자동 채움 [Vercel WIG, KWCAG 7.3.4]

**접근성·어르신**
21. 터치 타깃 최소 44×44, 어르신 기본 48–56 [WCAG 2.5.5, SEED, Vercel WIG, DESIGN §5]
22. 대비 텍스트 4.5:1 필수, 본문 7:1 목표, UI 경계 3:1 [KWCAG 5.4.3, WCAG 1.4.3/1.4.6/1.4.11]
23. 아이콘은 글자와 함께; 보이는 라벨 = 접근성 이름 [서울 키오스크 1-3, KWCAG 6.5.3]
24. 버튼은 윤곽선으로 버튼임을 보이게(그림자 대신) [서울 키오스크 1-1 + DESIGN "그림자 금지"] (해석)
25. 여러 단계 흐름은 현재 단계 + "2단계 남았어요", 이전·그만하기 항상 가능 [서울 키오스크 2-2·2-3]
26. 시간제한 없음, 작성 중 초안 자동 저장 [KWCAG 6.2.1, WCAG 2.2.1] (자동 저장은 해석)
27. 로그인은 기억 테스트 없이(카카오 OAuth·초대 링크) [KWCAG 7.3.3, WCAG 3.3.8]
28. 어르신 모드 = 정보량을 줄인 간편 모드(탭·요소 축소, 큰 글자) [서울 키오스크 Rule 3, 쑥쑥찰칵]

**문구**
29. 해요체·능동형·긍정형, 다이얼로그 왼쪽 버튼 [닫기], 버튼 라벨은 다음 행동, 버튼·제목엔 마침표 없음, 아라비아 숫자, 한 문장 한 내용 [토스 앱인토스 가이드, SEED Writing]
30. 어르신 대상 경어 수준은 사용자 결정(토스·당근은 존칭 최소화) [토스, SEED] → 열린 질문

**일러스트·이야기 정원**
31. 이야기 상태 3단계 은유(🌱 질문 받음 → 🌿 답하는 중 → 🌳/★ 답 완료), "처음 물어본 날 · 마지막으로 이야기한 날" [Maggie garden-history 성장 단계·planted/tended] (매핑은 해석)
32. 손그림은 빈 화면·질문 카드에만, 은유 먼저 정하고 그린다, 그림 위에 글자 금지, 의미는 글로 [Maggie drawinginvisibles1, Josh Sparkles "only for sighted users"] (해석)

---

## 8. 모션 토큰 후보 (미확정)

| 이름(후보) | 값 | 용도 | 출처 |
|---|---|---|---|
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | 사용자가 연 요소 등장(팝오버·메뉴·카드 등장) | Emil `emil-design-eng` SKILL.md |
| `ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | 화면 안 요소 이동·변형 | Emil SKILL.md |
| `ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | 시트 열기/닫기 | Vaul `constants.ts`(Ionic 유래) |
| `ease-standard` | `ease` | 색·배경·투명도 변화, 토스트 | Emil Easing Blueprint, Sonner `styles.css` |
| `ease-enter` / `ease-exit` (대안) | `cubic-bezier(0,0,0.15,1)` / `cubic-bezier(0.35,0,1,1)` | 매크로 등장/퇴장 | SEED Motion — **주의**: exit은 ease-in 계열이라 Emil "ease-in 금지"와 충돌, 퇴장 전용으로만 |
| `duration-press` | 150ms (100–160ms) | 누름 피드백 | SEED `pressed-scale` d3, Emil 100–160ms |
| `duration-fast` | 200ms | 마이크로(포커스·토글·툴팁), 감소 모션 페이드 | SEED d4 / 마이크로 ≤0.2s, Emil 감소 모션 예 |
| `duration-base` | 250ms | 드롭다운·작은 패널 | SEED d5, Emil 150–250ms |
| `duration-sheet` | 500ms (어르신 화면 후보 300–400ms) | 시트 | Vaul 0.5s; 단축은 Emil "<300ms" 규칙과 절충한 해석 |
| `duration-toast` | 400ms | 토스트 이동 | Sonner `styles.css` |
| `toast-lifetime` | 4000ms (어르신 연장 검토) | 토스트 표시 시간 | Sonner `TOAST_LIFETIME`; 연장은 해석 |
| `stagger` | 30–80ms (기본 50ms) | 사진 여러 장 등장 | Emil SKILL.md |
| `press-distance` | 2px, `basis=max(h, w/4, 24)` | 누름 축소 | SEED Feedback/Scale |
| `press-scale` (대안) | 0.97 | 누름 축소 간단판 | Emil SKILL.md (Rauno는 ~0.96) |
| `enter-from` | `scale(0.95)` + `opacity 0` | 등장 시작 상태 | Emil SKILL.md |
| `spring-settle` | `{ duration: 0.5, bounce: 0.2 }`(bounce 0.1–0.3) | 사진 카드 안착, 드래그 놓기 | Emil SKILL.md 예시 |
| `spring-boop` | tension 300 / friction 10, 150ms 후 복귀 | "별 하나" 보냄 확인 | Josh Boop |
| `sparkle` | 간격 50–450ms, 각 750ms, 전체 ≤2s | 마일스톤 달성 | Josh Sparkles; 전체 2초 상한은 SEED Inclusive |
| `sheet-close-threshold` | 0.25 (높이 비율) | 드래그 닫기 거리 | Vaul `CLOSE_THRESHOLD` |
| `sheet-velocity-threshold` | 0.4 px/ms | 빠르게 내리면 닫기 | Vaul `VELOCITY_THRESHOLD` |
| `sheet-scroll-lock` | 100ms | 스크롤 직후 닫힘 방지 | Vaul `SCROLL_LOCK_TIMEOUT` |
| `toast-swipe` | 45px 또는 0.11 px/ms | 토스트 밀어 닫기 | Sonner `SWIPE_THRESHOLD`, 속도 0.11 |
| `loading-delay` / `loading-min` | 150–300ms / 300–500ms | 스피너·스켈레톤 깜빡임 방지 | Vercel Web Interface Guidelines |
| `reduced-motion` | 위치 이동 제거, 200ms 페이드만 | `prefers-reduced-motion` 및 앱 설정 | Emil SKILL.md, Josh, Sonner(토스트 transition none) |

토큰 확정 전 확인할 것: (1) 실기기(저가 안드로이드 포함)에서 500ms 시트가 어르신에게 느린지/빠른지, (2) 감소 모션을 앱 설정으로도 켤 수 있게 할지, (3) `ease-exit`(SEED)과 Emil 원칙 중 무엇을 따를지.
