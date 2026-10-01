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

## Phase 0~1 (부트스트랩·인증)

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `AUTH_SECRET` | 32자 이상 랜덤 | `openssl rand -base64 33` — **Claude가 로컬 `.env`에 직접 생성**, 클라우드는 사용자가 생성해 등록 | A(개발용은 별도 값) | 검증됨(Auth.js v5) |
| `AUTH_KAKAO_ID` | 카카오 앱 REST API 키 | developers.kakao.com → 내 애플리케이션 → 앱 키 | A(개발 앱) | 검증됨(Auth.js `AUTH_<PROVIDER>_ID`) |
| `AUTH_KAKAO_SECRET` | 카카오 로그인 Client Secret | 카카오 로그인 → 보안 → Client Secret 발급·활성화 | A | 검증됨 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth 클라이언트 ID/Secret | console.cloud.google.com → OAuth 클라이언트(웹) | A | 검증됨(hamkke 사용) |
| 카카오 콘솔 설정(값 아님) | 플랫폼 Web 도메인, Redirect URI, 동의항목 | 카카오 개발자 콘솔 | — | 이메일 동의항목은 **비즈 앱 전환(개인 개발자 비즈 앱)** 필요, S-2에서 이메일 없이 갈지 결정 |
| Google 콘솔 설정(값 아님) | 승인된 리디렉션 URI | Google Cloud Console | — | 개발·스테이징·프로덕션 URI 각각 |

## Phase 2 (미디어)

| 변수 | 형식 | 발급처 | 등급 | 상태 |
|---|---|---|---|---|
| `R2_BUCKET_NAME` | 버킷 이름(개발용/프로덕션 분리) | Cloudflare R2 | A(개발 버킷) | 검증됨(hamkke 명명) |
| `R2_ACCOUNT_ID` | 계정 ID | 위와 동일 | A | 검증됨 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | S3 호환 키(해당 버킷 스코프, Object Read & Write) | R2 → Manage API tokens (Secret은 발급 직후에만 보임) | A(개발 버킷 한정) | 검증됨. S-3에서 Worker 바인딩 방식으로 바뀌면 불필요해질 수 있음 |

## Phase 6 (알림)

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
