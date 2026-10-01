# Bombyeol — 커밋 청사진

`docs/WORKFLOW.md`의 원자적 커밋 규칙을 지키기 위해 구현 전에 커밋 라인을 펼쳐둔다. 순서·타입·스코프는 `PRD.md`(기능)·`ARCHITECTURE.md`(스택)·`COST_GUARDS.md`(게이트)를 기준으로 했다.

**이 문서의 위상**: 뼈대이지 불변 목록이 아니다. 더 원자적으로 쪼개는 것은 언제나 허용, 통째로 건너뛰거나 뭉치는 것은 하지 않는다. 벗어나야 하면 커밋 전에 이 문서를 먼저 갱신한다(작업 트리 수정, docs 커밋은 지시 시에만 — `WORKFLOW.md` §4).

**진행 순서 메모 (2026-10-01 결정)**: Kaddie(`products/kaddie`)와 병행할 때 **기술 스파이크(Phase S)는 먼저·병행 진행**하고, **디자인 작업은 Kaddie의 디자인 스프린트가 자리 잡은 뒤로 미룬다**(사용자의 디자인 결정이 두 프로젝트에서 겹치지 않게). 따라서 아래 Phase 0의 `chore(design-system): 확정 토큰 이식`은 **Phase DS 완료 전에는 착수하지 않는다**(나머지 Phase 0 항목과 Phase 1~2의 비UI 작업은 진행 가능, UI 화면 구현은 토큰 확정 후).

체크박스는 진행 표시. 완료한 항목은 `- [x]`. 항목 끝의 `[G-xx]`는 그 커밋(또는 직후 test 커밋)이 함께 만족해야 하는 비용 게이트.

---

## Phase S — 스택 검증 스파이크 (`spike/*` 브랜치, main 미머지)

`ARCHITECTURE.md` §9. 결과는 `PROGRESS.md`에 기록하고 통과 시 문서를 "확정"으로 갱신. 이 Phase는 main 히스토리에 남지 않는다.

- [x] S-1 OpenNext(CF Workers) + Prisma(pg, Hyperdrive) 왕복, DB 공급자 결정
- [x] S-2 Auth.js 카카오·Google 로그인·세션 (Workers)
- [x] S-3 R2 업로드 크기 강제 방식 결정
- [x] S-4 Worker 번들 크기·요금제 확인
- [x] S-5 FCM HTTP v1 발송
- [x] S-6 레이트 리밋 방식 결정
- [x] S-7 클라이언트 PDF(한글 폰트) 가능성
- [x] S-8 클라우드 세션 외부 호스트 도달성·`CLOUD_SESSION.md` V-1~V-5 검증

## Phase DS — 봄별 디자인 스프린트 (Kaddie 디자인이 자리 잡은 뒤, 코드 UI 전)

- [ ] 레퍼런스 1차 자료 정독(`design-research` §7) → `DESIGN.md` 화면 규칙화
- [ ] 로고 확정(Q-LOGO: 기존 SVG 재제작 여부)과 손글씨 폰트 확정(Q-FONT, 라이선스 확인)
- [ ] 오늘·이야기·우리 3탭, 어르신 온보딩의 **정적 HTML 목업 2~3안** → 스크린샷으로 사용자 확인·선택
- [ ] 토큰 확정(색·서체·간격·모션 곡선), 대비 검증 테스트표

## Phase 0 — 부트스트랩 (스파이크 통과 후)

> 2026-10-01 진행(브랜치 `claude/cloud-session-phase-0-72a2lc`). 순서 조정: i18n 하드코딩 검사 테스트가 Vitest를 전제하므로 `chore(testing)`을 `chore(i18n)` 앞으로 옮겼고, Phase 0에 `chore(ci)`를 추가했다(Supabase 마이그레이션은 CI 전용, `CLOUD_SESSION.md` §2.1).

- [x] `chore(repo): Next.js(App Router) + TypeScript 프로젝트 초기화` — Next 16.3.8, `node_modules/next/dist/docs/` 확인. main에 `AGENTS.md`(Next 관리 블록)만 두고 루트 `CLAUDE.md`는 docs 링크 유지
- [x] `chore(tooling): ESLint/Prettier 설정`
- [x] `chore(tooling): Tailwind CSS 및 shadcn/ui(Radix) 초기화` — Tailwind 4.3, shadcn 4.21(radix-nova). shadcn 기본 팔레트·폰트·예제 버튼은 넣지 않음(토큰은 Phase DS 이후)
- [ ] `chore(design-system): DESIGN.md 확정 토큰 이식` — **Phase DS 완료 후에만 착수**. 색·간격·모션 곡선 이름 정의, 대비 검증 단위 테스트, 손글씨 폰트는 확정 시에만
- [x] `chore(infra): Cloudflare Workers(OpenNext) 배포 구성` — wrangler 최상위=로컬, `env.staging`(bombyeol-staging)·`env.production`(bombyeol). 번들 3.9 MiB(빈 앱). **실제 배포·Hyperdrive 생성은 사용자 승인 대기**, R2 바인딩은 Phase 2(버킷 생성과 함께)
- [x] `chore(prisma): Prisma 초기화 및 서버리스 Postgres 연결` — 요청 단위 클라이언트, 로컬 Hyperdrive `localConnectionString`, docker-compose `postgres:17.11`, 로컬 DB 가드 스크립트
- [x] `chore(testing): Vitest 설정` (로컬 Postgres 통합 테스트 가드) — Vitest 5, workerd용 Prisma 클라이언트를 Node에서 쓰도록 `.wasm?module` 로더 플러그인
- [x] `chore(i18n): next-intl 구조 및 문구 파일 초기화(ko)` — 하드코딩 검사 테스트 포함
- [x] `chore(env): .env.example 작성 및 로컬 .env 시크릿 생성` — `ENV_MANIFEST.md`의 Phase 0~1 항목만
- [x] `chore(ci): 검사 CI 및 스테이징 DB 마이그레이션 워크플로 구성` — 검사(포맷·린트·타입·테스트·OpenNext 빌드) + `prisma migrate deploy`(시크릿 `STAGING_DATABASE_URL` 대기)

