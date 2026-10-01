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

- [x] `chore(prisma): MediaAsset·UsageCounter 스키마 정의`
- [x] `feat(media): 업로드 요청·서명 발급 구현` [G-01, G-03, G-04] — 저장소 인터페이스(R2 S3 API·aws4fetch / 테스트용 메모리)
- [x] `feat(media): 업로드 확인(confirm) 및 자산 소유·크기 검증 구현` [G-02] — `requireConfirmedAssets`(이후 기능의 참조 검증)
- [x] `feat(media): 자산 삭제 시 R2 객체 삭제 구현` [G-05]
- [x] `chore(infra): pending 접두사 R2 수명주기 규칙 및 Cron 정리 작업` [G-05, G-15] — `worker.ts` scheduled → 내부 경로 호출(번들 중복 방지), 매시 17분
- [x] `feat(media): Space 사용량 집계 및 한도 판정(plan.ts) 구현` [G-03, G-15]
- [x] `test(media): 크기 초과·타 Space 자산·pending 참조·한도 경계 테스트` [G-01~05]
- [x] (추가) `fix(infra): Worker 환경 타입 생성에서 로컬 .env 변수 제외`, `chore(infra): 배포 스모크 내부 경로 추가`
- [x] (추가) 읽기용 서명 URL 조회 — `feat(moment)` 피드·`pet.list` 응답에 포함(Phase 3)

## Phase 3 — 오늘(봄)

> 2026-10-01 서버 설계(세션 제안 → **사용자 승인**, 수치는 `plan.ts` 결제 전 운영값):
> - **Moment**: `kind = media | diary`(PRD 초안의 photo/video/text를 대체 — 사진·영상은 첨부 종류로 구분). 첨부는 `MomentMedia`(Moment당 최대 10, 순서·클라이언트 썸네일 자산). 대상은 아이/반려동물/가족 전체 중 하나(체크 제약). 자산 하나는 한 곳에만 붙는다(unique), 붙은 자산은 `media.delete`로 지울 수 없고(`ASSET_IN_USE`) Moment 삭제 시 R2 객체와 함께 지운다(G-05).
> - **권한**: 아이 프로필·아이 대상 기록·일기는 `parent`(PRIVACY §4). 반려동물·가족 전체 대상 사진은 `parent`·`grandparent`. 반려동물 프로필 관리는 `parent`. 반응(좋아요·댓글)은 모든 멤버, 댓글 삭제는 작성자 또는 `parent`.
> - **Reaction**: 다형 targetId 대신 대상별 nullable FK(momentId·milestoneId, 이야기는 Phase 4에서 추가) + 체크 제약. 좋아요 토글은 advisory lock으로 중복 방지(부분 unique 인덱스는 Prisma 드리프트 때문에 쓰지 않음).
> - 피드 조회 응답에 읽기용 서명 URL(짧은 TTL)을 넣는다(Phase 2의 남은 항목).
> - 아이·반려동물 삭제는 Phase 7(삭제 연쇄)에서 함께 한다.

- [x] `chore(prisma): Pet·Moment·Milestone 스키마 정의`(Child는 Phase 1에서 정의) — Moment·Milestone은 child/pet 중 하나만 참조(체크 제약), `MomentMedia` 포함
- [x] `feat(child): 아이 프로필 관리(태명→출생 전환 포함) 구현`
- [x] (추가) `refactor(media): 자산 삭제 순서(R2 먼저→DB)를 공용 함수로 분리` — 반려동물 커버 교체·Moment 삭제에서 재사용
- [x] `feat(pet): 반려동물 프로필 관리(입양일·생일 추정·종) 구현` [G-11: 아이·반려동물 수 상한]
- [x] `feat(moment): 사진·영상 피드 구현(아이·반려동물·가족 전체 대상, 썸네일 클라이언트 생성)` [G-01~04 재사용, G-05 삭제 연쇄]
- [x] `feat(milestone): 마일스톤 기록 구현(아이·반려동물 프리셋)` — 나이 기반 제안, "처음" 기록은 대상당 하나, 글 기록 리밋(G-07)
- [x] `feat(moment): 부모 일기 구현` — 글 수정(작성자만) 포함
- [x] `chore(prisma): Reaction 스키마 정의`
- [x] `feat(reaction): 좋아요·댓글 구현` [G-07]
- [ ] `feat(today): 오늘 탭 화면 구성` — **Phase DS 토큰 확정 후**(서버 API는 준비됨)

## Phase 4 — 이야기(별)

