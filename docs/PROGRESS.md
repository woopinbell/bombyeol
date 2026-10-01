# Bombyeol — 진행 상황 (세션 인수인계 로그)

새 세션은 `CLAUDE.md` 다음으로 이 파일을 읽는다. 세션을 끝내거나 옮기기 전 Claude가 갱신하고 `docs` 브랜치에 커밋·푸시한다(자율, `WORKFLOW.md` §4).

## 현재 상태 (2026-10-01)

- 단계(2026-10-01, Phase 2): **Phase 2 미디어 서버 커밋 완료, 스테이징 배포, R2 토큰 대기** — 아래 "현재 상태 — Phase 2".
- (이전) 단계(2026-10-01, Phase 1): **Phase 1 서버 커밋 완료(온보딩 UI 제외), 스테이징 배포됨** — 아래 "현재 상태 — Phase 1".
- (이전) 단계(2026-10-01, Phase 0 세션): **Phase 0 코드 커밋 완료(디자인 토큰 이식 제외)** — 작업 브랜치 `claude/cloud-session-phase-0-72a2lc`에 9커밋 푸시, **main 머지 완료(PR woopinbell/bombyeol#2, 머지 커밋 06591ce)**. 스테이징 배포·Hyperdrive 생성·CI 마이그레이션 시크릿은 사용자 승인/등록 대기(아래 "다음 할 일").
- (이전) 단계(2026-10-01 갱신): **스택 확정 — 스파이크 S-1~S-8 전부 통과, ARCHITECTURE 확정(사용자 승인). 다음은 Phase 0.** 스파이크 Cloudflare 리소스(Worker·Hyperdrive·R2 버킷)는 삭제 완료. main은 여전히 초기 커밋뿐.
- (이전 기록) 기반 문서 작성 완료, 리포 부트스트랩 완료(2026-10-01). GitHub private 리포 `woopinbell/bombyeol` 생성, `main`(빈 초기 커밋 9744db2)·`docs`(고아, 8621748) 푸시 완료. 클라우드 환경은 사용자가 claude.ai/code에서 만든다(허용 도메인 Custom, 개발용 키만). 첫 세션 프롬프트는 `docs/CLOUD_SESSION.md` §4.
- 결정 완료(사용자): 식별자 `bombyeol` / 서버리스 재선정 / 웹·PWA 우선 후 Android / 새 GitHub private 리포 + `docs` 고아 브랜치 / 비용 방어는 설계 제약 / 개인정보 초기 설계 / 텍스트 우선·음성 후속 / 가족 1 Space 안에 여러 아이 / 카카오+Google 로그인 / Cloudflare 검토 / next-intl(한국어만 출시) / 임신 기록·고인 처리 V1 포함 / PDF 다운로드 프리미엄 / 웹푸시 + 카카오톡 공유 / devlog는 docs 브랜치에만 / hamkke 절대 원칙 4종 계승.
- 미해결: `OPEN_QUESTIONS.md` (특히 **Q-PAY 결제 공급자 재결정**).

## 현재 상태 — Phase 2 (2026-10-01)

- Phase 2 서버 커밋 완료(작업 브랜치 `claude/cloud-session-phase-0-72a2lc`, main 미머지, PR 미생성). 테스트 93건 통과. 스테이징 배포됨(번들 13.3 MiB, Startup 19ms, Cron `17 * * * *`), 스테이징 DB에 `media` 마이그레이션 적용(작업 브랜치 기준 수동 실행).
- 스테이징 R2(사용자 승인): 버킷 `bombyeol-staging-media`(APAC), 수명주기 `pending/` 1일 만료, CORS(스테이징·localhost 출처의 PUT·content-type만). 재현 스크립트 `scripts/r2-bucket-setup.sh`. **사고(즉시 복구)**: 처음에 수명주기 접두사를 `spaces/`로 걸어 "모든 객체 1일 삭제" 규칙이 됐다 — 버킷이 비어 있을 때 바로 지우고 `pending/`으로 다시 걸었다. 그래서 업로드 키를 `pending/{spaceId}/{id}` → 확정 시 `spaces/{spaceId}/{id}`(S3 CopyObject)로 바꿨다(ARCHITECTURE §5 갱신).
- 설계 요약: 저장소는 S3 API 하나(aws4fetch)로 presign PUT(길이·타입 서명)·Head·Copy·Delete·presign GET. 판정은 confirmed + 진행 중(pendingTtl 1h 안) 합계(G-03), 미확정 20개·발급 120/h·500/일(G-04), 확정은 올린 사람만·Head로 크기·타입 일치(G-02), 삭제는 R2 먼저 → DB(G-05), Cron은 버려진 업로드·오래된 카운터 정리와 급증 경고(G-05·G-15·G-17). 수치는 `plan.ts` 초안.
- 내부 경로(`/api/internal/cleanup`·`/smoke`)는 AUTH_SECRET에서 용도별 HMAC 토큰을 유도해 인증(없으면 404). 스모크: `node scripts/smoke-staging.mjs`(AUTH_SECRET 필요) — 현재 db ok, **R2는 토큰 대기로 실패**.
- R2_ACCOUNT_ID는 리포에 넣지 않고 Worker Secret으로 등록(클라우드 환경 값을 stdin으로).

### 다음 할 일 (Phase 2 이후)

1. **(사용자) R2 S3 토큰 발급·등록** → `R2_ACCESS_KEY_ID`·`R2_SECRET_ACCESS_KEY`를 Worker `bombyeol-staging`의 Secret으로(대시보드). 후 `node scripts/smoke-staging.mjs`로 putWrongSize/WrongType 403, putExact 200, head·copy·cleanup ok 확인.
2. 브라우저 직접 업로드(CORS)는 UI가 생길 때(Phase 3 이후) 사용자 기기에서 확인 — 미완료 검증.
3. Phase 2 PR·머지(사용자 확인). 이후 Phase 3(오늘: Pet·Moment·Milestone) 서버부터.

## 현재 상태 — Phase 1 (2026-10-01)

- 스테이징 생성(사용자 승인): Hyperdrive `bombyeol-staging`(id `610ad8cefd3f49268ca0a581b488d80d`, Supabase 직결) + Worker `bombyeol-staging` → https://bombyeol-staging.seungwoo7050.workers.dev . 스모크 `GET /api/trpc/health` 200(Worker → Hyperdrive → Supabase 왕복). 배포 직후 몇 초는 이전 버전이 응답할 수 있음(404를 한 번 봄).
- **Phase 1 main 머지 완료(PR woopinbell/bombyeol#3, 머지 커밋 a2a1145).** (이전 기록) Phase 1 서버 커밋 9개 완료(브랜치 `claude/cloud-session-phase-0-72a2lc` — PR woopinbell/bombyeol#2 머지 후 main에서 같은 이름으로 다시 땀). 테스트 54건 통과. **main 미머지, PR 미생성.** 온보딩 화면 2커밋은 Phase DS 이후.
- 결정·구현 요약:
  - 인증: Auth.js v5 beta.32, JWT 세션. 로그인 시 `Account(provider, providerAccountId)`로 `User`를 찾거나 만든다(`src/server/auth/users.ts`). **이메일·프로필 사진은 저장·토큰 보관하지 않음**(PRIVACY 최소 수집), 이름만 50자. 로그인 signin/callback에 IP당 30회/시간(G-07, DB 카운터).
  - 접근 통제: `protectedProcedure` → `spaceProcedure`(멤버 아니거나 삭제된 Space면 NOT_FOUND) → `parentProcedure`/`spaceRoleProcedure(...)`(FORBIDDEN).
  - 상한(`src/lib/plan.ts`, 모두 **초안**): 사용자당 Space 생성 2(쿨다운 30일 안에 삭제한 것 포함), 소속 6 / 무료 역할 정원 parent 2·grandparent 4·**relative 0**(PRD §5 초안대로 친척은 프리미엄) / 아이 3 / 활성 초대 10, TTL 72h, 발급 20회/일 / 코드 실패 사용자 5회/15분·IP 20회/시간.
  - 동시성: 개수 확인→생성은 `pg_advisory_xact_lock`(트랜잭션 범위)으로 직렬화. 드라이버 어댑터가 void 반환을 못 읽으므로 `$executeRaw` 사용.
  - 초대코드: 31자 알파벳(0/O/1/I/L 제외) 6자, 거부 샘플링. 링크도 같은 코드(`/invite/{code}`). 실패 사유는 구분하지 않음(INVITE_INVALID).
  - 에러 메시지는 사유 코드(`SPACE_CREATE_LIMIT` 등, `src/server/errors.ts`) → UI에서 문구 키로 변환 예정.

### 다음 할 일 (Phase 1 이후)

1. ~~`STAGING_DATABASE_URL` 등록~~ 완료(사용자, 2026-10-01). **Supabase Session pooler(IPv4)로 GitHub 러너 → Supabase 마이그레이션 확인.** 주의: 수동 실행(workflow_dispatch)은 기본이 main이라 main에 없는 마이그레이션은 적용되지 않는다 — 첫 실행이 그래서 "No migration found". 작업 브랜치 기준으로 다시 실행해 `init` 적용(main 머지 전 스테이징 검증용).
2. ~~redirect URI 등록~~ 완료(사용자). 스테이징 500의 실제 원인은 **OpenNext가 Turbopack의 스코프 패키지 해시 외부 이름(`@prisma/client-<hash>`)을 매핑하지 못한 것**(`No such module .../wasm-compiler-edge`, OpenNext 1.20.7 `discoverExternalModuleMappings`가 `.next/node_modules` 최상위 링크만 읽음). `next.config.ts`의 `transpilePackages: ["@prisma/client"]`로 번들 포함해 해결(`fix(infra)` 커밋). 확인: health 200, 비로그인 space.list 401, CSRF+POST 로그인 시작 → kauth/accounts.google 302(redirect_uri 정확). **사용자 브라우저 실로그인 통과(2026-10-01): Google·카카오 모두 → `user.me`로 provider 확인, `space.list` 빈 목록 200.** 카카오 콘솔 동의항목: 닉네임 필수, 프로필 사진 선택(사용자 설정) — 코드는 이름만 저장하고 사진은 저장하지 않는다(PRIVACY 최소 수집, 필요해지면 별도 결정). 이름 없이 가입한 계정은 다음 로그인 때 이름을 채운다(`fix(auth)`). 확인용 `/api/auth/session`은 userId만 보이므로 `/api/trpc/user.me`를 쓴다. 교훈: 배포 후 health만이 아니라 인증 경로도 스모크한다.
3. ~~Phase 1 PR 머지~~ 완료(a2a1145). 이후 Phase 2(미디어) — R2 버킷·토큰 신규 발급 필요(ENV_MANIFEST Phase 2), 버킷 생성은 승인 후.
4. 결정 필요(사용자, 급하지 않음): 무료 relative 0명 유지 여부, 위 상한 수치(Q-PRICE). 카카오 이메일 미수집 확정.
5. 정리 Cron(InviteCodeAttempt·RateCounter 보관 기간, G-17)은 Phase 2 Cron 커밋에서 함께.

주의(이번 세션):
- Prisma 7은 `migrate dev` 후 클라이언트를 자동 생성하지 않는다 → 스키마 변경 후 `npx prisma generate`(postinstall에도 있음).
- 인터랙티브 트랜잭션 안에서 unique 위반이 나면 트랜잭션 전체가 중단된다 → 재시도 대신 미리 조회(초대코드).

## 다음 할 일 (2026-10-01, Phase 0 세션 종료 시점)

Phase 0 코드는 `claude/cloud-session-phase-0-72a2lc`에 있다(main 미머지). 커밋: repo → tooling(ESLint/Prettier) → tooling(Tailwind·shadcn) → infra → prisma → testing → i18n → env → ci. 로컬 검증: format·lint·typecheck·Vitest 6건·`next build`·OpenNext 빌드·`wrangler dev`(로컬 Hyperdrive → Docker PG 17.11 왕복) 통과. GitHub CI(PR 또는 main push에서만 실행)는 PR woopinbell/bombyeol#2에서 첫 실행 **통과**(2026-10-01, 1분 45초, Postgres 서비스 컨테이너 포함).

사용자 결정·작업 대기:
1. ~~PR woopinbell/bombyeol#2 머지~~ 완료(2026-10-01, 머지 커밋 06591ce). Phase 1은 main에서 새로 딴 작업 브랜치로.
2. **GitHub Actions 시크릿 `STAGING_DATABASE_URL`** 등록(Supabase Session pooler IPv4 문자열, ENV_MANIFEST "Phase 0 — CI·로컬"). 등록 후 `Migrate staging DB` 워크플로 수동 실행으로 풀러 경로 확인.
3. **스테이징 리소스 생성 승인**: Hyperdrive `bombyeol-staging`(DATABASE_URL 직결로 생성) + Worker `bombyeol-staging` 배포(`npm run cf:deploy:staging`). 승인되면 Hyperdrive id를 `wrangler.jsonc`의 `env.staging.hyperdrive`에 추가하는 커밋 → 배포 스모크. URL은 `bombyeol-staging.<계정 서브도메인>.workers.dev` 예상 → 카카오·Google redirect URI 갱신 필요(Phase 1 전).
4. 원격 임시 브랜치 **`tmp-v2-pushtest` 삭제**(GitHub 웹 Branches 화면). V-2 시험용으로 기존 docs 커밋(df7b358)을 가리킬 뿐 새 커밋은 없다. 클라우드 세션의 `git push --delete`는 원격이 연결을 끊어 실패했다.
5. 다음 개발: Phase 1(`chore(prisma): User/Space/Member/Invite 스키마`부터). UI 화면 커밋은 Phase DS 이후.

Phase 0 세션에서 얻은 주의사항:
- **`prettier --write .`가 루트 링크 `docs`·`image-asset`을 따라가 docs 브랜치 파일까지 재포맷**했다(되돌림 완료). `.prettierignore`·ESLint ignore·tsconfig exclude에 `.docs/ docs CLAUDE.md image-asset`을 넣어 해결. 새 도구를 추가할 때도 링크 제외를 확인한다.
- Prisma `runtime = "workerd"` 클라이언트는 `*.wasm?module`을 import해 Node에서 그대로 안 돈다 → `vitest.config.ts`의 로더 플러그인으로 같은 클라이언트를 테스트에서 사용(별도 Node 생성기 없음).
- 클라우드 환경 `DATABASE_URL`은 Supabase이므로 로컬 작업은 항상 `npm run db:*`/`npm test`(내부적으로 `scripts/with-local-db.mjs`)로 실행한다. `npx vitest` 직접 실행 시 globalSetup이 원격 URL을 거부한다.
- `wrangler.jsonc`의 `hyperdrive`는 env 상속이 안 되는 키라 `CloudflareEnv.HYPERDRIVE`가 optional 타입 → `createPrisma()`가 없으면 명시적으로 throw.
- Docker 데몬은 세션 시작 시 꺼져 있을 수 있다 → `dockerd &` 후 `npm run db:up`.

## (이전) 다음 할 일 (2026-10-01 갱신)


**Phase 0 착수** — 새 클라우드 세션 권장(아래 "새 세션 시작 프롬프트"는 `CLOUD_SESSION.md` §4). 스파이크에서 얻은 Phase 0 반영 사항:
- 스캐폴드: `create-next-app`은 **`--disable-git`** 으로, 임시 폴더에서 만들면 `.git` 제외 복사(사고 기록 참고). 생성되는 `AGENTS.md`/`CLAUDE.md`는 리포의 CLAUDE.md 링크와 충돌하므로 처리 방침 결정(Next가 `next dev` 때 다시 만든다는 안내가 있음 — main에 `AGENTS.md`만 두고 루트 `CLAUDE.md`는 docs 링크 유지 권장).
- `prisma init`이 만드는 `.agents/ .claude/ .windsurf/ skills-lock.json`은 커밋하지 않는다. Prisma는 7.10.x 고정(`latest`가 8 RC), 생성기 `runtime = "workerd"`.
- `next.config.ts`에 `outputFileTracingExcludes`(wrangler·workerd·Prisma CLI·PGlite 등) 필수 — 없으면 53 MiB.
- 레이트 리밋은 DB 카운터 주력, 업로드는 presign(Content-Length/Type 서명) + confirm HeadObject 기본.
- Supabase 마이그레이션 CI: GitHub 호스티드 러너는 IPv6가 없어 Supabase 직결(IPv6) 불가 가능성이 높다 → **Supabase Session pooler(IPv4) 연결 문자열을 GitHub Actions secret으로** 받는 방식이 유력(Phase 0 `chore(infra)` 때 이름을 ENV_MANIFEST에 먼저 적고 요청).
- 키 재사용: 카카오·Google·Firebase 콘솔에 등록된 redirect/도메인은 삭제된 스파이크 URL(`bombyeol-spike-s1.seungwoo7050.workers.dev`) 기준 → 개발 배포 URL이 정해지면 갱신 필요. R2 S3 토큰은 삭제된 버킷 한정이라 무효 — 대시보드에서 폐기 권장, Phase 2에서 새로 발급.

### (이전) 다음 할 일

1. ~~리포 부트스트랩~~ 완료. 주의: 루트 심볼릭 링크 `docs`와 브랜치 `docs`의 이름이 겹쳐 `git log docs`가 모호 오류를 낸다 → 브랜치는 `refs/heads/docs`(또는 `.docs/`에서 `git -C .docs ...`)로 참조한다.
2. (사용자) 클라우드 환경 생성(리포 `woopinbell/bombyeol`). 스파이크 전에 필요한 키(`ENV_MANIFEST.md` Phase S)는 Claude가 세션에서 정확히 요청한다.
3. 첫 클라우드 세션: 부트스트랩 검증 V-1~V-5 → 스택 스파이크 S-1~S-8 → 결과로 `ARCHITECTURE.md` 확정 → Phase 0(토큰 이식 제외).
   **디자인은 Kaddie가 먼저**(2026-10-01 결정): 봄별은 기술 스파이크만 병행하고, Phase DS(로고·폰트·목업·토큰)는 Kaddie 디자인이 자리 잡은 뒤 진행.
4. 첫 세션에서 디자인 리서치 §7 병행.

## 부트스트랩 검증 결과 (첫 클라우드 세션, 2026-10-01 KST)

| ID | 결과 | 비고 |
|---|---|---|
| V-1 | **통과** | 클라우드 clone은 전체 refspec(`+refs/heads/*`), 얕은 clone 아님. `git fetch origin docs` 정상 |
| V-2 | **통과** | `.docs/`에서 `git push origin docs` 성공(이 PROGRESS 갱신 커밋 자체로 검증, 시험용 커밋 없음). 세션 지정 브랜치(`claude/*`) 외 이름도 푸시 가능 |
| V-3 | **해당 없음/실패로 간주** | 링크는 부트스트랩(첫 프롬프트) 이후 생기므로 세션 시작 시 CLAUDE.md 자동 로드는 안 된다. 링크·`.docs/`는 exclude 대상이라 새 clone에 없음 → 첫 프롬프트로 직접 읽게 하는 현 방식 유지(또는 setup 스크립트/SessionStart 훅, Q-HOOK) |
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
| V-5 | 해당 없음 | 이 세션에서 환경변수 변경 없음. Phase 0~1·S 키 존재 확인(값 미출력) |

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
| S-1 | **통과(쿼리 왕복)** — 원격 쓰기·마이그레이션 경로는 미결 | 2026-10-01 |
| S-2 | **통과(사용자 브라우저 실로그인 확인)** — Auth.js v5 beta 리스크 기록 | 2026-10-01 |
| S-3 | **통과(Worker 프록시·presign 둘 다)** | 2026-10-01 |
| S-4 | **재측정 완료**(전 기능 통합 12.2 MiB) — 출시 시 유료, 개발 중 무료 | 2026-10-01 |
| S-5 | **통과(사용자 Android 실기기 수신 확인)** | 2026-10-01 |
| S-6 | **통과(DB 카운터 주력 + 바인딩 보조)** | 2026-10-01 |
| S-7 | **통과** | 2026-10-01 |
| S-8 | **통과(HTTPS 전부)** — DB 직접 TCP만 불가(설계로 우회) | 2026-10-01 |

### S-1 상세 (브랜치 `spike/s1-opennext-prisma`, main 머지 금지)

- 버전: Next.js 16.3.8, `@opennextjs/cloudflare` 1.20.7, Prisma 7.10.0(`prisma-client` 생성기, `runtime = "workerd"`, `@prisma/adapter-pg`), tRPC 11.19, wrangler 4.145. 주의: npm `prisma@latest`가 8.0.0-rc를 가리켜 7.10.0으로 고정. `prisma init`이 `.agents/ .claude/ .windsurf/ skills-lock.json`(Prisma 에이전트 스킬)을 자동 생성하므로 커밋하지 않고 지운다.
- 패턴: 요청마다 `PrismaClient`(adapter-pg, `max: 1`) 생성, 연결 문자열은 `getCloudflareContext().env.HYPERDRIVE.connectionString`. 로컬은 wrangler `localConnectionString`으로 Docker Postgres.
- **로컬**: `opennextjs-cloudflare build` → `wrangler dev` → tRPC `ping`(읽기)·`write`(쓰기) 왕복 성공(Docker `postgres:17` = 17.11).
- **원격**: Hyperdrive `bombyeol-spike-s1`(id `073ee1da206c4cf984dca3e2eed8034b`)를 **Supabase 직결(IPv6) 문자열 그대로** 생성 성공 → Worker `bombyeol-spike-s1`(https://bombyeol-spike-s1.seungwoo7050.workers.dev) 배포 → `dbVersion` 200, Supabase **PostgreSQL 17.11** 확인(로컬과 동일 버전). 응답 0.4~2.3s(첫 호출 콜드).
  - 결론: Hyperdrive는 Supabase 직결 IPv6를 받는다 → **앱 런타임에는 풀러 문자열 불필요.** DB 공급자 Supabase로 S-1 기준 통과.
  - 배포된 `*.workers.dev`는 클라우드 VM에서 curl로 도달 가능 → 배포 스모크를 세션 안에서 자동 수행할 수 있다.
- **미결**: Supabase에 스키마 적용 경로(원격 `SpikePing` 테이블 없음 → `ping`은 "table does not exist" 500, 즉 DB 도달은 확인). CLOUD_SESSION §2.1대로 **CI(GitHub Actions) 마이그레이션**을 Phase 0에서 구성 — 이때 필요한 비밀값(이름·IPv4 풀러 필요 여부)은 그 시점에 ENV_MANIFEST에 먼저 적고 요청.
- **S-4 사전 신호**: 배포 출력 `Total Upload 54,672 KiB / gzip 18,092 KiB`, Startup 20ms. 빈 앱인데도 크다(Prisma·Next 서버 번들). 요금제 한도 대비 판단은 S-4에서.
- 생성한 Cloudflare 리소스(정리 대상, 스파이크 종료 후 삭제 여부 사용자 확인): Hyperdrive `bombyeol-spike-s1`, Worker `bombyeol-spike-s1`, R2 버킷 `bombyeol-spike-s3`(비어 있음). 모든 스파이크 코드는 `spike/s1-opennext-prisma` 한 브랜치에 누적.

### S-2 상세 — Auth.js 카카오·Google (같은 스파이크 브랜치)

- 키 5종 클라우드 환경 주입 확인(2026-10-01, 값 미출력): 형식 정상. 가짜 인가 코드로 토큰 엔드포인트 호출 → Google `invalid_grant`, 카카오 `KOE320`(코드 없음) = **클라이언트 자격증명 유효**(대조: 틀린 secret은 `invalid_client`/`KOE010`).
- 구현: `next-auth@5.0.0-beta.32`(v5는 2026-10 현재도 **beta** — 리스크로 기록, 대안 Better Auth 1.7.x), JWT 세션(DB 어댑터 없음), `trustHost: true`, tRPC `protectedProcedure`(`me`: 세션 + DB `now()` 왕복).
- Worker 시크릿: 환경변수 값을 stdin으로 `wrangler secret put`(출력·파일 기록 없음). 이후 키를 바꾸면 시크릿도 다시 넣어야 한다.
- 원격 확인: 비로그인 `me` → 401, `/api/auth/providers` 콜백 URL이 등록값과 일치, 로그인 시작 → kauth.kakao.com / accounts.google.com로 302(PKCE 사용, redirect_uri 정확). 번들 12.1 MiB, Startup 23ms.
- **사용자 브라우저 실로그인 확인 완료(2026-10-01)** → 보호된 tRPC `me` 호출 성공. 같은 시간대 Worker 분석: 192요청·오류 0(경로별 분해는 미제공). 카카오는 이메일 동의 없이(비즈 앱 전환 전) 로그인·식별(`sub`=카카오 ID) 가능 → 이메일 수집 여부는 Phase 1 설계에서 결정(PRIVACY 관점에서는 미수집이 유리).
- 남은 리스크: Auth.js v5가 beta. Phase 1 착수 시 버전 고정, 업그레이드는 별도 커밋. 문제가 생기면 Better Auth로 전환(카카오 지원).
- 주의: 확인 중 카카오 REST API 키(client_id, 브라우저 인가 URL에 원래 노출되는 공개값)가 세션 출력에 한 번 찍힘. secret 계열은 출력되지 않음.

### S-3 상세 — R2 업로드 크기 강제 (같은 스파이크 브랜치, 버킷 `bombyeol-spike-s3`)

- 방식: `PUT /api/spike/upload?bytes=N` → 서버가 Content-Type 화이트리스트·선언 크기 상한 검사 → 본문을 `FixedLengthStream(N)`에 통과시켜 R2 바인딩 `put` → `head`로 크기 재확인. 불일치면 삭제·400.
- 원격 결과: 정확 1000B 200 / 본문 2000B(선언 1000) 400 / 본문 500B 400 / 선언 상한 초과 413 / 금지 타입 415 / 거부 후 잔존 객체 0 / 9MB 2.6s 200.
- 차이: chunked 전송(Content-Length 없음)은 크기가 정확해도 **원격에서 거부**(로컬은 통과). 실패 쪽으로 닫히므로 안전하고, 브라우저 `fetch(File/Blob)`은 Content-Length를 보낸다. 앱은 Content-Length 필수로 명시.
- 결론: G-01은 **Worker 프록시 방식으로 충족 확인.**
- **presign 비교(2026-10-01, `spikes/s3-presign/`)**: R2 S3 키는 `bombyeol-spike-s3` 한정(ListBuckets·타 버킷 403 확인). SigV4 쿼리 서명에 `content-length`·`content-type`을 포함하면 — 정확 1000B 200 / 5000B·500B 403 `SignatureDoesNotMatch` / 다른 타입 403. **대조군(길이 미서명)은 5000B도 200** = hamkke의 구멍 재현. 브라우저는 본문으로 Content-Length를 자동 설정하므로 클라이언트 직접 업로드에도 적용 가능.
- 방식 선택(제안, Phase 2에서 확정): **presign + 서명된 Content-Length/Type + confirm 시 HeadObject 크기 재확인**을 기본으로(업로드 바이트가 Worker CPU·요청 수를 거치지 않음, 무료 플랜 친화), Worker 프록시는 대안. 어느 쪽이든 G-01·G-02 테스트로 고정.

### S-4 상세 — 번들·CPU 기준선

- 한도(공식 문서 2026-10 확인): Worker 크기 **비압축 64 MiB**(무료·유료 동일, 압축 한도 없음), 시작 시간 1s, CPU **무료 10ms/요청**, 유료 기본 30s(최대 5분). 유료 = 월 $5 최소, 1천만 요청·3천만 CPU-ms 포함.
- 최초 빌드 53.4 MiB(한도 근접) — 원인: Next 출력 추적이 next.config(`@opennextjs/cloudflare`→wrangler)·prisma.config 경유로 wrangler·workerd·Prisma CLI·PGlite까지 끌어오고 OpenNext가 모든 `.wasm`을 번들. `outputFileTracingExcludes`로 **11.5 MiB**(gzip 3.1 MiB), Startup 20ms. → Phase 0 `chore(infra)`에 이 제외 목록 포함.
- CPU(`wrangler tail` 실측): 웜 `dbVersion` 8~20ms, **콜드 isolate 200~450ms**, SSR 페이지 30~340ms. → **무료 플랜(10ms) 불가, Workers Paid 필요**(ARCHITECTURE §10 추정과 일치). 비용 예: 평균 100ms × 100만 요청 ≈ 초과 CPU $1.4 + 기본 $5.
- 계정 플랜 상태는 토큰 권한으로 조회 불가(구독 API 10000). 현재 요청은 모두 ok — 사용자 확인 필요.

### S-5 상세 — FCM 웹푸시 (같은 스파이크 브랜치)

- 키 10종 확인(값 미출력): 프로젝트 ID 일치·authDomain·appId(senderId 포함)·서비스 계정 이메일 도메인·PEM·VAPID(65바이트 P-256) 모두 정상. 서비스 계정 → OAuth 토큰 발급 200, FCM v1 `validate_only` 가짜 토큰 → `INVALID_ARGUMENT`(= API 활성·권한 정상). 주의: 환경 UI에 넣은 `FIREBASE_ADMIN_PRIVATE_KEY`는 `\n` 이스케이프가 아니라 **실제 줄바꿈**으로 들어왔다 → 코드가 두 형태 모두 처리.
- 구현: `firebase-admin` 없이 WebCrypto(RS256)로 서비스 계정 JWT 서명 → 토큰 교환(모듈 스코프 캐시) → FCM HTTP v1 fetch. 발송 API는 로그인 필수(비로그인 401). 클라이언트는 firebase 12.19.0 + `firebase-messaging-sw.js`(공개 설정은 SW 등록 URL 쿼리로 전달, 파일에 키 없음).
- 원격 진단: Worker에서 가짜 토큰 발송 → FCM 도달(`INVALID_ARGUMENT`) 확인.
- **사용자 실기기 수신 확인 완료(2026-10-01).** iPhone(홈 화면 PWA)은 Phase 6에서 확인.

### S-4 재측정 (2026-10-01, S-2·S-3·S-5 통합 후)

- 번들 12.2 MiB(gzip 3.3 MiB) / 한도 64 MiB, Startup 21ms.
- CPU(p50/최대): `dbVersion` 178/491ms, SSR `/` 102/328ms, `/api/auth/session` 9/238ms, FCM 진단 9/215ms. 모든 요청 ok(오류 0).
- 판정 유지: 출시 기준 Workers Paid 필요, 개발 중은 Free(사용자 결정). 콜드 비용(Prisma wasm·Next 초기화) 절감은 Phase 0 이후 과제.

### S-6 상세 — 레이트 리밋

- 바인딩(`ratelimits`, 5/60s): 로컬은 정확히 6번째부터 429. **원격은 매우 관대** — 고정 키로 약 35회 통과 후에야 간헐적 429. 문서상 Cloudflare 위치(PoP) 단위·10/60초 창만 지원·결과적 일관성. 또한 클라우드 VM의 송신 IP가 여러 개로 바뀐다(IAD).
- DB 카운터(`RateCounter` 고정 창 upsert, 5/3600s): 로컬 정확히 6번째부터 429. 원격은 Supabase 마이그레이션 경로 확정 후 확인.
- 결론: **정확성이 필요한 비용 게이트(G-04 발급 횟수, G-07 로그인·초대 시도, G-11 생성 수·brute-force)는 DB 카운터**, 바인딩은 앞단 폭주 완화용 보조. 이 결정을 ARCHITECTURE §1에 반영.

### S-7 상세 — 클라이언트 한글 PDF (`spikes/s7-pdf/`)

- pdf-lib + @pdf-lib/fontkit + Pretendard TTF(2.7MB), 헤드리스 Chromium.
- 100쪽·쪽당 약 900자(서로 다른 음절 다수, 서브셋 최악 근사): 서브셋 **3.2s / 0.49MB**, 비서브셋 3.6s / 1.43MB. 쪽당 사진 1장(1200×900 JPEG) + 400자: 1.5s / 5.6MB(크기는 사진이 지배).
- CPU 6배 스로틀(저사양 폰 근사): 100쪽 텍스트 22.6s → 실제 구현은 **Web Worker + 진행률 표시** 필요.
- 한글 추출 검증(pdfjs): 원문과 정확히 일치.
- 결론: 클라이언트 생성 유지(G-13). 실기기 시간은 사용자 기기에서 후속 확인(미완료 검증).

### S-8 상세 — 클라우드 세션 외부 호스트

HTTPS 응답 확인(프록시 거부 0건): api.cloudflare.com, `*.workers.dev`(배포 Worker), `<account>.r2.cloudflarestorage.com`, api.supabase.com, kauth/kapi/developers.kakao.com, accounts.google.com, oauth2/www.googleapis.com, fcm/firebase/firebaseinstallations.googleapis.com, github.com, api.github.com, registry.npmjs.org, cdn.jsdelivr.net. 결제 공급자 호스트는 Q-PAY 결정 후 추가. DB 직접 TCP는 불가(위 "Phase S 키 확인") → 배포 Worker·CI 경로로 설계.

### 사고 기록 (2026-10-01, 로컬 한정, 복구 완료)

create-next-app이 임시 폴더에서 자체 `git init`을 했고 이를 `cp -r .`로 리포 루트에 복사해 `.git/config`·`HEAD`·로컬 `main` 참조·인덱스·`info/exclude`를 덮어썼다. 원격·docs 브랜치 피해 없음. 사용자 승인 후 remote 설정·`main`(9744db2, origin/main과 일치)·HEAD·인덱스·`.gitignore`·exclude 복구, fsck 정상. 재발 방지: 스캐폴드는 `--disable-git`으로 만들거나 `.git`을 빼고 복사한다.

## 미완료 검증 항목

- 스테이징 R2 실제 왕복(토큰 등록 후 스모크), 브라우저 직접 업로드 CORS(UI 이후)

- 계정 플랜이 Free인지 대시보드 확인(사용자)
- S-6 DB 카운터 원격 동작(Supabase 마이그레이션 경로 확정 후)
- S-7 실기기(저사양 Android·iPhone) PDF 생성 시간
- Supabase 원격 마이그레이션 경로(CI) — Phase 0

## 임시 완화한 게이트 (`TODO(G-xx)`)

- (없음)

## 세션 로그

- 2026-10-01: 구상 대화 정리, hamkke 구조·점검 결과 분석, 디자인 계승자 웹 검증, 스택 조사, 기반 문서 작성. 문서·에셋 커밋은 아직 없음(사용자 지시 대기).

- 2026-10-01(후속): 사용자 지시로 리포 부트스트랩 수행(main 초기 커밋, docs 고아 브랜치 커밋, GitHub private 리포 생성, 두 브랜치 푸시). 이 PROGRESS 갱신은 아직 커밋하지 않음(지시 대기).

- 2026-10-01(정정): 리포를 잘못된 계정(seungwoo7050)에 만들어 `woopinbell/bombyeol`(private)로 다시 생성·푸시. 옛 리포는 사용자가 삭제.

- 2026-10-01(추가 결정): 반려동물을 V1부터 가족 구성원(Pet)으로 포함. PRD §2·§4.2.1·§4.5·§5·§6, COMMIT_PLAN Phase 3·4·5, COST_GUARDS G-11, PRIVACY §1, CLAUDE.md 스코프 갱신. 의료 기록 관리(투약 알림 등)는 후속으로 분리.
- 2026-10-01(추가 결정): 봄별 디자인은 Kaddie 이후. COMMIT_PLAN에 Phase DS와 진행 순서 메모 추가.
- 2026-10-01(정책 변경): 문서 브랜치가 분리되어 있으므로 docs 커밋은 지시 없이 수시로 자율 수행(main 금지). WORKFLOW §4, CLAUDE.md, CLOUD_SESSION 개정.
- 2026-10-01(첫 클라우드 세션): 부트스트랩 실행, V-1~V-5 검증(위 표). S-1 착수는 사용자 확인 대기(Phase S 키 미설정).
- 2026-10-01: 사용자가 Phase S 키 주입 → 키 확인(위 표). Cloudflare 정상, Supabase DB는 VM에서 직접 도달 불가로 S-1 방식 조정 제안. S-1 착수 사용자 확인 대기.
- 2026-10-01: 작업 위치 규칙 합의(CLOUD_SESSION §2.1) — 클라우드 기본, Supabase 마이그레이션은 CI, 실사용 확인은 사용자 기기. S-1 리소스(Hyperdrive 1, 시험 Worker 1) 생성 승인받음.
- 2026-10-01: S-1 수행 — 로컬·원격(Hyperdrive→Supabase) tRPC 왕복 통과. 로컬 .git 덮어쓰기 사고 발생·복구(위 사고 기록). 다음: S-2 착수 여부 사용자 확인, Supabase 마이그레이션 CI 경로는 Phase 0.
- 2026-10-01: S-3(Worker 프록시)·S-4(기준선)·S-6·S-7·S-8 수행. R2 시험 버킷 생성(승인). 로컬 dockerd가 중간에 종료돼 재기동. 다음: S-2(카카오·Google 키), S-5(Firebase), S-3 presign(R2 키) 대기.
- 2026-10-01: S-2 키 확인·구현·배포 → 사용자 실로그인 확인으로 통과. 다음: S-5(Firebase 키·실기기), S-3 presign(R2 키), 이후 S-4 재측정.
- 2026-10-01(결정): 개발 중 완전 무료 유지. Workers Paid는 공개 베타 직전(또는 1102 관측 시) 재결정 — ARCHITECTURE §10. 계정 플랜은 사용자 대시보드 확인(API로는 usage_model=standard만 보여 구분 불가).
- 2026-10-01: Firebase·R2 키 확인. S-3 presign 비교 통과, S-5 서버 측 통과·배포, S-4 재측정. 실기기 푸시 수신 확인 요청.
- 2026-10-01: S-5 실기기 통과 → 스파이크 전부 통과. 사용자 승인으로 ARCHITECTURE 확정, 스파이크 리소스(Worker·Hyperdrive·R2 버킷) 삭제(기존 `hamkke` 버킷은 유지). Phase 0은 새 세션 권장.
- 2026-10-01: PR woopinbell/bombyeol#1(spike→main)이 실수로 머지됐으나, 사용자가 로컬에서 main을 9744db2로 되돌림(확인 완료). 원격 브랜치는 `main`(9744db2), `docs`, `spike/s1-opennext-prisma`(참고용, 머지 금지) 3개. Phase 0은 새 세션에서 main 기준 작업 브랜치로 시작.
- 2026-10-01(Phase 0 세션): 부트스트랩·V-1~V-5 재검증(위 "재검증"), 스파이크는 이미 통과라 재실행 안 함. Phase 0 9커밋(디자인 토큰 제외 + CI 추가)을 `claude/cloud-session-phase-0-72a2lc`에 푸시. COMMIT_PLAN·ENV_MANIFEST 갱신. 대기: main 머지, `STAGING_DATABASE_URL` 시크릿, 스테이징 리소스 생성 승인, `tmp-v2-pushtest` 삭제.
- 2026-10-01: PR woopinbell/bombyeol#2 CI 통과 후 사용자가 머지 커밋으로 머지(06591ce).
- 2026-10-01: 사용자 승인으로 스테이징 Hyperdrive·Worker 생성·배포, 인증 시크릿 등록. Phase 1 서버 9커밋(스키마 → tRPC → 카카오 → Google → 프로시저 → Space·아이 → 초대 발급 → 수락·brute-force → 통합 테스트). 대기: `STAGING_DATABASE_URL`, redirect URI 등록, PR.
- 2026-10-01: 스테이징 마이그레이션(작업 브랜치 기준) 적용, Prisma 외부 모듈 배포 오류 수정·재배포. 사용자 실로그인 확인 대기.
- 2026-10-01: 스테이징 실로그인(Google·카카오) 사용자 확인 통과. `user.me` 추가, 빈 이름 채움 수정. 다음: Phase 1 PR(사용자 확인).
- 2026-10-01: Phase 1 PR woopinbell/bombyeol#3 생성(13커밋), CI 대기. Phase 2는 PR 머지 후 같은 작업 브랜치를 main에서 다시 따서 진행. 필요: 스테이징 R2 버킷 생성 승인, R2 S3 토큰(Worker 시크릿으로 사용자가 직접 등록).
- 2026-10-01: PR woopinbell/bombyeol#3 CI 통과 후 사용자 머지(a2a1145). 작업 브랜치를 main에서 다시 땀. Phase 2는 스테이징 R2 버킷 생성 승인 대기.
- 2026-10-01: 사용자 승인으로 R2 스테이징 버킷 생성(수명주기 접두사 실수 즉시 복구). Phase 2 커밋 10개, 스테이징 배포·마이그레이션, 스모크 경로. 대기: R2 S3 토큰.
