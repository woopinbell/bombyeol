# Bombyeol - 진행 상황 (세션 인수인계 로그)

새 세션은 `CLAUDE.md` 다음으로 이 파일을 읽는다. 세션을 끝내거나 옮기기 전 Claude가 갱신하고 `docs` 브랜치에 커밋, 푸시한다(자율, `WORKFLOW.md` §4).

## 현재 상태 (2026-10-01)

- 단계(2026-10-02, Phase DS 세션): **Phase DS 결정 완료 - B안, L2, 다크, 모션(시트 350ms, 토스트 6초), 로고 S2+W2, Pretendard 단일, 토큰 v1 확정**. (2026-10-01 시작: 1차 자료 정독, 화면 규칙, 목업 3안) 병행: Q-PAY 결정 자료, Phase 9 e2e 서버 부분(작업 브랜치, main 미머지) - 아래 "현재 상태 - Phase DS".
- (이전) 단계(2026-10-01, Phase 7): **Phase 7 삭제, 개인정보 서버 main 머지 완료(PR woopinbell/bombyeol#10, 머지 커밋 ea6a25e), 스테이징 마이그레이션, 배포, 스모크 통과**(UI 제외). 그 전에 FCM 스모크 점검 추가(PR woopinbell/bombyeol#9 머지) - 아래 "현재 상태 - Phase 7".
- (이전) 단계(2026-10-01, Phase 6): **Phase 6 알림 서버 main 머지 완료(PR woopinbell/bombyeol#8, 머지 커밋 934c55d), 스테이징 마이그레이션, 배포, 스모크 통과**(UI, 공유, PWA 제외) - 아래 "현재 상태 - Phase 6".
- (이전) 단계(2026-10-01, Phase 5): **Phase 5 우리, 임신 기록 서버 main 머지 완료(PR woopinbell/bombyeol#7, 머지 커밋 6c7b55b), 스테이징 마이그레이션, 배포, 스모크 통과**(UI 제외) - 아래 "현재 상태 - Phase 5".
- (이전) 단계(2026-10-01, Phase 4): **Phase 4 이야기(별) 서버 main 머지 완료(PR woopinbell/bombyeol#6, 머지 커밋 fc94348), 스테이징 마이그레이션, 배포, 스모크 통과**(UI 제외) - 아래 "현재 상태 - Phase 4".
- (이전) 단계(2026-10-01, Phase 3): **Phase 3 오늘(봄) 서버 main 머지 완료(PR woopinbell/bombyeol#5, 머지 커밋 3b0d90d), 스테이징 마이그레이션, 배포 완료, R2 Secret 3종 재등록 후 스모크 전부 통과** - 아래 "현재 상태 - Phase 3".
- (이전) 단계(2026-10-01, Phase 2): **Phase 2 미디어 서버 커밋 완료, 스테이징 배포, R2 토큰 대기** - 아래 "현재 상태 - Phase 2".
- (이전) 단계(2026-10-01, Phase 1): **Phase 1 서버 커밋 완료(온보딩 UI 제외), 스테이징 배포됨** - 아래 "현재 상태 - Phase 1".
- (이전) 단계(2026-10-01, Phase 0 세션): **Phase 0 코드 커밋 완료(디자인 토큰 이식 제외)** - 작업 브랜치 `claude/cloud-session-phase-0-72a2lc`에 9커밋 푸시, **main 머지 완료(PR woopinbell/bombyeol#2, 머지 커밋 06591ce)**. 스테이징 배포, Hyperdrive 생성, CI 마이그레이션 시크릿은 사용자 승인/등록 대기(아래 "다음 할 일").
- (이전) 단계(2026-10-01 갱신): **스택 확정 - 스파이크 S-1~S-8 전부 통과, ARCHITECTURE 확정(사용자 승인). 다음은 Phase 0.** 스파이크 Cloudflare 리소스(Worker, Hyperdrive, R2 버킷)는 삭제 완료. main은 여전히 초기 커밋뿐.
- (이전 기록) 기반 문서 작성 완료, 리포 부트스트랩 완료(2026-10-01). GitHub private 리포 `woopinbell/bombyeol` 생성, `main`(빈 초기 커밋 9744db2), `docs`(고아, 8621748) 푸시 완료. 클라우드 환경은 사용자가 claude.ai/code에서 만든다(허용 도메인 Custom, 개발용 키만). 첫 세션 프롬프트는 `docs/CLOUD_SESSION.md` §4.
- 결정 완료(사용자): 식별자 `bombyeol` / 서버리스 재선정 / 웹, PWA 우선 후 Android / 새 GitHub private 리포 + `docs` 고아 브랜치 / 비용 방어는 설계 제약 / 개인정보 초기 설계 / 텍스트 우선, 음성 후속 / 가족 1 Space 안에 여러 아이 / 카카오+Google 로그인 / Cloudflare 검토 / next-intl(한국어만 출시) / 임신 기록, 고인 처리 V1 포함 / PDF 다운로드 프리미엄 / 웹푸시 + 카카오톡 공유 / devlog는 docs 브랜치에만 / hamkke 절대 원칙 4종 계승.
- 미해결: `OPEN_QUESTIONS.md` (특히 **Q-PAY 결제 공급자 재결정**).

## 현재 상태 - Phase DS (2026-10-01)

- 세션 작업 브랜치 `claude/jolly-shannon-0ae5z1`(main ea6a25e에서 시작). 진행 중 PR 없음, main 머지는 사용자 확인 후.
- **디자인(docs 브랜치만)**:
  - 1차 자료 정독 → [`design-research/2026-10-01-primary-sources.md`](design-research/2026-10-01-primary-sources.md): Emil Kowalski, Rauno, Maggie Appleton, Josh Comeau, 토스, 당근 SEED, KWCAG 2.2, WCAG 2.2, 서울디지털재단 고령층 표준. 화면 규칙 후보 32개 + 모션 토큰 후보 표(**미확정**).
  - 정정: interfacecraft.dev는 Rauno가 아니라 Josh Puckett의 유료 라이브러리, 토스 UX 라이팅 링크 404(내용은 consumer-ux-guide로 이동), Vaul 저장소 "unmaintained"(의존성 대신 상수만 참고). 성공자 연구 문서에 반영.
  - `DESIGN.md` §9 화면 규칙 초안(공통, 오늘, 이야기, 우리, 어르신 온보딩, 시트/토스트, 목업). 토큰 값은 손대지 않음.
  - 목업 3안 [`mockups/2026-10-01-ds/`](mockups/2026-10-01-ds/) - A 한 장씩 / B 날짜별 앨범 / C 큰글씨 간편 모드(이야기 탭 paper 배경). 스크린샷 `shots/*.png`. 비교표, 고를 것은 그 폴더 README.
  - 새 열린 질문: Q-HONOR(어르신 경어 수준), Q-ILLUST(일러스트), Q-STORYBG(이야기 탭 배경).
- **Q-PAY 결정 자료**: [`research/2026-10-01-q-pay-providers.md`](research/2026-10-01-q-pay-providers.md). 사업자 등록 시 포트원 V2(+토스페이먼츠) / 미등록 시 Paddle(대안 Polar) / 무료 출시. 일부 항목은 검색 요약 근거(문서에 표시). 구현, ENV_MANIFEST 키 이름은 사용자 선택 후.
- **Phase 9 `test(e2e)` 서버 부분**: 커밋 f089b91(푸시 완료) - `tests/e2e-core-flow.test.ts` 한 흐름(로그인→Space→아이→초대→수락→사진 업로드, 확정→기록→좋아요, 댓글→이야기, 별, 물어보기→할머니 계정 삭제→Space 삭제, Cron 파기→엄마 계정 삭제, 단계마다 푸시 대상, 잔존 데이터 0 확인). 잔존 검사는 `tests/helpers/residual.ts`로 분리. 파일 첫머리에서도 `assertLocalDatabaseUrl`. Vitest 289 → **290** 통과, format, lint, typecheck 통과, 뮤테이션 2건 확인. 브라우저, 카카오 리다이렉트, 공유, PWA, 실기기 푸시는 남김(UI 이후).
- **2026-10-02 추가(사용자 질문 3가지)**: ① 라이트, 다크 둘 다 지원 → `DESIGN.md` §3.1(2단 토큰: 팔레트→역할, 남색 계열 다크, 후보 값 `line-strong-paper`, `night-deep`, `line-strong-night` - 미확정), 목업을 역할 구조로 바꾸고 다크 스크린샷 추가. ② 철학 전이 점검 → [`design-research/2026-10-02-mockup-audit.md`](design-research/2026-10-02-mockup-audit.md): 구조, 문구, 색은 절반 이상, 모션, 일러스트 앵커는 0, 차별성이 색에만 기댐. 1차 위반(누를 수 있는 테두리 1.40:1, 골드 넓은 버튼, 노란 띠, 칩 40px) 고침. ③ 폴리싱 사다리 L0~L6(지금 L0~L1) 같은 문서 §3. 목업 확인용 정적 서버를 띄워 둠(`python3 -m http.server 8765`, 컨테이너와 함께 사라짐).
- **2026-10-02 B안 선택 → L2 제안**: 사용자가 B안(날짜별 앨범) 선택. `DESIGN.md` §10(간격 8단계, 라운드 3단계+원, 선 3단계, 글자 5단계 rem, 심볼 기반 아이콘) + 2차 목업 [`mockups/2026-10-02-b-l2/`](mockups/2026-10-02-b-l2/)(3탭, 사진 시트+토스트, 이야기 빈 화면, 글자 크게, 온보딩, 라이트/다크) + `check.py`(토큰 밖 값 0, 대비 16개 통과). Q-STORYBG 해결(navy), Q-HONOR 잠정(해요체 + 어르신 화면만 "~세요"). 미리보기 서버 루트를 `docs/mockups/`로 옮김(`http://localhost:8765/2026-10-02-b-l2/b2.html`).
- **2026-10-02 모션 프로토타입**: [`mockups/2026-10-02-proto/`](mockups/2026-10-02-proto/) - B안 오늘, 이야기를 직접 눌러 보는 HTML(시트, 끌어 닫기, 토스트, 누름 2px, 별 하나 boop, 사진 안착, 마일스톤 반짝임, 탭 페이드, 설정판: 테마, 글자, 움직임 줄이기, ×5 느리게, 시트 500/350, 토스트 4/6초). `DESIGN.md` §11 모션 토큰 후보. Playwright 28항목 통과, 시연 영상 `shots/demo.webm`, 시트 프레임 띠. 실기기, 스크린리더는 미확인.
- **2026-10-02 사용자 선택**: 시트 350ms, 토스트 6초(DESIGN §11, 프로토타입 기본값 반영, 테스트 28/28 재통과). **로고 v2 후보**: `image-asset/logo-v2/`(심볼 S1, S2, S3 × 워드마크 W1, W2, 한글 워드마크는 직접 그린 경로, 생성기 `build.py`) + 검토판 `docs/mockups/2026-10-02-logo/`. 추천 S2+W2, 사용자 선택 대기.
- **2026-10-02 로고 확정(S2 + W2) + 파생 에셋**: `image-asset/logo/`(primary, primary-dark, stacked, symbol, wordmark, monochrome, SVG+PNG), `icon/`(favicon.svg - 어두운 탭이면 별 silver, favicon 16, 32, 48, apple 180, PWA 192, 512, 1024, maskable 512 - 이전 파일은 1024px로 잘못돼 있었음), `og/og-image`(가운데 정렬). 생성기 `logo-v2/build.py` + `logo-v2/render.mjs`. 검토판 `docs/mockups/2026-10-02-logo/final/`.
- **2026-10-02 Pretendard 단일 + 토큰 v1 확정**: Q-FONT 해결(손글씨 안 씀, OFL, Reserved Font Name 주의 - 작성자 배포 파일 그대로 자체 호스팅, 직접 서브셋 시 이름 변경). 토큰 원본 `image-asset/brand/tokens.json` + `tokens.css`, 대비 검사 `check-contrast.py`(26조합 통과, 금지 조합 4개 미달 확인), `DESIGN.md` §12(요약, 대비 표). 새로 정한 값: 콘텐츠 최대 폭 480px, 글자 크기 루트 16/20/22. v1에 없는 것: 상태 색, z-index. `palette/colors.css` 삭제(원본 하나로). **Phase DS 결정 항목 전부 완료** → Phase 0 `chore(design-system)` 착수 가능.
- **2026-10-02 Phase 0 `chore(design-system)` 토큰 이식(작업 브랜치 `claude/jolly-shannon-0ae5z1`, 5커밋 푸시, main 미머지)**: 67d2278 토큰 v1(`src/design/tokens.json` 사본 + `src/app/tokens.css` + Tailwind 테마를 토큰으로 제한 - 기본 색, 라운드, 글자, 굵기, 그림자, 곡선 제거, 간격 4px 고정, shadcn 변수 → 역할, 다크 변형 = 앱 설정, 기기 설정) → 4e4578f 테스트(CSS↔JSON 일치, 대비 26조합, 금지 조합 4개, 뮤테이션 확인) → fd71702 Pretendard 작성자 배포 dynamic subset 그대로 자체 호스팅(92파일 3.1MB, 이 화면은 2파일만 받음) → 417db84 화면 설정(`bombyeol.display` localStorage → `<head>` 인라인 스크립트가 첫 페인트 전 `data-theme`, `data-text`, `data-motion`, `setDisplayPref`, theme-color 메타) → 262e7f7 favicon.ico, icon.svg(어두운 탭 대응), apple-icon, `public/brand/`. 검증: format, lint, typecheck, Vitest **331건**(290 → 331), next build, 실제 브라우저(next start)에서 바탕, 글자색, 다크(기기/앱), 첫 페인트 전 속성, 글자 크게 20px, 감소 모션, 하이드레이션 오류 0 확인, OpenNext 빌드 + `wrangler deploy --dry-run --env staging` 13.58 MiB(gzip 3.66 MiB, 이전 13.51/3.64). **OG 메타 태그 보류**(metadataBase 없으면 localhost URL - Q-DOMAIN, APP_URL 때).
- **2026-10-02 PR woopinbell/bombyeol#11 CI 통과(4분) → 머지 커밋으로 main 머지(d8d76bd)**(e2e 서버 테스트 + design-system 5커밋). 스키마 변경 없음(마이그레이션 없음). **스테이징 배포**(버전 c97351a3, Startup 20ms, 에셋 110개): `/`, favicon, icon.svg, apple-icon, `/brand/og/og-image.png`, health 200, `user.me` 비로그인 401. 실제 브라우저(스테이징): 라이트 paper, 다크 deep, 글자 크게 21.25px, Pretendard 2파일 200, 콘솔 오류 0 - 스크린샷 `docs/mockups/2026-10-02-staging/`. 작업 브랜치는 머지된 main으로 맞춤. (클라우드 Playwright는 프록시 CA 때문에 `--ignore-certificate-errors-spki-list=<세션 프록시 CA SPKI>`로 그 CA 하나만 신뢰시켜야 외부 HTTPS를 연다.) 사용자 지적: 클라우드 `localhost`는 사용자가 못 봄 → `CLOUD_SESSION.md` §2.0(스크린샷, 영상, 스테이징으로 보여준다).
- **2026-10-02 온보딩 UI(작업 브랜치 `claude/jolly-shannon-0ae5z1`, main d8d76bd 위 11커밋, 2026-10-02 푸시 421bbd8, main 미머지)**: 외부 로그인 버튼 공식 에셋과 값(토큰 v1.1, 카카오 공식 리소스와 Google 공식 G) → 라운드 이름 충돌 수정 → 공통 화면 조각(버튼, 입력, 선택 칩, 단계 표시, 화면 틀, 누름 피드백) → 서버 호출 도구(서버 컴포넌트와 서버 액션이 같은 tRPC 프로시저, 오류 → 문구 키) → 로그인 → 칩 누름 수정 → 가족 만들기 → 금지 문자 정리와 검사 → 어르신 초대(코드, 링크, 기기 공유, 복사) → 초대 합류(로그인 전에는 가족 이름 숨김 → 가족 확인과 부를 이름 → 글자 크기) → 홈 라우팅(`/` → 로그인, 시작, 가족 홈; 가족 홈 화면 자체는 Phase 3 UI). 검증: Vitest 351건, next build, 로컬 브라우저(로컬 DB와 직접 만든 세션 쿠키) 흐름 검사 전부 통과(가족 만들기 5, 초대 7, 합류 14, 라우팅 9 항목), 하이드레이션 경고 0. 실제 카카오와 Google 로그인은 스테이징에서 확인 필요(로컬은 OAuth 없이 세션을 만들어 검사). Worker 크기 17.94 MiB(gzip 4.56 MiB, 이전 13.58): Cloudflare 현재 한도는 비압축 64 MiB, 압축 한도 없음(2026-10-02 공식 문서 확인), 시작 시간 1초 한도는 지켜볼 것. 스크린샷 `docs/mockups/2026-10-02-onboarding-ui.png`.
- **2026-10-02 금지 문자 규칙(사용자 결정)**: CLAUDE.md 절대 원칙에 추가, 코드와 문서 전체 정리, main 쪽 검사 `tests/banned-chars.test.ts`. 이미 main에 있는 커밋 메시지와 적용된 마이그레이션 파일은 그대로. 이 브랜치의 푸시 전 커밋 메시지 4개에 남은 가운뎃점은 사용자 승인으로 고쳐 쓴 뒤 푸시했다(내용 변화 없음).
- 환경 메모: 기존 스위트에서 3번 중 1번 테스트 1건이 실패했다가 재실행에 통과(어떤 테스트인지 기록 못 함 - 다음에 반복 실행으로 찾을 것). Docker Hub 429로 `db:up` 첫 시도 실패, 재시도 성공. 컨테이너에 한글 폰트가 없어 목업 스크린샷은 Pretendard woff2를 받아 Playwright route로 주입(스크래치패드, 리포에 넣지 않음).

### 다음 할 일 (Phase DS 1차 이후)

1. ~~PR, main 머지, 스테이징 배포~~ 완료(PR woopinbell/bombyeol#11, d8d76bd, 버전 c97351a3).
2. 온보딩 UI 11커밋(푸시 완료): 사용자 확인 → PR, 머지, 스테이징에서 실제 카카오와 Google 로그인 확인. 그다음 Phase 3 오늘 탭 UI. 결제는 Q-PAY 결정 후. 사용자: 스테이징(`https://bombyeol-staging.seungwoo7050.workers.dev`)과 프로토타입을 실기기(어르신 폰)에서 열어 보기 권장.
2. 그 뒤 Phase DS 남은 것: 로고(Q-LOGO), 손글씨(Q-FONT) 결정, 토큰 확정(모션 토큰 후보 표에서 고르기) + 대비 검증 표. 확정 전에는 코드에 토큰을 넣지 않는다.
3. **사용자**: Q-PAY 선택(선결: 사업자 등록 여부). 고르면 ENV_MANIFEST Phase 8 키 이름부터 채우고 Phase 8 착수.
4. e2e 커밋(f089b91)은 main 머지 대기 - 사용자 확인 후 PR.

## 현재 상태 - Phase 7 (2026-10-01)

- 먼저 한 일(사용자 지시): 내부 스모크에 `fcm` 점검 추가 → PR woopinbell/bombyeol#9 CI 통과, 머지(28bbee9). 스테이징 버전 f9a76478(같은 코드). 스모크 결과 `fcm: key: InvalidCharacterError (begin=y escaped=n newline=n quoted=n body=1626)` - **사용자가 등록한 `FIREBASE_ADMIN_PRIVATE_KEY` 값의 형식 문제**(코드는 클라우드 환경 키로 `invalid_token` 정상 확인). 재등록 방법은 ENV_MANIFEST Phase 6. 다른 항목(db, R2)은 전부 정상.
- 작업 브랜치 `claude/clever-dijkstra-7qvhxv`(main 28bbee9 위) 7커밋, 푸시 완료: `chore(prisma)` DeletionRequest(+MediaStatus `purging`) → `feat(privacy)` 아이, 반려동물 삭제 → Space 삭제(유예, 파기) → 계정 삭제 → 데이터 내보내기 → `fix(privacy)` 초대 입력 실패 기록 삭제 → `test(privacy)` 잔존 데이터 0. **사용자가 ①~⑥ 전부 승인 → PR woopinbell/bombyeol#10 CI 통과(4분) → 머지 커밋으로 main 머지(ea6a25e).** 작업 브랜치는 머지된 main으로 맞춤.
- 스테이징: main push로 `Migrate staging DB` 자동 실행 성공(`deletion`, `media_purging` 적용). Worker 배포(버전 f3842fdf, Startup 31ms, Cron 유지). 스모크: health 200, 새 경로(`user.deleteAccount`, `space.requestDeletion`, `space.deletionStatus`, `child.delete`, `archive.media, records`) 비로그인 401, 내부 스모크 db, R2 전부 ok, `fcm`은 여전히 `key: InvalidCharacterError`(사용자 키 재등록 대기). 배포 직후 몇 초는 이전 버전이 응답해 `archive.*`가 404였다 - 재확인 401.
- 로컬 검증: format, lint, typecheck, Vitest **289건** 통과(264 → 289), OpenNext 빌드, `wrangler deploy --dry-run --env staging` 13.51 MiB(gzip 3.64 MiB). 뮤테이션 점검: 초대 실패 기록 삭제를 빼면 잔존 데이터 테스트가 `InviteCodeAttempt: 1`로 실패.
- 새 마이그레이션 2개: `20261001161920_deletion`(DeletionRequest + Space당 진행 중 요청 하나 부분 unique + 종류별 체크 제약), `20261001162057_media_purging`(MediaStatus `purging`). main 머지 시 `Migrate staging DB`가 자동 적용.
- 새 API: `child.delete`, `pet.delete`(이름 재입력), `space.requestDeletion`(Space 이름 재입력), `cancelDeletion`, `deletionStatus`, `user.deleteAccount({confirm:true})`, `archive.media`, `archive.records`(parent, 페이지). 정리 Cron에 Space 파기, purging 파일 삭제 단계 추가.
- 설계 요약(COMMIT_PLAN Phase 7 메모):
  - 계정 삭제: 콘텐츠는 Space에 남고 User는 비식별 묘비(이름 null, deletedAt). Account, PushToken, Consent, Member, 미사용 초대, 초대 입력 실패 기록, 내가 쓴 임신 기록(파일 purging) 삭제. 기존 세션은 다음 요청부터 401. 다시 로그인하면 새 사용자. 다른 가족이 있는 Space의 유일한 parent면 `LAST_PARENT`(삭제 요청 중인 Space면 허용). 혼자 남은(기념 상태 멤버만 남은 경우 포함) Space는 유예 없이 파기.
  - Space 삭제: 요청 → 30일 유예(읽기, 내보내기, 취소만, 쓰기는 `SPACE_DELETING`, 초대 거둠) → Cron이 숨기고 파일 purging → R2 삭제 → Space 행 삭제(연쇄). 쿨다운은 완료된 삭제 요청으로 센다.
  - 큰 삭제의 파일: `purging` 상태로 넘기고 Cron이 실행당 40건(무료 플랜 하위 요청 50 안)씩 R2에서 삭제. 사용량에서는 바로 빠진다. 버려진 업로드 정리도 같은 몫을 나눠 쓴다(기존 200건 배치는 무료 플랜 한도를 넘을 수 있었음 - 함께 고침).
  - 내보내기: 서버는 원본 목록(짧은 TTL URL, 썸네일 제외), 글 기록 JSON을 페이지로, ZIP은 브라우저. parent만, 페이지 500/일(G-07).
- 남긴 것: 웹 삭제 페이지, 설정 화면(UI), 구독 해지 연쇄(Phase 8 - `TODO(G-06)`), 동의 기록 보존 기간 법적 요건(A-12), 계정 삭제 화면의 "떠난 가족" 표시(UI - 서버는 이름 null).
- 환경 메모: `npx prisma migrate dev`를 바로 부르면 클라우드 환경의 `DATABASE_URL`(Supabase)로 간다 - 이번에 한 번 그렇게 불렀다가 접속 실패로 아무 일도 없었다. **마이그레이션은 반드시 `npm run db:migrate -- ...`**. Prisma는 AI 에이전트의 `migrate reset`을 막는다(사용자 동의 필요) - 로컬 마이그레이션을 고쳐야 하면 새 마이그레이션을 더한다. 스크립트 실수로 컨테이너 루트에 `/migration.sql`(마이그레이션 SQL 조각, 비밀 없음)이 생겼고 안전 검사로 지우지 못했다 - 컨테이너와 함께 사라진다.

### 확인 결과 (2026-10-01)

COMMIT_PLAN Phase 7 메모 ①~⑥ **전부 사용자 승인**: ① 계정 삭제 시 콘텐츠는 Space에 남기고 사람만 지움(묘비 User) ② 임신 기록은 계정과 함께 삭제 ③ 마지막 parent 보호(`LAST_PARENT`), 혼자 남은 Space 즉시 파기 ④ Space 삭제 유예 30일, 유예 중 읽기, 내보내기, 취소만 ⑤ 내보내기는 서버 목록 + 클라이언트 ZIP, parent만 ⑥ 아이, 반려동물 삭제(반려동물 이야기는 남김).

### 세션 이동 권고 (2026-10-01, Phase 7 종료 시점)

- **새 세션으로 옮긴다.** 진행 중 PR 없음(PR woopinbell/bombyeol#10 머지, 구독 해제 완료). 이 세션은 Phase 6, 7과 FCM 스모크까지 마쳐 컨텍스트가 크다.
- 코드 상태: 작업 브랜치 `claude/clever-dijkstra-7qvhxv` = main ea6a25e. 새 세션은 main에서 자기 작업 브랜치를 딴다.
- 새 세션 시작 시: `dockerd &` → `npm run db:up`, `npm ci`, 마이그레이션은 **`npm run db:migrate -- --name <이름>`만**(직접 `npx prisma migrate`는 원격 DB로 간다).
- 다음 작업은 사용자 결정: Phase DS(디자인 스프린트 - Kaddie 상황) 또는 Phase 8(결제 - Q-PAY 결정 먼저). 서버만 남은 일로는 Phase 9 e2e(`test(e2e)`)가 화면 없이도 일부 가능.

### 다음 할 일 (Phase 7 이후)

1. ~~사용자 확인, PR, 머지, 스테이징 반영~~ 완료(PR woopinbell/bombyeol#10, ea6a25e, 버전 f3842fdf).
2. ~~사용자: `FIREBASE_ADMIN_PRIVATE_KEY` 재등록~~ 완료 - 스모크 전 항목 정상(`db` ok, R2 위반 403, 정확 200, head, copy, cleanup ok, `fcm: invalid_token`). 스테이징 FCM 발송 경로 확인됨, 실기기 수신은 UI(서비스 워커) 이후.
3. 다음 개발 후보: Phase DS(Kaddie 디자인 상황에 따라 - 사용자 결정) 또는 Phase 8(Q-PAY 결정 필요).

## 현재 상태 - Phase 6 (2026-10-01)

- 작업 브랜치 `claude/clever-dijkstra-7qvhxv`(main 6c7b55b에서 시작) 4커밋, 푸시 완료: `chore(prisma)` PushToken → `feat(push)` 토큰 등록, 해제, 오래된 토큰 정리 → `feat(push)` FCM 발송 유틸 → `feat(push)` 새 사진, 이야기, 반응, 질문(+임신 기록) 알림 연결. **사용자가 ①~⑤ 전부 승인 → PR woopinbell/bombyeol#8 CI 통과(3분 40초) → 머지 커밋으로 main 머지(934c55d).** 작업 브랜치는 머지된 main으로 맞춤.
- 스테이징: main push로 `Migrate staging DB` 자동 실행 성공(`push` 적용). Worker 배포(버전 15c56064, Startup 29ms, Cron 유지). 스모크: health 200, `push.register, unregister` 비로그인 401, 없는 경로 404, 내부 스모크 db ok, R2 PUT 크기/타입 위반 403, 정확 PUT 200, head, copy, cleanup ok. Worker에 `FIREBASE_ADMIN_*` Secret이 없어 알림 발송은 건너뛰는 상태(의도대로).
- 로컬 검증: format, lint, typecheck, Vitest **260건** 통과(223 → 260), OpenNext 빌드 통과, `wrangler deploy --dry-run --env staging` 13.48 MiB(gzip 3.63 MiB). 뮤테이션 점검: 임신 visibility → 역할 제한을 빼면 3건, 기념 멤버 제외를 빼면 1건 실패.
- 실제 FCM 확인: 클라우드 환경의 개발 서비스 계정으로 JWT 교환 → FCM 호출까지 왕복, 가짜 토큰이 `invalid_token`으로 분류됨(실기기 수신은 S-5에서 확인, 이번엔 클라이언트가 없어 미확인).
- 새 마이그레이션 `20261001153126_push`: PushToken(token unique, userId cascade, lastSeenAt 인덱스). main 머지 시 `Migrate staging DB`가 자동 적용.
- 새 API: `push.register, unregister`. 기존 mutation(`moment.create, createDiary`, `story.create, ask`, `reaction.toggleLike, toggleStar, addComment`, `pregnancy.create`)이 저장 성공 뒤 알림 이벤트를 `waitUntil`로 넘긴다. Context에 `push` 추가(테스트 기본값 `noPush`).
- 설계 요약(COMMIT_PLAN Phase 6 메모):
  - 발송 시점 재확인: 대상이 아직 있는지, 수신자가 지금 멤버인지(삭제된 Space, 탈퇴 계정 제외), 기념 상태가 아닌지, 본인이 아닌지. 임신 기록은 **발송 시점 visibility**(parents_only → 다른 parent만). 물어보기는 아직 열려 있을 때만.
  - 문구: 제목 "봄별" + 종류별 고정 문구(`messages/ko.json` `push.*`), 임신은 "새 소식이 있어요". 이름, 관계, 본문, 질문 내용 없음(테스트로 확인). 데이터는 종류, id, 링크(`/open/{종류}/{id}`, 화면 라우트는 UI 때).
  - 상한(`plan.ts` 초안): 토큰 사용자당 10, 등록 30/일, 60일 미갱신 정리, 수신자당 시간당 20건, 이벤트당 수신자별 기기 3, 전체 40건(무료 플랜 하위 요청 50 안), 좋아요, 별 같은 대상 6시간에 1번, 댓글 30분에 1번. 재시도 없음. 무효 토큰(UNREGISTERED, SENDER_ID_MISMATCH, 토큰 문제인 INVALID_ARGUMENT)만 지움.
  - 키가 없으면 발송만 건너뛴다(스테이징은 지금 이 상태).
- 남긴 것: 마일스톤 알림(안 보냄 - 확인 ②), 알림 끄기, Space별 음소거(설정 UI 때), 나중에 가족 공개로 바꿀 때 알림, 카카오톡 공유, PWA 매니페스트, 서비스 워커, 토큰 발급 클라이언트(UI 단계 - 확인 ⑤).

### 확인 결과 (2026-10-01)

COMMIT_PLAN Phase 6 메모 ①~⑤ **전부 사용자 승인**: ① 알림 문구 6종(고정 문구) ② 수신자 규칙(마일스톤 제외, 이야기 대필 시 화자 포함, 반응은 쓴 사람, 화자에게) ③ 소음, 비용 상한 수치 ④ 알림 설정을 UI 때로 미루기 ⑤ 카카오톡 공유, PWA를 UI 단계로 미루기.

### 세션 이동 권고 (2026-10-01, Phase 6 종료 시점)

- **새 세션으로 옮긴다.** 진행 중 PR 없음(PR woopinbell/bombyeol#8 머지, 구독 해제 완료). Phase 7 서버는 새 키가 없다.
- 코드 상태: 작업 브랜치 `claude/clever-dijkstra-7qvhxv` = main 934c55d. 새 세션은 main에서 자기 작업 브랜치를 딴다.
- 새 세션 시작 시: `dockerd &` → `npm run db:up`, `npm ci`, 스키마 변경 후 `npx prisma generate`, 마이그레이션은 `npm run db:migrate -- --name <이름>`.
- 새 세션 첫 프롬프트(`CLOUD_SESSION.md` §4.1, 3번만 채움): "오늘 할 일: Phase 7(삭제, 개인정보) 서버 먼저, UI 제외. 계정, Space 삭제는 R2 먼저→DB→푸시 토큰 연쇄(G-06), 유예 기간 정책은 PRIVACY 확인 후 COMMIT_PLAN 메모로 제안하고 머지 전 확인받아."

### 다음 할 일 (Phase 6 이후)

1. ~~사용자 확인, PR, 머지, 스테이징 반영~~ 완료(PR woopinbell/bombyeol#8, 934c55d, 버전 15c56064).
2. 스테이징에서 실제 발송까지 보려면 사용자가 Worker Secret 3종 등록: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`(`npx wrangler secret put <이름> --env staging`, Secret 유형). 없어도 기능은 동작하고 알림만 건너뛴다. 실기기 수신 확인은 UI(서비스 워커) 이후.
3. 다음 개발: Phase 7(삭제, 개인정보) 서버 - 계정 삭제 연쇄에 PushToken 포함(이미 cascade). 새 키 없음(ENV_MANIFEST).
4. 환경 메모: 이 세션은 Docker Hub pull 문제 없이 `npm run db:up` 동작. `node scripts/with-local-db.mjs prisma ...`는 PATH 문제로 조용히 실패 - `npm run db:migrate -- --name <이름>`을 쓴다.

## 현재 상태 - Phase 5 (2026-10-01)

- 작업 브랜치 `claude/compassionate-knuth-whf5li`(main fc94348에서 시작) 8커밋, 푸시 완료: prisma(Consent, PregnancyRecord, FamilyEvent) → consent → pregnancy → test(pregnancy) parents_only 비노출 → refactor(memorial) 공용 기념일 계산 → calendar → family 멤버 관리 → family 다가오는 카드. **사용자가 결정 ①~⑤ 승인 → PR woopinbell/bombyeol#7 CI 통과(3분 30초) → 머지 커밋으로 main 머지(6c7b55b).** 작업 브랜치는 머지된 main으로 맞춤. 우리 탭 화면(`feat(us)`)은 Phase DS 이후.
- 스테이징: main push로 `Migrate staging DB` 자동 실행 성공(`us` 적용). Worker 배포(버전 9ea65ea3, 13.46 MiB, Startup 27ms, Cron 유지). 스모크: health 200, 내부 스모크 db ok, R2 PUT 크기/타입 위반 403, 정확 PUT 200, head, copy, cleanup ok, 새 경로(`pregnancy.list, progress`, `calendar.list`, `family.upcoming, members`, `consent.status`) 비로그인 401, 없는 경로 404. 배포 직후 몇 초는 이전 버전이 응답해 새 경로가 404로 보였다 - 잠시 뒤 재확인하면 401.
- 로컬 검증: format, lint, typecheck, Vitest **223건** 통과(181 → 223), OpenNext 빌드 통과, `wrangler deploy --dry-run --env staging` 13.46 MiB(gzip 3.62 MiB). visibility 필터를 빼면 비노출 테스트 8건 중 6건이 실패하는 것도 확인(테스트가 실제로 막는지 점검).
- 새 마이그레이션 `20261001144552_us`: enum 4개, 테이블 3개, 체크 제약 4개(Consent 범위 - 약관, 처리방침은 spaceId 없음/아이, 임신은 있음, 초음파 ↔ 사진, 메모 글 필수, 일정 끝 ≥ 시작). main 머지 시 `Migrate staging DB`가 자동 적용.
- 새 API(전부 서버, tRPC): `consent.status, grantAccount, grantSpace, withdraw`, `pregnancy.create, update, delete, list, get, progress`, `calendar.create, update, delete, list`, `family.members, upcoming, updateLabel, changeRole, remove, leave`.
- 설계 요약은 COMMIT_PLAN Phase 5 설계 메모. 핵심:
  - 임신 기록은 쓰는 parent의 유효한 `pregnancy` 동의(현재 버전, 미철회)가 있어야 쓰고 고친다. 기본 `parents_only`, parent가 아니면 쿼리 조건에 `visibility = family` - 숨은 기록은 id로도 `NOT_FOUND`(없는 기록과 같은 오류), 페이지 커서에도 흔적 없음. 초음파 자산은 다른 곳에 붙일 수 없다(`unattachedAssetWhere`에 추가).
  - 주차는 저장하지 않고 조회 시점에 아이의 현재 예정일로 계산(280일 기준).
  - 동의 철회 시 내 기록 지우기(R2 먼저) 또는 가족 공개 거두기. 약관, 처리방침, 아이 정보 동의는 기록, 조회만 - 전체 API 게이트는 온보딩 커밋과 함께(확인 요청 ①).
  - 캘린더: 시각 있는 일정 = UTC 순간, 종일 = UTC 자정 날짜. 조회는 현지 날짜 범위 + UTC 차이(분). 매년 반복은 조회 시점에 펼침.
  - 멤버 관리: 자기 자신, Space 만든 사람, 기념 상태인 분은 역할 변경, 내보내기 대상 아님. 역할 변경은 대기 초대 포함 정원(G-11) 재검사. 내보내면 그 사람이 낸 미사용 초대를 거둔다.
  - 새 상한, 리밋(`plan.ts` 초안): 임신 메모 1000자, 검진 일정은 예정일+60일까지, 일정 쓰기 100/일(G-07), Space당 일정 500(G-11), 제목 40자, 메모 500자, 일정 길이 31일, 조회 범위 400일, 우리 탭 카드 기본 30일(최대 90일). 임신 기록은 기존 글 기록 리밋(300/일)을 마일스톤, 일기와 함께 쓴다.
- 남긴 것(의도적으로 범위 밖): 가입 동의 전체 게이트(온보딩), 아이 정보 동의 철회, 아이 삭제(Phase 7), 임신 관련 알림 문구(Phase 6 - "새 소식이 있어요"), 임신 기록 반응(두지 않음 - 확인 요청 ③), 사람 생일 자동 카드(멤버 생일 필드 없음 - 캘린더에 `birthday`로 등록), DST 경계의 반복 일정 현지 시각 보정.
- 환경 메모: 이 VM에서 Docker Hub가 `429 Too Many Requests`로 `postgres:17.11` pull을 거부했다 → `docker pull mirror.gcr.io/library/postgres:17.11 && docker tag mirror.gcr.io/library/postgres:17.11 postgres:17.11` 후 `npm run db:up`으로 해결. 마이그레이션 생성 후 `npx prisma generate`를 따로 돌려야 클라이언트가 갱신됐다.

### 확인 결과 (2026-10-01)

- COMMIT_PLAN Phase 5 메모의 ①~⑤ **전부 사용자 승인**: ① 가입 동의 게이트는 온보딩 때 ② 철회 시 지우기/공개 거두기 선택 ③ 임신 기록 권한(쓴 사람만 고치기, 공개, 다른 parent는 좁히기만, 반응 없음) ④ 아이 프로필(태명, 예정일)은 가족에게 보임 ⑤ 만든 사람 보호, 나가기 불가.

### 세션 이동 권고 (2026-10-01, Phase 5 종료 시점)

- **새 세션으로 옮긴다.** 진행 중 PR 없음(PR woopinbell/bombyeol#7 머지, 구독 해제 완료). Phase 6(알림)은 FCM 키가 필요할 수 있어(ENV_MANIFEST Phase 6) 환경변수를 바꾸면 새 세션이 필요하다.
- 코드 상태: 작업 브랜치 `claude/compassionate-knuth-whf5li` = main 6c7b55b. 새 세션은 main에서 자기 작업 브랜치를 딴다.
- 새 세션 시작 시: Docker 데몬(`dockerd &`), Docker Hub 429면 GCR 미러(위 환경 메모), `npm ci`, 스키마 변경 후 `npx prisma generate`.
- 새 세션 첫 프롬프트(`CLOUD_SESSION.md` §4.1, 3번만 채움): "오늘 할 일: Phase 6(알림) 서버 먼저, UI 제외. 필요한 키는 ENV_MANIFEST 기준 이름부터 알려주고 멈춰. 알림 문구에 민감 정보 금지(PRIVACY §3), 수신자 멤버십, 임신 visibility 재확인."

### 다음 할 일 (Phase 5 이후)

1. ~~사용자 확인, PR, 머지, 스테이징 반영~~ 완료(PR woopinbell/bombyeol#7, 6c7b55b, 버전 9ea65ea3).
2. 다음 개발: Phase 6(알림) - 키 필요 여부는 ENV_MANIFEST 확인 후 이름부터 알리고 멈춘다.
3. (Phase 3에서 이어짐) 브라우저 직접 업로드 CORS는 UI 이후 사용자 기기.

## 현재 상태 - Phase 4 (2026-10-01)

- 작업 브랜치 `claude/awesome-cannon-ac5isr`(main 3b0d90d에서 시작) 8커밋: fix(media) R2_ACCOUNT_ID 문구 → prisma(StoryEntry, StoryAsk, MemorialProfile + Reaction storyEntryId, star) → story 질문 카드 → 쓰기, 대필 → 사진 → 물어보기 → 별 하나, 댓글 → memorial. **사용자가 결정 6가지 승인 → PR woopinbell/bombyeol#6 CI 통과(3분) → 머지 커밋으로 main 머지(fc94348).** 작업 브랜치는 머지된 main으로 맞춤. 이야기 탭 화면은 Phase DS 이후.
- 로컬 검증: format, lint, typecheck, Vitest **181건** 통과(133 → 181), OpenNext 빌드 통과, `wrangler deploy --dry-run --env staging` 13.40 MiB(gzip 3.6 MiB).
- 새 마이그레이션 `20261001133248_story`: enum 값 추가(`ReactionKind.star`), 체크 제약 4개(Reaction 대상 3중 1 - 기존 제약 교체, StoryAsk 카드/질문 1, MemorialProfile 대상 ≤1, storyYear 1850~2200). main 머지 시 `Migrate staging DB`가 자동 적용.
- 스테이징: main push로 `Migrate staging DB` 자동 실행 성공(`story` 적용). Worker 배포(버전 38ef950d, 13.40 MiB, Startup 24ms, Cron 유지). 스모크: health 200, `story.prompts`, `memorial.list` 비로그인 401, 없는 경로 404, 내부 스모크 db ok, R2 PUT 크기/타입 위반 403, 정확 PUT 200, head, copy, cleanup ok. 빌드 로그 `Failed to copy node_modules/...` 경고는 이전과 같은 CLI 의존성(exit 0).
- 설계 요약은 COMMIT_PLAN Phase 4 설계 메모. **사용자 승인(2026-10-01)** 결정:
  1. 질문 카드를 DB 테이블(StoryPrompt) 대신 **코드 카탈로그**로(카드 27개 문구 초안 - `messages/ko.json` `story.prompts`, 문구 검토 환영).
  2. 이야기 시기는 날짜 대신 **연 단위(`storyYear`)**, 사진은 **한 장**.
  3. **좋아요 = 오늘 기록, 별 하나 = 이야기 전용**(둘 다 토글). 댓글은 공통.
  4. 물어보기는 **parent → grandparent**만(relative는 댓글로 질문).
  5. 기념인 분의 이야기는 **수정, 삭제도 막음**(되돌린 뒤 가능) - "영구 보존"을 엄격하게 해석.
  6. 상한 초안: 이야기 쓰기 100/일, 물어보기 30/일, 어르신당 열린 물어보기 30, 별 하나 300/시간, 본문 5000자.
- 남긴 것(의도적으로 범위 밖): 기념 상태 멤버의 계정 로그인, 멤버 수 상한 처리(Phase 7 삭제 연쇄와 함께 검토), 물어보기 알림(Phase 6), 이야기 PDF(Phase 8), 반응 알림(Phase 6), 이야기 모음 통계(카테고리, 시기별 개수 - 화면 만들 때 필요하면).

### 세션 이동 권고 (2026-10-01, Phase 4 종료 시점)

- **새 세션으로 옮긴다.** 이 세션은 Phase 4 구현, PR, 머지, 스테이징 반영까지 마쳐 컨텍스트가 크고, 진행 중 PR이 없다(PR woopinbell/bombyeol#6 머지, 구독 해제 완료).
- 환경 변경 필요 없음: Phase 5 서버는 새 키가 없다(ENV_MANIFEST에 Phase 5 항목 없음).
- 코드 상태: 작업 브랜치 `claude/awesome-cannon-ac5isr` = main fc94348(미푸시 변경 없음). 새 세션은 main에서 자기 작업 브랜치를 딴다.
- 새 세션 시작 시: Docker 데몬이 꺼져 있을 수 있음(`dockerd &` → `npm run db:up`), `npm ci`, 스키마 변경 후 `npx prisma generate`.
- Phase 5는 임신(건강) 정보, 동의 기록이 있어 `PRIVACY_AND_LEGAL.md`(특히 §3 임신 visibility 서버 강제)를 먼저 읽는다. 설계 결정은 COMMIT_PLAN Phase 5 설계 메모로 제안하고, main 머지 전에 사용자 확인을 받는다(Phase 3, 4와 같은 방식).
- 새 세션 첫 프롬프트(`CLOUD_SESSION.md` §4.1, 3번만 채움): "오늘 할 일: Phase 5(우리, 임신 기록) 서버 먼저, UI 제외. PRIVACY_AND_LEGAL 기준으로 임신 visibility, 동의를 서버에서 강제하고, 설계 결정은 COMMIT_PLAN 메모로 정리해 머지 전 확인받아."

### 다음 할 일 (Phase 4 이후)

1. ~~사용자 확인, PR, 머지, 스테이징 반영~~ 완료(PR woopinbell/bombyeol#6, fc94348, 버전 38ef950d).
2. 다음 개발: Phase 5(우리, 임신 기록) 서버. 새 키 없음(ENV_MANIFEST 확인).
3. (Phase 3에서 이어짐) 브라우저 직접 업로드 CORS는 UI 이후 사용자 기기.

## 현재 상태 - Phase 3 (2026-10-01)

- 작업 브랜치 `claude/gracious-wright-1xpzcj`(main 808de8f에서 시작) 9커밋: prisma(Pet, Moment, MomentMedia, Milestone) → child → refactor(media) → pet → moment 피드 → milestone → 일기 → prisma(Reaction) → reaction. **사용자 승인 후 PR woopinbell/bombyeol#5 CI 통과 → 머지 커밋으로 main 머지(3b0d90d).** 작업 브랜치는 머지된 main으로 다시 맞춤. 오늘 탭 화면(`feat(today)`)은 Phase DS 이후.
- 로컬 검증: format, lint, typecheck, Vitest **133건** 통과(93 → 133), OpenNext 빌드 통과, `wrangler deploy --dry-run --env staging` 번들 13.33 MiB(gzip 3.6 MiB, 한도 64 MiB). 빌드 로그의 `Failed to copy node_modules/{is-docker,...}` 14줄은 CLI 도구 의존성(런타임 미사용) 경고로 exit 0 - 이전 Phase에서도 나왔는지는 미확인.
- 스테이징: main push로 `Migrate staging DB`가 자동 실행돼 `today`, `reaction` 적용(All migrations applied). Worker 배포(13.33 MiB, Startup 19ms, Cron 유지). 스모크: health 200, 새 경로(moment, pet, milestone, reaction) 비로그인 401, 없는 경로 404, 내부 스모크 DB ok.
- **⚠️ 스테이징 R2 회귀(배포로 발생)**: 내부 스모크 `r2: fail: R2 설정이 없습니다`. 원인 - Phase 2 때 `R2_ACCESS_KEY_ID`가 Secret이 아니라 **대시보드 일반 환경변수(plaintext var)** 로 들어가 있었고(버전 a16eb641 `Add secret...` 메시지인데 바인딩은 Environment Variable), `wrangler deploy`는 vars를 `wrangler.jsonc` 내용으로 바꾸므로 이번 배포에서 빠졌다. 지금 Secret 목록: R2_ACCOUNT_ID, R2_SECRET_ACCESS_KEY만 있음. Claude의 Secret 재등록은 세션 권한 정책(Secret-Store Writes)으로 거부됨 → **사용자가 `npx wrangler secret put R2_ACCESS_KEY_ID --env staging`으로 Secret 등록**(값은 Cloudflare R2 API 토큰의 Access Key ID, 대화에 붙여넣지 않기). 등록 후 `node scripts/smoke-staging.mjs`로 r2 ok 확인.
- 교훈: Worker 값은 전부 `wrangler secret put`으로(대시보드 "변수"로 넣으면 다음 배포에서 지워진다). 배포 후 내부 스모크까지 확인한다.
- 설계 요약(COMMIT_PLAN Phase 3 설계 메모와 같음):
  - 대상 선택 `subject = child | pet | family`(`src/server/subjects.ts`). 기록 권한: 아이 = parent만, 반려동물, 가족 = parent, grandparent, relative = 열람, 반응만. 프로필(아이, 반려동물) 관리 = parent.
  - Moment `kind = media | diary`(PRD §6 갱신). 첨부 `MomentMedia` 최대 10, 썸네일은 클라이언트가 만든 이미지 자산. **자산은 한 곳에만 붙는다**(unique + `requireAttachableAssets`, 동시 요청은 P2002 → `ASSET_IN_USE`). 붙은 자산은 `media.delete` 불가, Moment 삭제, 커버 교체 때 `removeAsset`(R2 먼저 → DB)으로 함께 지움(G-05). 중간 실패 시 기록이 남아 재시도 가능.
  - 피드 `moment.list`: (takenAt, id) 커서, 대상 필터, 짧은 TTL 읽기 URL, 반응 요약(좋아요, 댓글 수, 내 좋아요). `pet.list`도 커버 읽기 URL.
  - 마일스톤 프리셋 `src/lib/milestones.ts`(kind별 zod 값 스키마, strict). "처음" 기록은 대상당 하나(advisory lock), 아이 나이 기반 제안(`milestone.suggestions`). 반려동물 의료는 메모까지만(PRD §4.2.1).
  - 아이 `child.update`, `child.markBorn`(태명, 예정일 유지, 동시 전환 1회만). 미래 날짜는 하루 여유로 거부.
  - Reaction: 대상별 FK(momentId, milestoneId) + 체크 제약, 대상 삭제 시 cascade. 좋아요 토글은 advisory lock.
  - 새 상한, 리밋(모두 `plan.ts` **초안**): 반려동물 무료 3, 프리미엄 10(G-11), 글 기록(마일스톤, 일기) 사용자당 300/일, 좋아요 300/시간, 댓글 60/시간(G-07), Moment 첨부 10, 본문 2000자, 댓글 500자.
- 남긴 것(의도적으로 이번 범위 밖): 아이, 반려동물 삭제(Phase 7 삭제 연쇄), 반려동물 기념 전환(Phase 4 memorial - 스키마 `status`, `passedAt`만 있음), 댓글 수정, 반응 알림(Phase 6).

### 세션 이동 권고 (2026-10-01, Phase 3 종료 시점)

- **새 세션으로 옮긴다.** 이 세션은 Phase 3 구현, PR, 머지, 스테이징 반영, R2 회귀 복구까지 마쳐 컨텍스트가 크고, 진행 중 PR이 없다(PR woopinbell/bombyeol#5 머지, 구독 해제 완료).
- 환경 변경 필요 없음: Phase 4 서버는 새 키가 없다(ENV_MANIFEST에 Phase 4 항목 없음). 클라우드 환경의 R2 변수는 없어도 된다(테스트는 메모리 저장소).
- 코드 상태: 작업 브랜치 `claude/gracious-wright-1xpzcj` = main 3b0d90d(미푸시 변경 없음). 새 세션은 main에서 자기 작업 브랜치를 딴다.
- 새 세션 시작 시: Docker 데몬이 꺼져 있을 수 있음(`dockerd &` → `npm run db:up`), `npm ci`, 스키마 변경 후 `npx prisma generate`.
- 새 세션 첫 프롬프트(`CLOUD_SESSION.md` §4.1, 3번만 채움): "오늘 할 일: Phase 4(이야기) 서버 먼저, UI 제외. Reaction에 storyEntryId, 별 하나 추가, storageFromEnv 오류 문구에 R2_ACCOUNT_ID 추가도 함께."

### 다음 할 일 (Phase 3 이후)

1. ~~PR, main 머지~~ 완료(PR woopinbell/bombyeol#5, 3b0d90d).
2. ~~스테이징 반영~~ 완료. R2 회귀도 해결: 사용자가 `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`를 **Secret**으로 재등록(R2_ACCOUNT_ID도 한때 평문 변수였음) → Worker Secret = R2_ACCESS_KEY_ID, R2_ACCOUNT_ID, R2_SECRET_ACCESS_KEY + AUTH 5종, `R2_BUCKET_NAME`만 wrangler.jsonc var. 스모크(버전 cefbebd7): db ok, 크기, 타입 위반 PUT 403, 정확한 PUT 200, Head 1000 image/jpeg, copy, cleanup ok. 이제 배포해도 R2 값이 지워지지 않는다.
3. ~~`storageFromEnv` 오류 문구에 `R2_ACCOUNT_ID` 추가~~ 완료(Phase 4 브랜치 `fix(media)` 커밋).
4. ~~결정 필요~~ **사용자 승인(2026-10-01)**: 권한 정책(아이 기록 parent만, 반려동물, 가족 사진 grandparent 허용, relative 열람, 반응만)과 상한 수치를 결제 전 운영값으로 확정(OPEN_QUESTIONS Q-PRICE에 기록).
5. ~~다음 개발: Phase 4 이야기(별) 서버~~ 커밋 완료(위 "현재 상태 - Phase 4").

## 현재 상태 - Phase 2 (2026-10-01)

- **Phase 2 main 머지 완료(PR woopinbell/bombyeol#4, 9커밋).** Phase 2 서버 커밋 완료. 테스트 93건 통과. 스테이징 배포됨(번들 13.3 MiB, Startup 19ms, Cron `17 * * * *`), 스테이징 DB에 `media` 마이그레이션 적용(작업 브랜치 기준 수동 실행).
- 스테이징 R2(사용자 승인): 버킷 `bombyeol-staging-media`(APAC), 수명주기 `pending/` 1일 만료, CORS(스테이징, localhost 출처의 PUT, content-type만). 재현 스크립트 `scripts/r2-bucket-setup.sh`. **사고(즉시 복구)**: 처음에 수명주기 접두사를 `spaces/`로 걸어 "모든 객체 1일 삭제" 규칙이 됐다 - 버킷이 비어 있을 때 바로 지우고 `pending/`으로 다시 걸었다. 그래서 업로드 키를 `pending/{spaceId}/{id}` → 확정 시 `spaces/{spaceId}/{id}`(S3 CopyObject)로 바꿨다(ARCHITECTURE §5 갱신).
- 설계 요약: 저장소는 S3 API 하나(aws4fetch)로 presign PUT(길이, 타입 서명), Head, Copy, Delete, presign GET. 판정은 confirmed + 진행 중(pendingTtl 1h 안) 합계(G-03), 미확정 20개, 발급 120/h, 500/일(G-04), 확정은 올린 사람만, Head로 크기, 타입 일치(G-02), 삭제는 R2 먼저 → DB(G-05), Cron은 버려진 업로드, 오래된 카운터 정리와 급증 경고(G-05, G-15, G-17). 수치는 `plan.ts` 초안.
- 내부 경로(`/api/internal/cleanup`, `/smoke`)는 AUTH_SECRET에서 용도별 HMAC 토큰을 유도해 인증(없으면 404). 스모크: `node scripts/smoke-staging.mjs`(AUTH_SECRET 필요) - **스테이징 R2 왕복 통과(2026-10-01, 사용자가 토큰을 Worker Secret으로 등록 후)**: 길이 위반 PUT 403, 타입 위반 PUT 403, 정확한 PUT 200, Head 1000 image/jpeg, Copy, 정리 ok, DB ok.
- R2_ACCOUNT_ID는 리포에 넣지 않고 Worker Secret으로 등록(클라우드 환경 값을 stdin으로).

### 세션 이동 권고 (2026-10-01, Phase 2 종료 시점)

- 이 세션(제목 "Phase 0") 컨텍스트 약 52% 사용(518k/1M). Phase 3는 스키마, 피드, 마일스톤 등 커밋이 많아 **새 세션 권장**(PR woopinbell/bombyeol#4 머지 확인까지는 이 세션).
- 새 세션에 필요한 환경 변경 없음(R2 토큰은 Worker Secret이라 세션 무관). 첫 프롬프트는 `CLOUD_SESSION.md` §4.1에 "오늘 할 일: Phase 3(서버 먼저, UI 제외)"을 넣는다.
- 새 세션 시작 시: Docker 데몬이 꺼져 있을 수 있음(`dockerd &` → `npm run db:up`), `npm ci` 필요할 수 있음. 작업 브랜치는 세션이 지정하는 새 이름을 쓴다.

### 다음 할 일 (Phase 2 이후)

1. ~~R2 S3 토큰 발급, 등록~~ 완료(사용자, Worker Secret만 - 클라우드 환경에는 넣지 않음), 스모크 통과.
2. 브라우저 직접 업로드(CORS)는 UI가 생길 때(Phase 3 이후) 사용자 기기에서 확인 - 미완료 검증.
3. ~~Phase 2 PR, 머지~~ 완료. 다음: **새 세션에서** Phase 3(오늘: Pet, Moment, Milestone) 서버부터.

## 현재 상태 - Phase 1 (2026-10-01)

- 스테이징 생성(사용자 승인): Hyperdrive `bombyeol-staging`(id `610ad8cefd3f49268ca0a581b488d80d`, Supabase 직결) + Worker `bombyeol-staging` → https://bombyeol-staging.seungwoo7050.workers.dev . 스모크 `GET /api/trpc/health` 200(Worker → Hyperdrive → Supabase 왕복). 배포 직후 몇 초는 이전 버전이 응답할 수 있음(404를 한 번 봄).
- **Phase 1 main 머지 완료(PR woopinbell/bombyeol#3, 머지 커밋 a2a1145).** (이전 기록) Phase 1 서버 커밋 9개 완료(브랜치 `claude/cloud-session-phase-0-72a2lc` - PR woopinbell/bombyeol#2 머지 후 main에서 같은 이름으로 다시 땀). 테스트 54건 통과. **main 미머지, PR 미생성.** 온보딩 화면 2커밋은 Phase DS 이후.
- 결정, 구현 요약:
  - 인증: Auth.js v5 beta.32, JWT 세션. 로그인 시 `Account(provider, providerAccountId)`로 `User`를 찾거나 만든다(`src/server/auth/users.ts`). **이메일, 프로필 사진은 저장, 토큰 보관하지 않음**(PRIVACY 최소 수집), 이름만 50자. 로그인 signin/callback에 IP당 30회/시간(G-07, DB 카운터).
  - 접근 통제: `protectedProcedure` → `spaceProcedure`(멤버 아니거나 삭제된 Space면 NOT_FOUND) → `parentProcedure`/`spaceRoleProcedure(...)`(FORBIDDEN).
  - 상한(`src/lib/plan.ts`, 모두 **초안**): 사용자당 Space 생성 2(쿨다운 30일 안에 삭제한 것 포함), 소속 6 / 무료 역할 정원 parent 2, grandparent 4, **relative 0**(PRD §5 초안대로 친척은 프리미엄) / 아이 3 / 활성 초대 10, TTL 72h, 발급 20회/일 / 코드 실패 사용자 5회/15분, IP 20회/시간.
  - 동시성: 개수 확인→생성은 `pg_advisory_xact_lock`(트랜잭션 범위)으로 직렬화. 드라이버 어댑터가 void 반환을 못 읽으므로 `$executeRaw` 사용.
  - 초대코드: 31자 알파벳(0/O/1/I/L 제외) 6자, 거부 샘플링. 링크도 같은 코드(`/invite/{code}`). 실패 사유는 구분하지 않음(INVITE_INVALID).
  - 에러 메시지는 사유 코드(`SPACE_CREATE_LIMIT` 등, `src/server/errors.ts`) → UI에서 문구 키로 변환 예정.

### 다음 할 일 (Phase 1 이후)

1. ~~`STAGING_DATABASE_URL` 등록~~ 완료(사용자, 2026-10-01). **Supabase Session pooler(IPv4)로 GitHub 러너 → Supabase 마이그레이션 확인.** 주의: 수동 실행(workflow_dispatch)은 기본이 main이라 main에 없는 마이그레이션은 적용되지 않는다 - 첫 실행이 그래서 "No migration found". 작업 브랜치 기준으로 다시 실행해 `init` 적용(main 머지 전 스테이징 검증용).
2. ~~redirect URI 등록~~ 완료(사용자). 스테이징 500의 실제 원인은 **OpenNext가 Turbopack의 스코프 패키지 해시 외부 이름(`@prisma/client-<hash>`)을 매핑하지 못한 것**(`No such module .../wasm-compiler-edge`, OpenNext 1.20.7 `discoverExternalModuleMappings`가 `.next/node_modules` 최상위 링크만 읽음). `next.config.ts`의 `transpilePackages: ["@prisma/client"]`로 번들 포함해 해결(`fix(infra)` 커밋). 확인: health 200, 비로그인 space.list 401, CSRF+POST 로그인 시작 → kauth/accounts.google 302(redirect_uri 정확). **사용자 브라우저 실로그인 통과(2026-10-01): Google, 카카오 모두 → `user.me`로 provider 확인, `space.list` 빈 목록 200.** 카카오 콘솔 동의항목: 닉네임 필수, 프로필 사진 선택(사용자 설정) - 코드는 이름만 저장하고 사진은 저장하지 않는다(PRIVACY 최소 수집, 필요해지면 별도 결정). 이름 없이 가입한 계정은 다음 로그인 때 이름을 채운다(`fix(auth)`). 확인용 `/api/auth/session`은 userId만 보이므로 `/api/trpc/user.me`를 쓴다. 교훈: 배포 후 health만이 아니라 인증 경로도 스모크한다.
3. ~~Phase 1 PR 머지~~ 완료(a2a1145). 이후 Phase 2(미디어) - R2 버킷, 토큰 신규 발급 필요(ENV_MANIFEST Phase 2), 버킷 생성은 승인 후.
4. 결정 필요(사용자, 급하지 않음): 무료 relative 0명 유지 여부, 위 상한 수치(Q-PRICE). 카카오 이메일 미수집 확정.
5. 정리 Cron(InviteCodeAttempt, RateCounter 보관 기간, G-17)은 Phase 2 Cron 커밋에서 함께.

주의(이번 세션):
- Prisma 7은 `migrate dev` 후 클라이언트를 자동 생성하지 않는다 → 스키마 변경 후 `npx prisma generate`(postinstall에도 있음).
- 인터랙티브 트랜잭션 안에서 unique 위반이 나면 트랜잭션 전체가 중단된다 → 재시도 대신 미리 조회(초대코드).

## 다음 할 일 (2026-10-01, Phase 0 세션 종료 시점)

Phase 0 코드는 `claude/cloud-session-phase-0-72a2lc`에 있다(main 미머지). 커밋: repo → tooling(ESLint/Prettier) → tooling(Tailwind, shadcn) → infra → prisma → testing → i18n → env → ci. 로컬 검증: format, lint, typecheck, Vitest 6건, `next build`, OpenNext 빌드, `wrangler dev`(로컬 Hyperdrive → Docker PG 17.11 왕복) 통과. GitHub CI(PR 또는 main push에서만 실행)는 PR woopinbell/bombyeol#2에서 첫 실행 **통과**(2026-10-01, 1분 45초, Postgres 서비스 컨테이너 포함).

사용자 결정, 작업 대기:
1. ~~PR woopinbell/bombyeol#2 머지~~ 완료(2026-10-01, 머지 커밋 06591ce). Phase 1은 main에서 새로 딴 작업 브랜치로.
2. **GitHub Actions 시크릿 `STAGING_DATABASE_URL`** 등록(Supabase Session pooler IPv4 문자열, ENV_MANIFEST "Phase 0 - CI, 로컬"). 등록 후 `Migrate staging DB` 워크플로 수동 실행으로 풀러 경로 확인.
3. **스테이징 리소스 생성 승인**: Hyperdrive `bombyeol-staging`(DATABASE_URL 직결로 생성) + Worker `bombyeol-staging` 배포(`npm run cf:deploy:staging`). 승인되면 Hyperdrive id를 `wrangler.jsonc`의 `env.staging.hyperdrive`에 추가하는 커밋 → 배포 스모크. URL은 `bombyeol-staging.<계정 서브도메인>.workers.dev` 예상 → 카카오, Google redirect URI 갱신 필요(Phase 1 전).
4. 원격 임시 브랜치 **`tmp-v2-pushtest` 삭제**(GitHub 웹 Branches 화면). V-2 시험용으로 기존 docs 커밋(df7b358)을 가리킬 뿐 새 커밋은 없다. 클라우드 세션의 `git push --delete`는 원격이 연결을 끊어 실패했다.
5. 다음 개발: Phase 1(`chore(prisma): User/Space/Member/Invite 스키마`부터). UI 화면 커밋은 Phase DS 이후.

Phase 0 세션에서 얻은 주의사항:
- **`prettier --write .`가 루트 링크 `docs`, `image-asset`을 따라가 docs 브랜치 파일까지 재포맷**했다(되돌림 완료). `.prettierignore`, ESLint ignore, tsconfig exclude에 `.docs/ docs CLAUDE.md image-asset`을 넣어 해결. 새 도구를 추가할 때도 링크 제외를 확인한다.
- Prisma `runtime = "workerd"` 클라이언트는 `*.wasm?module`을 import해 Node에서 그대로 안 돈다 → `vitest.config.ts`의 로더 플러그인으로 같은 클라이언트를 테스트에서 사용(별도 Node 생성기 없음).
- 클라우드 환경 `DATABASE_URL`은 Supabase이므로 로컬 작업은 항상 `npm run db:*`/`npm test`(내부적으로 `scripts/with-local-db.mjs`)로 실행한다. `npx vitest` 직접 실행 시 globalSetup이 원격 URL을 거부한다.
- `wrangler.jsonc`의 `hyperdrive`는 env 상속이 안 되는 키라 `CloudflareEnv.HYPERDRIVE`가 optional 타입 → `createPrisma()`가 없으면 명시적으로 throw.
- Docker 데몬은 세션 시작 시 꺼져 있을 수 있다 → `dockerd &` 후 `npm run db:up`.

## (이전) 다음 할 일 (2026-10-01 갱신)


**Phase 0 착수** - 새 클라우드 세션 권장(아래 "새 세션 시작 프롬프트"는 `CLOUD_SESSION.md` §4). 스파이크에서 얻은 Phase 0 반영 사항:
- 스캐폴드: `create-next-app`은 **`--disable-git`** 으로, 임시 폴더에서 만들면 `.git` 제외 복사(사고 기록 참고). 생성되는 `AGENTS.md`/`CLAUDE.md`는 리포의 CLAUDE.md 링크와 충돌하므로 처리 방침 결정(Next가 `next dev` 때 다시 만든다는 안내가 있음 - main에 `AGENTS.md`만 두고 루트 `CLAUDE.md`는 docs 링크 유지 권장).
- `prisma init`이 만드는 `.agents/ .claude/ .windsurf/ skills-lock.json`은 커밋하지 않는다. Prisma는 7.10.x 고정(`latest`가 8 RC), 생성기 `runtime = "workerd"`.
- `next.config.ts`에 `outputFileTracingExcludes`(wrangler, workerd, Prisma CLI, PGlite 등) 필수 - 없으면 53 MiB.
- 레이트 리밋은 DB 카운터 주력, 업로드는 presign(Content-Length/Type 서명) + confirm HeadObject 기본.
- Supabase 마이그레이션 CI: GitHub 호스티드 러너는 IPv6가 없어 Supabase 직결(IPv6) 불가 가능성이 높다 → **Supabase Session pooler(IPv4) 연결 문자열을 GitHub Actions secret으로** 받는 방식이 유력(Phase 0 `chore(infra)` 때 이름을 ENV_MANIFEST에 먼저 적고 요청).
- 키 재사용: 카카오, Google, Firebase 콘솔에 등록된 redirect/도메인은 삭제된 스파이크 URL(`bombyeol-spike-s1.seungwoo7050.workers.dev`) 기준 → 개발 배포 URL이 정해지면 갱신 필요. R2 S3 토큰은 삭제된 버킷 한정이라 무효 - 대시보드에서 폐기 권장, Phase 2에서 새로 발급.

### (이전) 다음 할 일

1. ~~리포 부트스트랩~~ 완료. 주의: 루트 심볼릭 링크 `docs`와 브랜치 `docs`의 이름이 겹쳐 `git log docs`가 모호 오류를 낸다 → 브랜치는 `refs/heads/docs`(또는 `.docs/`에서 `git -C .docs ...`)로 참조한다.
2. (사용자) 클라우드 환경 생성(리포 `woopinbell/bombyeol`). 스파이크 전에 필요한 키(`ENV_MANIFEST.md` Phase S)는 Claude가 세션에서 정확히 요청한다.
3. 첫 클라우드 세션: 부트스트랩 검증 V-1~V-5 → 스택 스파이크 S-1~S-8 → 결과로 `ARCHITECTURE.md` 확정 → Phase 0(토큰 이식 제외).
   **디자인은 Kaddie가 먼저**(2026-10-01 결정): 봄별은 기술 스파이크만 병행하고, Phase DS(로고, 폰트, 목업, 토큰)는 Kaddie 디자인이 자리 잡은 뒤 진행.
4. 첫 세션에서 디자인 리서치 §7 병행.

## 부트스트랩 검증 결과 (첫 클라우드 세션, 2026-10-01 KST)

| ID | 결과 | 비고 |
|---|---|---|
| V-1 | **통과** | 클라우드 clone은 전체 refspec(`+refs/heads/*`), 얕은 clone 아님. `git fetch origin docs` 정상 |
| V-2 | **통과** | `.docs/`에서 `git push origin docs` 성공(이 PROGRESS 갱신 커밋 자체로 검증, 시험용 커밋 없음). 세션 지정 브랜치(`claude/*`) 외 이름도 푸시 가능 |
| V-3 | **해당 없음/실패로 간주** | 링크는 부트스트랩(첫 프롬프트) 이후 생기므로 세션 시작 시 CLAUDE.md 자동 로드는 안 된다. 링크, `.docs/`는 exclude 대상이라 새 clone에 없음 → 첫 프롬프트로 직접 읽게 하는 현 방식 유지(또는 setup 스크립트/SessionStart 훅, Q-HOOK) |
| V-4 | **가능(도구 확인)** | 세션에 `add_repo` 도구가 있어 두 번째 리포를 붙일 수 있다(실제 추가는 하지 않음). 별도 docs 리포 대안이 필요해지면 사용 |
| V-5 | **통과(재열기 반영됨)** | 2026-10-01 사용자가 환경변수 추가 후 같은 세션을 이어가자 새 값이 보였다(VM 파일 `.docs/` 등은 그대로 유지). 단 반영되지 않는 경우를 대비해 안 보이면 새 세션으로 재개 |

부가 확인: Node 22.22, npm 10.9, Docker 29.3 사용 가능. 프록시 경유로 `api.cloudflare.com`, `kauth.kakao.com` 실제 응답 200 확인(S-8 사전 확인). (최초엔 Phase S 키 미설정 → 아래 "Phase S 키 확인" 참고.) 세션 VM 시계는 UTC(문서 날짜는 KST 기준).

### 재검증 (Phase 0 세션, 2026-10-01)

| ID | 결과 | 비고 |
|---|---|---|
| V-1 | 통과 | refspec `+refs/heads/*`, 얕은 clone 아님. `git fetch origin docs` 정상 |
| V-2 | 통과(push) | 시험용 커밋 없이 기존 docs 커밋을 새 브랜치 `tmp-v2-pushtest`로 push → 성공(비 `claude/*` 이름 허용). 단 **원격 브랜치 삭제 push는 실패**(원격이 연결 끊음) → 임시 브랜치가 남음, 사용자 삭제 필요. docs 브랜치 실제 push는 이 세션의 문서 커밋으로 확인 |
| V-3 | 자동 로드 안 됨(기존과 동일) | 첫 프롬프트로 직접 읽는 방식 유지 |
| V-4 | 가능 | `add_repo` 도구 존재(사용 안 함) |
| V-5 | 해당 없음 | 이 세션에서 환경변수 변경 없음. Phase 0~1, S 키 존재 확인(값 미출력) |

## Phase S 키 확인 (2026-10-01, 값은 출력하지 않고 확인)

- `CLOUDFLARE_API_TOKEN`: 설정됨, `/user/tokens/verify` → active(사용자 토큰; 계정 토큰 엔드포인트는 1000 오류로 해당 없음). 계정 범위 API 조회 성공: Workers 스크립트 0, **R2 버킷 1개(기존)**, Hyperdrive 설정 0.
- `CLOUDFLARE_ACCOUNT_ID`: 설정됨, 32자 hex 형식 확인.
- `DATABASE_URL`: 설정됨. 공급자 **Supabase**, **직결(direct) 연결 문자열**(`db.<ref>.supabase.co:5432`, 쿼리 파라미터 없음).
  - 이 호스트는 **AAAA(IPv6)만** 응답한다(Supabase 직결의 기본 특성). 클라우드 VM은 IPv6 미지원, 프록시 밖 직접 TCP(5432)도 타임아웃 → **클라우드 VM에서 DB 직접 접속 불가**.
  - 프록시 CONNECT 터널로 5432 도달은 가능했지만(200), 로컬 포워더로 psql을 붙이는 방식은 세션 권한 정책에서 거부됨. 우회 시도하지 않음.
  - 결론: 클라우드 세션에서는 DB 왕복을 **로컬 Docker Postgres**로 검증하고(원래 테스트 방침과 동일), 실제 Supabase 왕복은 **배포된 Worker → Hyperdrive** 경로에서 검증한다(S-1 통과 기준이 바로 이것). Hyperdrive가 Supabase 직결(IPv6) 문자열을 받는지, 아니면 Supavisor 풀러(IPv4) 문자열이 필요한지는 S-1에서 확인(미검증).

## 스파이크 결과 (기록란)

| ID | 결과 | 날짜 |
|---|---|---|
| S-1 | **통과(쿼리 왕복)** - 원격 쓰기, 마이그레이션 경로는 미결 | 2026-10-01 |
| S-2 | **통과(사용자 브라우저 실로그인 확인)** - Auth.js v5 beta 리스크 기록 | 2026-10-01 |
| S-3 | **통과(Worker 프록시, presign 둘 다)** | 2026-10-01 |
| S-4 | **재측정 완료**(전 기능 통합 12.2 MiB) - 출시 시 유료, 개발 중 무료 | 2026-10-01 |
| S-5 | **통과(사용자 Android 실기기 수신 확인)** | 2026-10-01 |
| S-6 | **통과(DB 카운터 주력 + 바인딩 보조)** | 2026-10-01 |
| S-7 | **통과** | 2026-10-01 |
| S-8 | **통과(HTTPS 전부)** - DB 직접 TCP만 불가(설계로 우회) | 2026-10-01 |

### S-1 상세 (브랜치 `spike/s1-opennext-prisma`, main 머지 금지)

- 버전: Next.js 16.3.8, `@opennextjs/cloudflare` 1.20.7, Prisma 7.10.0(`prisma-client` 생성기, `runtime = "workerd"`, `@prisma/adapter-pg`), tRPC 11.19, wrangler 4.145. 주의: npm `prisma@latest`가 8.0.0-rc를 가리켜 7.10.0으로 고정. `prisma init`이 `.agents/ .claude/ .windsurf/ skills-lock.json`(Prisma 에이전트 스킬)을 자동 생성하므로 커밋하지 않고 지운다.
- 패턴: 요청마다 `PrismaClient`(adapter-pg, `max: 1`) 생성, 연결 문자열은 `getCloudflareContext().env.HYPERDRIVE.connectionString`. 로컬은 wrangler `localConnectionString`으로 Docker Postgres.
- **로컬**: `opennextjs-cloudflare build` → `wrangler dev` → tRPC `ping`(읽기), `write`(쓰기) 왕복 성공(Docker `postgres:17` = 17.11).
- **원격**: Hyperdrive `bombyeol-spike-s1`(id `073ee1da206c4cf984dca3e2eed8034b`)를 **Supabase 직결(IPv6) 문자열 그대로** 생성 성공 → Worker `bombyeol-spike-s1`(https://bombyeol-spike-s1.seungwoo7050.workers.dev) 배포 → `dbVersion` 200, Supabase **PostgreSQL 17.11** 확인(로컬과 동일 버전). 응답 0.4~2.3s(첫 호출 콜드).
  - 결론: Hyperdrive는 Supabase 직결 IPv6를 받는다 → **앱 런타임에는 풀러 문자열 불필요.** DB 공급자 Supabase로 S-1 기준 통과.
  - 배포된 `*.workers.dev`는 클라우드 VM에서 curl로 도달 가능 → 배포 스모크를 세션 안에서 자동 수행할 수 있다.
- **미결**: Supabase에 스키마 적용 경로(원격 `SpikePing` 테이블 없음 → `ping`은 "table does not exist" 500, 즉 DB 도달은 확인). CLOUD_SESSION §2.1대로 **CI(GitHub Actions) 마이그레이션**을 Phase 0에서 구성 - 이때 필요한 비밀값(이름, IPv4 풀러 필요 여부)은 그 시점에 ENV_MANIFEST에 먼저 적고 요청.
- **S-4 사전 신호**: 배포 출력 `Total Upload 54,672 KiB / gzip 18,092 KiB`, Startup 20ms. 빈 앱인데도 크다(Prisma, Next 서버 번들). 요금제 한도 대비 판단은 S-4에서.
- 생성한 Cloudflare 리소스(정리 대상, 스파이크 종료 후 삭제 여부 사용자 확인): Hyperdrive `bombyeol-spike-s1`, Worker `bombyeol-spike-s1`, R2 버킷 `bombyeol-spike-s3`(비어 있음). 모든 스파이크 코드는 `spike/s1-opennext-prisma` 한 브랜치에 누적.

### S-2 상세 - Auth.js 카카오, Google (같은 스파이크 브랜치)

- 키 5종 클라우드 환경 주입 확인(2026-10-01, 값 미출력): 형식 정상. 가짜 인가 코드로 토큰 엔드포인트 호출 → Google `invalid_grant`, 카카오 `KOE320`(코드 없음) = **클라이언트 자격증명 유효**(대조: 틀린 secret은 `invalid_client`/`KOE010`).
- 구현: `next-auth@5.0.0-beta.32`(v5는 2026-10 현재도 **beta** - 리스크로 기록, 대안 Better Auth 1.7.x), JWT 세션(DB 어댑터 없음), `trustHost: true`, tRPC `protectedProcedure`(`me`: 세션 + DB `now()` 왕복).
- Worker 시크릿: 환경변수 값을 stdin으로 `wrangler secret put`(출력, 파일 기록 없음). 이후 키를 바꾸면 시크릿도 다시 넣어야 한다.
- 원격 확인: 비로그인 `me` → 401, `/api/auth/providers` 콜백 URL이 등록값과 일치, 로그인 시작 → kauth.kakao.com / accounts.google.com로 302(PKCE 사용, redirect_uri 정확). 번들 12.1 MiB, Startup 23ms.
- **사용자 브라우저 실로그인 확인 완료(2026-10-01)** → 보호된 tRPC `me` 호출 성공. 같은 시간대 Worker 분석: 192요청, 오류 0(경로별 분해는 미제공). 카카오는 이메일 동의 없이(비즈 앱 전환 전) 로그인, 식별(`sub`=카카오 ID) 가능 → 이메일 수집 여부는 Phase 1 설계에서 결정(PRIVACY 관점에서는 미수집이 유리).
- 남은 리스크: Auth.js v5가 beta. Phase 1 착수 시 버전 고정, 업그레이드는 별도 커밋. 문제가 생기면 Better Auth로 전환(카카오 지원).
- 주의: 확인 중 카카오 REST API 키(client_id, 브라우저 인가 URL에 원래 노출되는 공개값)가 세션 출력에 한 번 찍힘. secret 계열은 출력되지 않음.

### S-3 상세 - R2 업로드 크기 강제 (같은 스파이크 브랜치, 버킷 `bombyeol-spike-s3`)

- 방식: `PUT /api/spike/upload?bytes=N` → 서버가 Content-Type 화이트리스트, 선언 크기 상한 검사 → 본문을 `FixedLengthStream(N)`에 통과시켜 R2 바인딩 `put` → `head`로 크기 재확인. 불일치면 삭제, 400.
- 원격 결과: 정확 1000B 200 / 본문 2000B(선언 1000) 400 / 본문 500B 400 / 선언 상한 초과 413 / 금지 타입 415 / 거부 후 잔존 객체 0 / 9MB 2.6s 200.
- 차이: chunked 전송(Content-Length 없음)은 크기가 정확해도 **원격에서 거부**(로컬은 통과). 실패 쪽으로 닫히므로 안전하고, 브라우저 `fetch(File/Blob)`은 Content-Length를 보낸다. 앱은 Content-Length 필수로 명시.
- 결론: G-01은 **Worker 프록시 방식으로 충족 확인.**
- **presign 비교(2026-10-01, `spikes/s3-presign/`)**: R2 S3 키는 `bombyeol-spike-s3` 한정(ListBuckets, 타 버킷 403 확인). SigV4 쿼리 서명에 `content-length`, `content-type`을 포함하면 - 정확 1000B 200 / 5000B, 500B 403 `SignatureDoesNotMatch` / 다른 타입 403. **대조군(길이 미서명)은 5000B도 200** = hamkke의 구멍 재현. 브라우저는 본문으로 Content-Length를 자동 설정하므로 클라이언트 직접 업로드에도 적용 가능.
- 방식 선택(제안, Phase 2에서 확정): **presign + 서명된 Content-Length/Type + confirm 시 HeadObject 크기 재확인**을 기본으로(업로드 바이트가 Worker CPU, 요청 수를 거치지 않음, 무료 플랜 친화), Worker 프록시는 대안. 어느 쪽이든 G-01, G-02 테스트로 고정.

### S-4 상세 - 번들, CPU 기준선

- 한도(공식 문서 2026-10 확인): Worker 크기 **비압축 64 MiB**(무료, 유료 동일, 압축 한도 없음), 시작 시간 1s, CPU **무료 10ms/요청**, 유료 기본 30s(최대 5분). 유료 = 월 $5 최소, 1천만 요청, 3천만 CPU-ms 포함.
- 최초 빌드 53.4 MiB(한도 근접) - 원인: Next 출력 추적이 next.config(`@opennextjs/cloudflare`→wrangler), prisma.config 경유로 wrangler, workerd, Prisma CLI, PGlite까지 끌어오고 OpenNext가 모든 `.wasm`을 번들. `outputFileTracingExcludes`로 **11.5 MiB**(gzip 3.1 MiB), Startup 20ms. → Phase 0 `chore(infra)`에 이 제외 목록 포함.
- CPU(`wrangler tail` 실측): 웜 `dbVersion` 8~20ms, **콜드 isolate 200~450ms**, SSR 페이지 30~340ms. → **무료 플랜(10ms) 불가, Workers Paid 필요**(ARCHITECTURE §10 추정과 일치). 비용 예: 평균 100ms × 100만 요청 ≈ 초과 CPU $1.4 + 기본 $5.
- 계정 플랜 상태는 토큰 권한으로 조회 불가(구독 API 10000). 현재 요청은 모두 ok - 사용자 확인 필요.

### S-5 상세 - FCM 웹푸시 (같은 스파이크 브랜치)

- 키 10종 확인(값 미출력): 프로젝트 ID 일치, authDomain, appId(senderId 포함), 서비스 계정 이메일 도메인, PEM, VAPID(65바이트 P-256) 모두 정상. 서비스 계정 → OAuth 토큰 발급 200, FCM v1 `validate_only` 가짜 토큰 → `INVALID_ARGUMENT`(= API 활성, 권한 정상). 주의: 환경 UI에 넣은 `FIREBASE_ADMIN_PRIVATE_KEY`는 `\n` 이스케이프가 아니라 **실제 줄바꿈**으로 들어왔다 → 코드가 두 형태 모두 처리.
- 구현: `firebase-admin` 없이 WebCrypto(RS256)로 서비스 계정 JWT 서명 → 토큰 교환(모듈 스코프 캐시) → FCM HTTP v1 fetch. 발송 API는 로그인 필수(비로그인 401). 클라이언트는 firebase 12.19.0 + `firebase-messaging-sw.js`(공개 설정은 SW 등록 URL 쿼리로 전달, 파일에 키 없음).
- 원격 진단: Worker에서 가짜 토큰 발송 → FCM 도달(`INVALID_ARGUMENT`) 확인.
- **사용자 실기기 수신 확인 완료(2026-10-01).** iPhone(홈 화면 PWA)은 Phase 6에서 확인.

### S-4 재측정 (2026-10-01, S-2, S-3, S-5 통합 후)

- 번들 12.2 MiB(gzip 3.3 MiB) / 한도 64 MiB, Startup 21ms.
- CPU(p50/최대): `dbVersion` 178/491ms, SSR `/` 102/328ms, `/api/auth/session` 9/238ms, FCM 진단 9/215ms. 모든 요청 ok(오류 0).
- 판정 유지: 출시 기준 Workers Paid 필요, 개발 중은 Free(사용자 결정). 콜드 비용(Prisma wasm, Next 초기화) 절감은 Phase 0 이후 과제.

### S-6 상세 - 레이트 리밋

- 바인딩(`ratelimits`, 5/60s): 로컬은 정확히 6번째부터 429. **원격은 매우 관대** - 고정 키로 약 35회 통과 후에야 간헐적 429. 문서상 Cloudflare 위치(PoP) 단위, 10/60초 창만 지원, 결과적 일관성. 또한 클라우드 VM의 송신 IP가 여러 개로 바뀐다(IAD).
- DB 카운터(`RateCounter` 고정 창 upsert, 5/3600s): 로컬 정확히 6번째부터 429. 원격은 Supabase 마이그레이션 경로 확정 후 확인.
- 결론: **정확성이 필요한 비용 게이트(G-04 발급 횟수, G-07 로그인, 초대 시도, G-11 생성 수, brute-force)는 DB 카운터**, 바인딩은 앞단 폭주 완화용 보조. 이 결정을 ARCHITECTURE §1에 반영.

### S-7 상세 - 클라이언트 한글 PDF (`spikes/s7-pdf/`)

- pdf-lib + @pdf-lib/fontkit + Pretendard TTF(2.7MB), 헤드리스 Chromium.
- 100쪽, 쪽당 약 900자(서로 다른 음절 다수, 서브셋 최악 근사): 서브셋 **3.2s / 0.49MB**, 비서브셋 3.6s / 1.43MB. 쪽당 사진 1장(1200×900 JPEG) + 400자: 1.5s / 5.6MB(크기는 사진이 지배).
- CPU 6배 스로틀(저사양 폰 근사): 100쪽 텍스트 22.6s → 실제 구현은 **Web Worker + 진행률 표시** 필요.
- 한글 추출 검증(pdfjs): 원문과 정확히 일치.
- 결론: 클라이언트 생성 유지(G-13). 실기기 시간은 사용자 기기에서 후속 확인(미완료 검증).

### S-8 상세 - 클라우드 세션 외부 호스트

HTTPS 응답 확인(프록시 거부 0건): api.cloudflare.com, `*.workers.dev`(배포 Worker), `<account>.r2.cloudflarestorage.com`, api.supabase.com, kauth/kapi/developers.kakao.com, accounts.google.com, oauth2/www.googleapis.com, fcm/firebase/firebaseinstallations.googleapis.com, github.com, api.github.com, registry.npmjs.org, cdn.jsdelivr.net. 결제 공급자 호스트는 Q-PAY 결정 후 추가. DB 직접 TCP는 불가(위 "Phase S 키 확인") → 배포 Worker, CI 경로로 설계.

### 사고 기록 (2026-10-01, 로컬 한정, 복구 완료)

create-next-app이 임시 폴더에서 자체 `git init`을 했고 이를 `cp -r .`로 리포 루트에 복사해 `.git/config`, `HEAD`, 로컬 `main` 참조, 인덱스, `info/exclude`를 덮어썼다. 원격, docs 브랜치 피해 없음. 사용자 승인 후 remote 설정, `main`(9744db2, origin/main과 일치), HEAD, 인덱스, `.gitignore`, exclude 복구, fsck 정상. 재발 방지: 스캐폴드는 `--disable-git`으로 만들거나 `.git`을 빼고 복사한다.

## 미완료 검증 항목

- 브라우저 직접 업로드 CORS(UI 이후 사용자 기기). (스테이징 R2 서버 측 왕복은 2026-10-01 통과)

- 계정 플랜이 Free인지 대시보드 확인(사용자)
- S-6 DB 카운터 원격 동작(Supabase 마이그레이션 경로 확정 후)
- S-7 실기기(저사양 Android, iPhone) PDF 생성 시간
- Supabase 원격 마이그레이션 경로(CI) - Phase 0

## 임시 완화한 게이트 (`TODO(G-xx)`)

- (없음)

## 세션 로그

- 2026-10-01: 구상 대화 정리, hamkke 구조, 점검 결과 분석, 디자인 계승자 웹 검증, 스택 조사, 기반 문서 작성. 문서, 에셋 커밋은 아직 없음(사용자 지시 대기).

- 2026-10-01(후속): 사용자 지시로 리포 부트스트랩 수행(main 초기 커밋, docs 고아 브랜치 커밋, GitHub private 리포 생성, 두 브랜치 푸시). 이 PROGRESS 갱신은 아직 커밋하지 않음(지시 대기).

- 2026-10-01(정정): 리포를 잘못된 계정(seungwoo7050)에 만들어 `woopinbell/bombyeol`(private)로 다시 생성, 푸시. 옛 리포는 사용자가 삭제.

- 2026-10-01(추가 결정): 반려동물을 V1부터 가족 구성원(Pet)으로 포함. PRD §2, §4.2.1, §4.5, §5, §6, COMMIT_PLAN Phase 3, 4, 5, COST_GUARDS G-11, PRIVACY §1, CLAUDE.md 스코프 갱신. 의료 기록 관리(투약 알림 등)는 후속으로 분리.
- 2026-10-01(추가 결정): 봄별 디자인은 Kaddie 이후. COMMIT_PLAN에 Phase DS와 진행 순서 메모 추가.
- 2026-10-01(정책 변경): 문서 브랜치가 분리되어 있으므로 docs 커밋은 지시 없이 수시로 자율 수행(main 금지). WORKFLOW §4, CLAUDE.md, CLOUD_SESSION 개정.
- 2026-10-01(첫 클라우드 세션): 부트스트랩 실행, V-1~V-5 검증(위 표). S-1 착수는 사용자 확인 대기(Phase S 키 미설정).
- 2026-10-01: 사용자가 Phase S 키 주입 → 키 확인(위 표). Cloudflare 정상, Supabase DB는 VM에서 직접 도달 불가로 S-1 방식 조정 제안. S-1 착수 사용자 확인 대기.
- 2026-10-01: 작업 위치 규칙 합의(CLOUD_SESSION §2.1) - 클라우드 기본, Supabase 마이그레이션은 CI, 실사용 확인은 사용자 기기. S-1 리소스(Hyperdrive 1, 시험 Worker 1) 생성 승인받음.
- 2026-10-01: S-1 수행 - 로컬, 원격(Hyperdrive→Supabase) tRPC 왕복 통과. 로컬 .git 덮어쓰기 사고 발생, 복구(위 사고 기록). 다음: S-2 착수 여부 사용자 확인, Supabase 마이그레이션 CI 경로는 Phase 0.
- 2026-10-01: S-3(Worker 프록시), S-4(기준선), S-6, S-7, S-8 수행. R2 시험 버킷 생성(승인). 로컬 dockerd가 중간에 종료돼 재기동. 다음: S-2(카카오, Google 키), S-5(Firebase), S-3 presign(R2 키) 대기.
- 2026-10-01: S-2 키 확인, 구현, 배포 → 사용자 실로그인 확인으로 통과. 다음: S-5(Firebase 키, 실기기), S-3 presign(R2 키), 이후 S-4 재측정.
- 2026-10-01(결정): 개발 중 완전 무료 유지. Workers Paid는 공개 베타 직전(또는 1102 관측 시) 재결정 - ARCHITECTURE §10. 계정 플랜은 사용자 대시보드 확인(API로는 usage_model=standard만 보여 구분 불가).
- 2026-10-01: Firebase, R2 키 확인. S-3 presign 비교 통과, S-5 서버 측 통과, 배포, S-4 재측정. 실기기 푸시 수신 확인 요청.
- 2026-10-01: S-5 실기기 통과 → 스파이크 전부 통과. 사용자 승인으로 ARCHITECTURE 확정, 스파이크 리소스(Worker, Hyperdrive, R2 버킷) 삭제(기존 `hamkke` 버킷은 유지). Phase 0은 새 세션 권장.
- 2026-10-01: PR woopinbell/bombyeol#1(spike→main)이 실수로 머지됐으나, 사용자가 로컬에서 main을 9744db2로 되돌림(확인 완료). 원격 브랜치는 `main`(9744db2), `docs`, `spike/s1-opennext-prisma`(참고용, 머지 금지) 3개. Phase 0은 새 세션에서 main 기준 작업 브랜치로 시작.
- 2026-10-01(Phase 0 세션): 부트스트랩, V-1~V-5 재검증(위 "재검증"), 스파이크는 이미 통과라 재실행 안 함. Phase 0 9커밋(디자인 토큰 제외 + CI 추가)을 `claude/cloud-session-phase-0-72a2lc`에 푸시. COMMIT_PLAN, ENV_MANIFEST 갱신. 대기: main 머지, `STAGING_DATABASE_URL` 시크릿, 스테이징 리소스 생성 승인, `tmp-v2-pushtest` 삭제.
- 2026-10-01: PR woopinbell/bombyeol#2 CI 통과 후 사용자가 머지 커밋으로 머지(06591ce).
- 2026-10-01: 사용자 승인으로 스테이징 Hyperdrive, Worker 생성, 배포, 인증 시크릿 등록. Phase 1 서버 9커밋(스키마 → tRPC → 카카오 → Google → 프로시저 → Space, 아이 → 초대 발급 → 수락, brute-force → 통합 테스트). 대기: `STAGING_DATABASE_URL`, redirect URI 등록, PR.
- 2026-10-01: 스테이징 마이그레이션(작업 브랜치 기준) 적용, Prisma 외부 모듈 배포 오류 수정, 재배포. 사용자 실로그인 확인 대기.
- 2026-10-01: 스테이징 실로그인(Google, 카카오) 사용자 확인 통과. `user.me` 추가, 빈 이름 채움 수정. 다음: Phase 1 PR(사용자 확인).
- 2026-10-01: Phase 1 PR woopinbell/bombyeol#3 생성(13커밋), CI 대기. Phase 2는 PR 머지 후 같은 작업 브랜치를 main에서 다시 따서 진행. 필요: 스테이징 R2 버킷 생성 승인, R2 S3 토큰(Worker 시크릿으로 사용자가 직접 등록).
- 2026-10-01: PR woopinbell/bombyeol#3 CI 통과 후 사용자 머지(a2a1145). 작업 브랜치를 main에서 다시 땀. Phase 2는 스테이징 R2 버킷 생성 승인 대기.
- 2026-10-01: 사용자 승인으로 R2 스테이징 버킷 생성(수명주기 접두사 실수 즉시 복구). Phase 2 커밋 10개, 스테이징 배포, 마이그레이션, 스모크 경로. 대기: R2 S3 토큰.
- 2026-10-01: R2 토큰 등록(사용자) → 스테이징 스모크 R2 왕복 통과. 다음: Phase 2 PR.
- 2026-10-01: Phase 2 PR woopinbell/bombyeol#4 생성. 사용자 규칙 추가: Phase 종료마다 세션 지속/이동 권고 보고(CLOUD_SESSION §5).
- 2026-10-01: PR woopinbell/bombyeol#4 CI 통과 후 사용자 머지. 이 세션은 여기서 종료 권장 - Phase 3는 새 세션(§4.1 프롬프트, "오늘 할 일: Phase 3(서버 먼저, UI 제외)").
- 2026-10-01(Phase 3 세션): 부트스트랩 후 Phase 3 서버 9커밋(스키마 → child → refactor(media) → pet → moment 피드 → milestone → 일기 → Reaction 스키마 → reaction), 테스트 133건. COMMIT_PLAN 설계 메모, PRD §6 데이터 모델 갱신. 대기: PR, 머지, 스테이징 반영 승인.
- 2026-10-01(Phase 3 세션): 사용자 "전부 승인" → PR woopinbell/bombyeol#5 생성, CI 통과, 머지(3b0d90d), 스테이징 마이그레이션 자동 적용, 배포, 스모크. R2_ACCESS_KEY_ID(평문 var)가 배포로 사라져 R2 스모크 실패 - 사용자 Secret 재등록 대기. 권한 정책, 상한 수치 승인 기록.
- 2026-10-01: 사용자가 스테이징 Worker에 R2_ACCESS_KEY_ID, R2_ACCOUNT_ID를 Secret으로 재등록 → R2 스모크 통과. 클라우드 세션 환경의 R2 변수 삭제와는 무관(원인은 Worker 평문 var + 배포 덮어쓰기).
- 2026-10-01(Phase 4 세션): 부트스트랩 → Phase 4 이야기 서버 8커밋(질문 카드, 쓰기, 대필, 사진, 물어보기, 별 하나, 기념) + storageFromEnv 문구 수정. 테스트 181건, 빌드 통과, 작업 브랜치 푸시. 새 키 없음. 사용자 승인 후 PR woopinbell/bombyeol#6 머지(fc94348), 스테이징 마이그레이션, 배포, 스모크 통과.
