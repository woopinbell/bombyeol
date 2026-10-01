# Bombyeol — 환경변수 매니페스트

Phase별로 필요한 키를 **이름·형식·발급처·등급**으로 미리 적어 둔다. 사용자가 Phase 시작 전에 클라우드 환경(또는 로컬 `.env`)에 한 번에 넣을 수 있게 하기 위한 문서다(절차: `CLOUD_SESSION.md` §3). 실제 `.env.example`은 Phase 0의 개발 커밋(main)에서 이 표를 기준으로 만든다.

규칙 (hamkke 규칙 계승):
- **이름을 추측하지 않는다.** "검증됨"은 공식 문서·hamkke 실사용으로 확인한 이름, "우리 명명"은 우리가 정하는 이름이다. 확정되지 않은 Phase의 변수는 채우지 않는다.
- 등급 A = 개발/테스트 값이라 클라우드 환경에 넣어도 됨, B = 프로덕션(넣지 않음). `CLOUD_SESSION.md` §3.3.
- 값을 대화에 붙여넣지 않는다.

## Phase S (스파이크)

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 토큰(범위 제한: Workers·R2·Hyperdrive 편집 등 필요한 권한만) | dash.cloudflare.com → My Profile → API Tokens | A(전용 dev 계정/제한 토큰) | wrangler 표준명(착수 시 문서 재확인) |
| `CLOUDFLARE_ACCOUNT_ID` | 32자 hex | 대시보드 우측/R2 개요 | A | 표준명 |
| `DATABASE_URL` | `postgresql://...`(개발용 DB). 현재 **Supabase 직결** `db.<ref>.supabase.co:5432`(IPv6 전용) | Supabase → Project → Connect | A | 이름은 Prisma 표준. 공급자 Supabase(2026-10-01 사용자 선택, S-1 결과로 확정). 클라우드 VM에서는 직접 접속 불가. S-1: Hyperdrive는 이 직결 문자열로 동작(풀러 불필요). 앱 런타임은 이 값을 직접 읽지 않고 Hyperdrive 바인딩을 쓴다 — 이 변수는 Hyperdrive 생성·마이그레이션용 |

## Phase 0 — CI·로컬 (2026-10-01 추가)

| 변수 | 어디에 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|---|
| `STAGING_DATABASE_URL` | **GitHub Actions 리포 시크릿**(클라우드 환경 아님) | Supabase **Session pooler(IPv4)** 연결 문자열 `postgresql://postgres.<ref>:<비밀번호>@aws-0-<region>.pooler.supabase.com:5432/postgres` | Supabase → Project → Connect → Session pooler | A(개발 DB) | 우리 명명. `.github/workflows/migrate-staging.yml`이 `DATABASE_URL`로 넘겨 `prisma migrate deploy`. 호스티드 러너가 IPv6를 못 써서 직결 대신 풀러(미검증 — 첫 실행으로 확인) |
| `LOCAL_DATABASE_URL` | 로컬 `.env`(선택) | `postgresql://postgres:postgres@localhost:5432/bombyeol` | docker-compose 기본값 | — | 우리 명명. 비우면 기본값. `scripts/with-local-db.mjs`가 로컬 호스트가 아니면 거부 |

## Phase 0~1 (부트스트랩·인증)

> 2026-10-01: S-2용으로 아래 5개 키가 클라우드 환경에 등록됨(개발 앱, 등급 A). 배포 Worker에는 `wrangler secret put`으로 별도 등록해야 한다.
> 2026-10-01(Phase 1): 스테이징 Worker `bombyeol-staging`에 `AUTH_SECRET`·`AUTH_KAKAO_ID/SECRET`·`AUTH_GOOGLE_ID/SECRET` 등록 완료(클라우드 환경값을 stdin으로 전달, 출력 없음). 콘솔 redirect URI: `https://bombyeol-staging.seungwoo7050.workers.dev/api/auth/callback/kakao`, `.../callback/google`.

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `AUTH_SECRET` | 32자 이상 랜덤 | `openssl rand -base64 33` — **Claude가 로컬 `.env`에 직접 생성**, 클라우드는 사용자가 생성해 등록 | A(개발용은 별도 값) | 검증됨(Auth.js v5) |
| `AUTH_KAKAO_ID` | 카카오 앱 REST API 키 | developers.kakao.com → 내 애플리케이션 → 앱 키 | A(개발 앱) | 검증됨(Auth.js `AUTH_<PROVIDER>_ID`) |
| `AUTH_KAKAO_SECRET` | 카카오 로그인 Client Secret | 카카오 로그인 → 보안 → Client Secret 발급·활성화 | A | 검증됨 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth 클라이언트 ID/Secret | console.cloud.google.com → OAuth 클라이언트(웹) | A | 검증됨(hamkke 사용) |
| 카카오 콘솔 설정(값 아님) | 플랫폼 Web 도메인, Redirect URI, 동의항목 | 카카오 개발자 콘솔 | — | 2026-10-01 설정: 닉네임 필수·프로필 사진 선택(사진은 앱이 저장하지 않음), 이메일 미사용. 이메일 동의항목은 **비즈 앱 전환(개인 개발자 비즈 앱)** 필요, S-2에서 이메일 없이 갈지 결정 |
| Google 콘솔 설정(값 아님) | 승인된 리디렉션 URI | Google Cloud Console | — | 개발·스테이징·프로덕션 URI 각각 |