## Phase 1 — 인증·Space·초대 (모든 기능의 전제)

- [x] `chore(prisma): User/Space/Member/Invite 스키마 및 초기 마이그레이션` — Account·InviteCodeAttempt·RateCounter 포함, **Child도 여기서 정의**(아이 등록이 Phase 1이라 Phase 3에서 이동)
- [x] `chore(trpc): tRPC 초기화 및 Route Handler 연동` — superjson, 배포 스모크용 `health`
- [x] `feat(auth): Auth.js 카카오 로그인 구현` — 비즈 앱·이메일 동의 여부 결정 반영(S-2)
- [x] `feat(auth): Google 로그인 연동`
- [x] `feat(trpc): 로그인·Space 멤버십·역할 기반 프로시저 구현` (`protectedProcedure`/`spaceProcedure`/역할 검사)
- [x] `feat(space): 가족 Space 생성 및 아이 프로필 등록 구현` [G-11: 사용자당 Space·Space당 멤버 상한]
- [x] `feat(space): 초대코드·링크 발급과 TTL 처리 구현`
- [x] `feat(space): 초대 수락 트랜잭션 및 brute-force 방지 구현` [G-07, G-11: InviteCodeAttempt]
- [x] `test(space): 가족 생성·초대·역할 통합 테스트`
- [ ] `feat(onboarding): 로그인·가족 만들기·초대 합류 화면 구현` — **Phase DS 토큰 확정 후**(서버 API는 준비됨) — 어르신 온보딩 경로 포함
- [ ] `feat(onboarding): 온보딩 완료 후 홈 라우팅 구현`

## Phase 2 — 미디어 파이프라인 (비용·보안 핵심, 여기서 게이트를 먼저 만든다)

- [ ] `chore(prisma): MediaAsset·UsageCounter 스키마 정의`
- [ ] `feat(media): 업로드 요청·서명 발급 구현` [G-01, G-03, G-04]
- [ ] `feat(media): 업로드 확인(confirm) 및 자산 소유·크기 검증 구현` [G-02]
- [ ] `feat(media): 자산 삭제 시 R2 객체 삭제 구현` [G-05]
- [ ] `chore(infra): pending 접두사 R2 수명주기 규칙 및 Cron 정리 작업` [G-05, G-15]
- [ ] `feat(media): Space 사용량 집계 및 한도 판정(plan.ts) 구현` [G-03, G-15]
- [ ] `test(media): 크기 초과·타 Space 자산·pending 참조·한도 경계 테스트` [G-01~05]

## Phase 3 — 오늘(봄)

- [ ] `chore(prisma): Pet·Moment·Milestone 스키마 정의`(Child는 Phase 1에서 정의) — Moment·Milestone은 child/pet 중 하나만 참조(체크 제약)
- [ ] `feat(child): 아이 프로필 관리(태명→출생 전환 포함) 구현`
- [ ] `feat(pet): 반려동물 프로필 관리(입양일·생일 추정·종) 구현` [G-11: 아이·반려동물 수 상한]
- [ ] `feat(moment): 사진·영상 피드 구현(아이·반려동물·가족 전체 대상, 썸네일 클라이언트 생성)` [G-01~04 재사용]
- [ ] `feat(milestone): 마일스톤 기록 구현(아이·반려동물 프리셋)`
- [ ] `feat(moment): 부모 일기 구현`
- [ ] `chore(prisma): Reaction 스키마 정의`
- [ ] `feat(reaction): 좋아요·댓글 구현` [G-07]
- [ ] `feat(today): 오늘 탭 화면 구성`

## Phase 4 — 이야기(별)

- [ ] `chore(prisma): StoryPrompt·StoryEntry·MemorialProfile 스키마 정의`
- [ ] `feat(story): 질문 카드 콘텐츠 시드 및 조회 구현`
- [ ] `feat(story): 텍스트 답변 작성 및 가족 대필(작성자·대필자 병기) 구현` [G-07]
- [ ] `feat(story): 사진에 얽힌 이야기 구현` [G-01~04]
- [ ] `feat(story): 부모의 질문 보내기(물어보기) 구현`
- [ ] `feat(story): 세대 교차 반응(별 하나·댓글) 구현`
- [ ] `feat(memorial): 기념 상태 전환(사람·반려동물)과 영구 보존 정책 구현` — 구독 만료와 무관 보존, `PRIVACY_AND_LEGAL.md` §5
- [ ] `feat(story): 이야기 탭 화면 구성`