> 2026-10-01 서버 설계(세션 제안 → **사용자 승인**, PR woopinbell/bombyeol#6 머지. 수치는 `plan.ts` 결제 전 운영값):
> - **질문 카드는 DB 테이블이 아니라 코드 카탈로그**(`src/lib/story-prompts.ts`, 카테고리 10·카드 27, 문구는 `messages/ko.json`의 `story.*`). DB에는 `promptKey`만 — 시드 마이그레이션·번역 동기화가 필요 없다. PRD의 `StoryPrompt` 모델과 `ageHint`는 두지 않음. 키는 바꾸거나 지우지 않는다(문구만 수정).
> - **StoryEntry**: 화자(`narratorMemberId`)·대필자(`scribeMemberId`)는 Member FK(SetNull) + 이름·관계 **스냅샷**(PRIVACY §5 `authorNameSnapshot`). 시기는 날짜 대신 `storyYear`(연 단위, 1850~올해), `title`·`category`(카드 답이면 카드 카테고리 고정), 반려동물에 붙이기(`petId`, PRD §4.2.1), 사진 한 장(`photoAssetId` unique, 이미지만).
> - **권한**: 자기 이야기 = parent·grandparent, 대필 = parent·grandparent가 **grandparent의** 이야기를. relative는 열람·반응만. 수정 = 쓴 사람 또는 화자 본인, 삭제 = 여기에 parent.
> - **물어보기(StoryAsk, 추가 모델)**: parent → grandparent, 카드 또는 직접 쓴 질문(정확히 하나, 체크 제약). 같은 카드가 열려 있으면 기존 것을 돌려줌. 답하면 `entryId`로 닫힘(동시 답은 하나만). 화자는 질문받은 어르신(가족이 받아 적기 가능). 알림은 Phase 6, 카카오톡 공유는 클라이언트 링크.
> - **반응**: `Reaction.storyEntryId` + kind `star`. **좋아요는 오늘 기록(Moment·Milestone), 별 하나는 이야기에만**(토글, 사용자·대상당 하나). 댓글은 모든 대상. 이름·동작 최종안은 DESIGN 시안 단계(PRD §2).
> - **리밋·상한(초안)**: 이야기 쓰기 100/일, 물어보기 30/일, 별 하나 300/시간(G-07), 어르신당 열린 물어보기 30, 본문 5000자·제목 60자·질문 200자.
> - **기념(MemorialProfile)**: 행이 있으면 기념 상태(지우면 되돌림), 멤버·반려동물 중 하나(멤버가 사라지면 스냅샷만 남도록 체크 제약은 "최대 하나"). 전환·수정·되돌리기 parent만, 자기 자신은 불가.

- [x] `chore(prisma): StoryEntry·StoryAsk·MemorialProfile 스키마 정의` — StoryPrompt는 코드 카탈로그(위 메모), Reaction에 storyEntryId·star 추가
- [x] `feat(story): 질문 카드 콘텐츠 시드 및 조회 구현` — 코드 카탈로그 + `story.prompts`(어르신별 답한 카드 표시)
- [x] `feat(story): 텍스트 답변 작성 및 가족 대필(작성자·대필자 병기) 구현` [G-07]
- [x] `feat(story): 사진에 얽힌 이야기 구현` [G-01~04]
- [x] `feat(story): 부모의 질문 보내기(물어보기) 구현`
- [x] `feat(story): 세대 교차 반응(별 하나·댓글) 구현`
- [x] `feat(memorial): 기념 상태 전환(사람·반려동물)과 영구 보존 정책 구현` — 구독 만료와 무관 보존, `PRIVACY_AND_LEGAL.md` §5. 기념인 분: 새 이야기·대필·물어보기 불가, 기존 이야기 수정·삭제 불가(되돌린 뒤 가능), 열린 물어보기는 거둠, 반응 허용. 반려동물: 마일스톤 불가·추억 사진 허용, `Pet.status/passedAt` 동기화. 기일은 조회 시점 계산(`today`는 클라이언트 현지 날짜)
- [ ] `feat(story): 이야기 탭 화면 구성` — **Phase DS 토큰 확정 후**(서버 API는 준비됨)

## Phase 5 — 우리·임신 기록

> 2026-10-01 서버 설계(세션 제안 → ①~⑤ **사용자 승인**, PR woopinbell/bombyeol#7 머지. 수치는 `plan.ts` 초안):
> - **동의(Consent)**: 추가 전용 기록 `Consent(userId, spaceId?, kind, version, grantedAt, withdrawnAt?)`. kind = `terms`·`privacy`(사용자 단위, spaceId 없음) / `child_data`(법정대리인 동의)·`pregnancy`(Space 단위). 현재 문구 버전은 코드 카탈로그 `src/lib/consents.ts` 한 곳 — 버전이 바뀌면 옛 동의는 "유효하지 않음"이 되어 다시 받는다. 유효 = 철회 안 됨 + 현재 버전. 같은 동의를 다시 누르면 기존 행을 돌려준다(advisory lock).
> - **서버 강제 범위(이번)**: **임신 동의만 강제** — 임신 기록 쓰기·고치기는 쓰는 사람의 유효한 `pregnancy` 동의가 있어야 한다(`CONSENT_REQUIRED`). 동의는 parent만 할 수 있다(임신 기록을 쓰는 사람). `terms`·`privacy`·`child_data`는 이번엔 **기록·조회(`consent.status`로 빠진 동의 목록)만** 하고, 로그인 후 모든 API를 막는 게이트는 온보딩 화면 커밋(Phase 1 `feat(onboarding)`)에서 함께 건다(지금 걸면 화면 없이 모든 API가 막힌다). → **확인 요청 ①**
> - **철회**: 이번엔 `pregnancy`만 철회 가능(약관·처리방침 철회 = 계정 삭제는 Phase 7, 아이 정보 철회 = 아이 삭제도 Phase 7). 철회 시 옵션 `deleteRecords`: 참이면 그 Space에서 **내가 쓴** 임신 기록과 초음파 파일을 지운다(R2 먼저, G-05). 거짓이면 기록은 남기되 **내가 쓴 기록을 전부 `parents_only`로 되돌린다**(동의를 거뒀으니 가족 공개도 거둔다 — 보수적). 철회 후에는 새 기록·수정 불가. → **확인 요청 ②**
> - **PregnancyRecord**: `(spaceId, childId, kind, date @db.Date, note?, photoAssetId? UNIQUE, visibility, createdById)`. kind = `ultrasound`(초음파 — 사진 한 장 필수, 이미지만) / `checkup`(검진 — 미래 날짜 허용, 예정일+60일까지) / `kick`(태동) / `note`(메모). **주차는 저장하지 않고 조회 시점에 아이의 현재 출생 예정일로 계산**(`gestationalAge` — 280일 기준 주·일. 예정일이 바뀌어도 맞게, PRD 초안의 `weekAt` 필드 대신). 예정일이 없으면 주차 없음. 대상 아이는 `expecting`이거나, `born`이면 날짜가 생일 이전인 기록만(출생 후 소급 정리). 출생 후에도 기록은 유지(PRD §4.2).
> - **visibility 서버 강제(PRIVACY §3)**: 기본 `parents_only`. 조회(list·get)는 parent가 아니면 쿼리 조건에 `visibility = family`를 넣는다(클라이언트 필터 금지). 숨은 기록을 id로 찾으면 `NOT_FOUND`(존재를 드러내지 않음). 숨은 기록 수·요약도 내보내지 않는다. 초음파 파일 읽기 URL은 임신 기록 응답에서만 나가고, 자산은 다른 곳에 붙일 수 없게 `unattachedAssetWhere`에 임신 사진을 더한다(id를 알아도 Moment에 붙여 우회 공개 불가). 역할이 바뀌거나 멤버에서 빠지면 다음 요청부터 바로 반영(매 요청 멤버십·역할 검사).
> - **임신 기록 권한**: 쓰기 = parent(동의 필요). 고치기(내용·visibility) = 쓴 사람만(가족 공개는 쓴 사람의 결정). 단 다른 parent도 **`parents_only`로 좁히기**는 할 수 있다(안전 방향). 지우기 = 쓴 사람 또는 parent. grandparent·relative는 `family` 기록 열람만, **반응(좋아요·댓글)은 붙이지 않는다**(노출면 최소화). → **확인 요청 ③**
> - **아이 프로필(태명·예정일)은 지금처럼 가족 전체에 보인다** — 숨기는 대상은 임신 기록(검진·초음파·메모)만. 캘린더 자동 카드에 출생 예정일은 넣지 않는다. → **확인 요청 ④**
> - **가족 캘린더(FamilyEvent)**: `(title, kind(gathering|birthday|anniversary|other), startsAt, endsAt?, allDay, recurrence(none|yearly), note?)`. 시각 있는 일정은 UTC 순간으로 저장하고 클라이언트가 현지 시각으로 보여준다. **종일 일정은 날짜만 의미가 있으므로 그 날의 UTC 자정으로 저장하고 시간대 변환 없이 날짜로 보여준다**. `calendar.list(from, to)`는 범위(최대 400일) 안의 일정과 매년 반복 일정의 그 해 회차를 펼쳐 돌려준다(조회 시점 계산, 정시 push 없음). 쓰기 = parent·grandparent(relative는 열람만 — Phase 3 원칙), 고치기·지우기 = 만든 사람 또는 parent. 리밋: 일정 쓰기 100/일(G-07), Space당 일정 500(G-11), 제목 40자·메모 500자.
> - **멤버 관리**: 관계 표시명은 본인 또는 parent가 고친다. 역할 변경·내보내기는 parent만, **자기 자신과 Space를 만든 사람은 대상이 아니다**(마지막 관리자 소실·관리자끼리 서로 내보내기 방지). 역할 변경은 요금제 역할별 인원 상한(G-11, `MEMBER_ROLE_LIMIT`)을 다시 검사(advisory lock). 기념 상태인 분은 역할 변경·내보내기 불가(되돌린 뒤). 스스로 나가기(`leave`)는 만든 사람만 불가(Space 삭제는 Phase 7). 멤버가 빠지면 이야기는 스냅샷으로 남고 받은 물어보기는 사라진다(기존 FK 규칙). → **확인 요청 ⑤**
> - **우리 탭 카드(`family.upcoming`)**: 다음 가족 모임 D-day(가장 가까운 `gathering`, 반복 포함)와 앞으로 N일(초안 30일) 안의 생일(태어난 아이·멤버 없음 — 사람 생일은 사용자가 캘린더에 `birthday`로 등록)·반려동물 생일·입양기념일·직접 등록한 기념일. 모두 조회 시점 계산, `today`는 클라이언트 현지 날짜(Phase 4 기일과 같은 방식). 기일 계산 함수는 `src/lib/anniversary.ts`로 옮겨 기일·생일이 함께 쓴다.

- [x] `chore(prisma): FamilyEvent·PregnancyRecord·Consent 스키마 정의` — 체크 제약 4개(동의 범위, 초음파↔사진, 메모 글 필수, 일정 끝≥시작)
- [x] `feat(consent): 동의 기록 및 임신 정보 별도 동의 구현` — `consent.status`·`grantAccount`·`grantSpace`·`withdraw`, 버전 카탈로그 `src/lib/consents.ts`
- [x] `feat(pregnancy): 임신 기록(주차 계산·초음파·메모) 및 visibility 서버 강제 구현` [PRIVACY §3] — 철회 시 내 기록 삭제/공개 거두기 포함
- [x] `test(pregnancy): parents_only 비노출 통합 테스트` — 필터를 빼면 8건 중 6건 실패하는 것 확인(뮤테이션 점검)
- [x] (추가, 순서 앞당김) `refactor(memorial): 기일 계산을 공용 기념일 계산으로 분리` — `src/lib/anniversary.ts`(캘린더 반복 회차도 사용)
- [x] `feat(calendar): 가족 캘린더 CRUD 구현(UTC 저장·로컬 표시)` [G-07, G-11]
- [x] `feat(family): 멤버·역할·관계 표시명 관리 구현` [G-11]
- [x] `feat(family): 다음 가족 모임 D-day 및 생일·입양기념일 카드 구현` — 기념 상태 반려동물은 생일·입양 카드 대신 기일 카드
- [ ] `feat(us): 우리 탭 화면 구성` — **Phase DS 토큰 확정 후**

## Phase 6 — 알림

> 2026-10-01 서버 설계(세션 제안 → ①~⑤ **사용자 승인**, PR woopinbell/bombyeol#8 머지. 수치는 `plan.ts` 초안):
> - **PushToken**: `(userId, token UNIQUE, createdAt, lastSeenAt)`. 기기(브라우저)마다 하나, 사용자 삭제 시 cascade(Phase 7 연쇄의 일부). `push.register`는 같은 토큰이 다른 계정에 있으면 **지금 로그인한 계정으로 옮긴다**(기기를 넘겨받은 사람이 앞 사람의 알림을 받지 않게). 사용자당 토큰 10개(넘으면 가장 오래 안 쓴 것부터 지움, G-11), 등록 30/일(G-07). `push.unregister`는 내 토큰만. 60일 동안 갱신 없는 토큰은 Cron이 지운다(G-17).
> - **발송 = 요청 응답 뒤(`waitUntil`)**: 기록 저장이 성공한 다음 이벤트(`{type, spaceId, 대상 id, 보낸 사람}`)만 넘기고, 발송 시점에 DB에서 **다시** 확인한다 — 대상이 아직 있는지, 수신자가 아직 그 Space 멤버인지(삭제된 Space·탈퇴·내보내기 제외), 기념 상태 멤버가 아닌지, 보낸 사람 본인이 아닌지. **임신 기록은 발송 시점의 visibility로** 수신자를 정한다(`parents_only`면 다른 parent만, `family`면 모든 멤버). 알림 실패는 기록 저장 결과에 영향을 주지 않는다(로그만, 토큰·본문 없이 개수만 — PRIVACY §2.7).
> - **문구(PRIVACY §3)**: 제목은 앱 이름, 본문은 종류별 고정 문구만 — 이름·관계·아이 이름·본문·카드 질문·임신 관련 단어를 넣지 않는다. 임신 기록은 "새 소식이 있어요". 문구는 `messages/ko.json` `push.*`(사용자 locale, 지금은 ko만). 데이터 페이로드는 종류·id·링크만(본문 없음). → **확인 요청 ①**(문구 안)
> - **수신자**: 새 사진·일기(Moment) → 보낸 사람 뺀 모든 멤버. 이야기 → 모든 멤버(대필이면 화자 어르신도 받음). 물어보기 → 질문받은 어르신만(아직 열려 있을 때). 반응(좋아요·별 하나·댓글) → 대상 기록을 쓴 사람(이야기는 화자 + 대필자). 임신 기록 → 위 visibility 규칙. **마일스톤은 알리지 않는다**(키·몸무게 기록이 잦아 소음 — 사진 기록과 함께 보임). → **확인 요청 ②**
> - **소음·비용 상한**: 좋아요·별 하나는 켤 때만, 같은 대상·종류는 6시간에 한 번(누가 눌렀는지 상관없이), 댓글은 같은 대상에 30분에 한 번. 수신자 한 명당 시간당 20건. 이벤트 하나의 발송은 수신자당 최근 기기 3개·전체 40건까지(Workers 무료 플랜 하위 요청 50개 안 — 토큰 교환 1회 포함). 실패 재시도는 하지 않는다(최선 노력). FCM이 `UNREGISTERED`·`INVALID_ARGUMENT`·`SENDER_ID_MISMATCH`로 답한 토큰은 지운다. → **확인 요청 ③**
> - **FCM 발송**: `firebase-admin` 없이 HTTP v1 + 서비스 계정 JWT(RS256, WebCrypto) — S-5 코드 계승, 액세스 토큰은 isolate 안에서 만료 1분 전까지 재사용. `FIREBASE_ADMIN_*` 3종이 없는 환경은 발송을 건너뛴다(기능은 그대로 동작). 링크는 요청 출처 기준 절대 URL(`/open/{종류}/{id}` — 화면 라우트는 UI 커밋에서).
> - **남김(이번 범위 밖)**: 알림 끄기·Space별 음소거 설정(설정 시트 UI와 함께 — 지금은 토큰 해제가 끄기), 임신 기록을 나중에 가족 공개로 바꿀 때의 알림(보내지 않음), 정시 알림(캘린더는 조회 시점 계산 원칙 유지), 서비스 워커·토큰 발급 클라이언트(UI). → **확인 요청 ④**(알림 설정을 UI 때로 미루기)
> - **카카오톡 공유(`feat(share)`)·PWA 매니페스트**는 클라이언트 SDK·아이콘(Q-LOGO 미확정)에 기대므로 UI 단계로 미룬다. 서버 쪽은 공유 링크가 로그인 후 딥링크(`/open/...`)로 열리게 같은 링크 규칙을 쓴다. → **확인 요청 ⑤**

- [x] `chore(prisma): PushToken 스키마 정의`
- [x] (추가) `feat(push): 푸시 토큰 등록·해제 및 오래된 토큰 정리 구현` [G-07, G-11, G-17]
- [x] `feat(push): FCM 웹푸시 발송 유틸 구현` — 수신자 멤버십 재확인, 민감 문구 금지 [PRIVACY §3]
- [x] `feat(push): 새 사진·이야기·반응·질문 알림 연결` — 임신 기록은 발송 시점 visibility(필터를 빼면 3건 실패 확인)
- [ ] `feat(share): 카카오톡 공유하기 기반 초대·물어보기·소식 전달 구현` — **UI 단계**(메모 ⑤)
- [ ] `feat(pwa): PWA 매니페스트·설치 안내(iOS 푸시 조건 안내)` — **UI 단계**, 서비스 워커·토큰 발급 클라이언트 포함

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