## Phase 2 (미디어)

> 2026-10-01: S-3용으로 R2 4종 등록됨(버킷 `bombyeol-spike-s3` 한정 토큰). 본 개발용 버킷·토큰은 Phase 2에서 별도 발급.
> 2026-10-01(Phase 2): 스테이징 버킷 `bombyeol-staging-media`(APAC) 생성. 버킷 이름은 `wrangler.jsonc` vars로 둔다. 계정 ID(`R2_ACCOUNT_ID`)는 비밀은 아니지만 리포에 넣지 않고 Secret으로 둔다(현재 스테이징 상태). **S3 토큰 2종(`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`)은 사용자가 Cloudflare 대시보드에서 Worker `bombyeol-staging`의 Secret으로 직접 등록**(클라우드 환경에 넣지 않음 — 세션은 값이 필요 없고 테스트는 가짜 저장소로 한다). 클라우드 환경에 남은 스파이크용 R2 4종은 무효(삭제 권장). **주의(2026-10-01 Phase 3 배포에서 확인)**: 대시보드에서 등록할 때 반드시 "Secret"(암호화) 유형으로 — 일반 "변수"로 넣으면 다음 `wrangler deploy`가 `wrangler.jsonc`의 vars로 덮어써 사라진다(`R2_ACCESS_KEY_ID`가 그렇게 빠졌음). CLI는 `npx wrangler secret put R2_ACCESS_KEY_ID --env staging`.

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `R2_BUCKET_NAME` | 버킷 이름(개발용/프로덕션 분리) | Cloudflare R2 | A(개발 버킷) | 검증됨(hamkke 명명) |
| `R2_ACCOUNT_ID` | 계정 ID | 위와 동일 | A | 검증됨 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | S3 호환 키(해당 버킷 스코프, Object Read & Write) | R2 → Manage API tokens (Secret은 발급 직후에만 보임) | A(개발 버킷 한정) | 검증됨. S-3에서 Worker 바인딩 방식으로 바뀌면 불필요해질 수 있음 |

## Phase 6 (알림)

> 2026-10-01: S-5용으로 Firebase 10종 등록됨(개발 프로젝트). 클라우드 환경 UI는 `FIREBASE_ADMIN_PRIVATE_KEY`를 실제 줄바꿈으로 저장한다 — 코드는 `\n` 이스케이프와 실제 줄바꿈을 모두 처리할 것. Workers에서는 `firebase-admin` 대신 HTTP v1 + WebCrypto 서명(S-5).

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID` | 웹 앱 SDK config 값 | console.firebase.google.com → 프로젝트 설정 → 일반 | A(개발 프로젝트) | 검증됨(hamkke) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | 웹 푸시 인증서 키 쌍 | 프로젝트 설정 → Cloud Messaging → 웹 구성 | A | 검증됨 |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | 서비스 계정 JSON의 세 필드(`private_key`는 큰따옴표 + `\n` 유지) | 프로젝트 설정 → 서비스 계정 → 새 비공개 키 | A | 검증됨(hamkke). S-5에서 Workers 발송 방식 확정 시 변경 가능 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JavaScript 키(공개 키) | developers.kakao.com → 앱 키 | A | 우리 명명. 카카오톡 공유하기용, 도메인 등록 필수 |

## Phase 8 (수익화) — **미정**

결제 공급자가 결정되기 전(`OPEN_QUESTIONS.md` Q-PAY)에는 변수를 적지 않는다. 결정 후 그 공급자의 공식 문서로 이름을 확인해 이 표에 채운다(테스트 모드 키만 등급 A).

## 값이 아닌 것(코드가 계산)

- `AUTH_URL`/`NEXTAUTH_URL` 계열은 배포 환경에서 자동 추론 여부를 S-1·S-2에서 확인 후 필요할 때만 추가한다.
- Hyperdrive·R2 바인딩은 `wrangler` 설정(코드)이지 환경변수가 아니다.