## Phase 5 — 우리·임신 기록

- [ ] `chore(prisma): FamilyEvent·PregnancyRecord·Consent 스키마 정의`
- [ ] `feat(consent): 동의 기록 및 임신 정보 별도 동의 구현`
- [ ] `feat(pregnancy): 임신 기록(주차 계산·초음파·메모) 및 visibility 서버 강제 구현` [PRIVACY §3]
- [ ] `test(pregnancy): parents_only 비노출 통합 테스트`
- [ ] `feat(calendar): 가족 캘린더 CRUD 구현(UTC 저장·로컬 표시)`
- [ ] `feat(family): 멤버·역할·관계 표시명 관리 구현`
- [ ] `feat(family): 다음 가족 모임 D-day 및 생일·입양기념일 카드 구현`
- [ ] `feat(us): 우리 탭 화면 구성`

## Phase 6 — 알림

- [ ] `chore(prisma): PushToken 스키마 정의`
- [ ] `feat(push): FCM 웹푸시 발송 유틸 구현` — 수신자 멤버십 재확인, 민감 문구 금지 [PRIVACY §3]
- [ ] `feat(push): 새 사진·이야기·반응·질문 알림 연결`
- [ ] `feat(share): 카카오톡 공유하기 기반 초대·물어보기·소식 전달 구현`
- [ ] `feat(pwa): PWA 매니페스트·설치 안내(iOS 푸시 조건 안내)`

## Phase 7 — 삭제·개인정보

- [ ] `chore(prisma): DeletionRequest 스키마 정의`
- [ ] `feat(privacy): 계정 삭제 구현(R2·DB·푸시 토큰 연쇄)` [G-06]
- [ ] `feat(privacy): Space 삭제(유예 기간·내보내기 후 파기) 구현` [G-06]
- [ ] `feat(privacy): 웹 계정·데이터 삭제 페이지 구현` [G-06]
- [ ] `feat(privacy): 데이터 내보내기(원본 ZIP·이야기 텍스트) 구현`
- [ ] `test(privacy): 삭제 후 잔존 데이터 0 및 구독 해지 호출 검증` [G-06]

## Phase 8 — 수익화 (선행 조건: `OPEN_QUESTIONS.md` Q-PAY 결정)

- [ ] `chore(prisma): Subscription 스키마 정의(spaceId 키 upsert)` [G-09]
- [ ] `feat(billing): 결제 공급자 Checkout 시작(진행 중 세션 재사용·멱등성) 구현` [G-07, G-09]
- [ ] `feat(billing): 웹훅 서명 검증·구독 동기화 구현(재구독·이중 결제 대응)` [G-09]
- [ ] `test(billing): 해지→재구독·동시 Checkout·웹훅 재전송 테스트` [G-09]
- [ ] `feat(billing): 프리미엄 게이팅 및 사용량 표시·한도 안내 구현` — 만료 후에도 기억 보존·열람
- [ ] `feat(story): 이야기 PDF 내보내기(클라이언트 생성) 구현` [G-13]

## Phase 9 — 릴리스 준비

- [ ] `test(e2e): 핵심 플로우 e2e(가족 생성→초대→사진→이야기→삭제)` (로컬 DB 전용 가드)
- [ ] `test(a11y): 토큰 대비·터치 타깃·글자 크기 검증`
- [ ] `chore(infra): 프로덕션 환경·도메인·시크릿 구성 점검`
- [ ] 운영 체크리스트(`COST_GUARDS.md` §4) 사용자 확인
- [ ] 이용약관·처리방침·전문가 검토(`PRIVACY_AND_LEGAL.md` §6)

## Phase 10 — Android (Capacitor, 후속)

- [ ] 스토어 결제 정책 재검토(웹 결제 vs 인앱 결제) — 착수 전 사용자 확인
- [ ] Capacitor 셸(`server.url` 원격 로드), 푸시(FCM), 계정 삭제 요건 재확인
- [ ] (선택) 홈 화면 위젯

## Phase D — 디자인 폴리시 (상시 개방, 완료 선언 금지)

동작 먼저·폴리시 나중. 체크리스트를 다 채워도 완료라고 보고하거나 종료 표시를 하지 않는다. 이 Phase의 작업 보고 시 dev 서버를 끄지 않고 켜둔다.

- [ ] `refine(...)` 화면별: 오늘 / 이야기 / 우리 / 온보딩(어르신) / 시트
- [ ] 로고·아이콘 확정(`OPEN_QUESTIONS.md` Q-LOGO) 및 파생 에셋 재생성
- [ ] 손글씨 폰트 확정(Q-FONT) 후 적용
- [ ] 목업은 스크린샷으로 먼저 사용자 확인 후 구현
