# 접근성 브라우저 점검 (Phase 9 `test(a11y)`, main에 넣지 않는다)

2026-10-04 세션에서 쓴 것. 로컬 DB + 개발 서버 + Playwright + axe-core 4로 화면 전체를 본다.
준비는 [`../local-ui-check/`](../local-ui-check/) 1~5와 같다(시드, 세션 쿠키, `next dev -p 3100`, 스크래치에 `playwright-core@1.56`). 추가로 스크래치에 `npm i axe-core@4`.

- `pages.mjs`: 화면 18개 x 모드(`MODES=light,dark,large320`, large320 = 글자 더 크게 + 폭 320px). axe(wcag2a, 2aa, 21a, 21aa, 22aa, best-practice) + 터치 크기 44px 미만 + 입력칸 16px 미만 + 가로 넘침. `TAG=이름`으로 결과 JSON을 스크래치에 남긴다.
  - target-size의 "partially obscured"는 고정 하단 탭, 행동 막대에 그 스크롤 위치에서만 가린 것일 수 있어, 가운데로 옮겨 다시 보고 남는 것만 센다.
- `sheets.mjs`: 시트 6개(기록 시트, 기록하기, 이야기, 직접 쓰기, 물어보기, 일정)를 열고 dialog 안만 점검(밝게, 어둡게).
- `focus.mjs`: Tab 60번으로 초점 표시(outline, box-shadow) 확인. 입력칸은 굵은 테두리로 표시해 여기서는 "표시 없음"으로 나온다(정상). NEXTJS-PORTAL은 개발 오버레이.

## 결과 (2026-10-04, main b85243d 기준 → PR woopinbell/bombyeol#24)

- 처음: 체크박스 라벨 높이 27px(반려동물 짐작한 날, 하루 종일, 처음 표시, 알림 종류) - 터치 크기 미달. 나머지 위반 0(대비, 이름, 랜드마크, 가로 넘침, 입력칸 글자 크기 포함).
- 고친 뒤(공통 `Checkbox`, 높이 `--touch`): 화면 54건 + 시트 12건 **위반 0**.
- 자동 점검이 못 보는 것: 스크린리더 실제 낭독 순서와 문구(VoiceOver, TalkBack), 실기기 확대 200%, 어르신 실사용(DESIGN §8 - 계획을 PROGRESS에 남김).
