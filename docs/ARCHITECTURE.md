# Bombyeol — 아키텍처

목표: hamkke와 같은 원칙(검증된 매니지드 서비스 위임, 유휴 비용 0 수렴, 단일 코드베이스)을 유지하되, **서버리스를 전제로 스택을 다시 골랐고**, hamkke 점검에서 나온 금전 리스크를 구조로 제거한다.

> **상태: 확정(2026-10-01, 사용자 승인)** — §9 스파이크 S-1~S-8 전부 통과(결과: `PROGRESS.md`). 이후 스택은 명백한 이유 없이 재논의하지 않으며, 바꿔야 하면 사용자에게 먼저 확인한다. 미정으로 남은 것은 결제 공급자(Q-PAY)뿐이다.

## 1. 스택 (확정 2026-10-01)

| 영역 | 선택 | 대안(스파이크 실패 시) | 이유 / 검증 상태 |
|---|---|---|---|
| 프레임워크 | Next.js App Router + TypeScript | — | hamkke 계승. 버전별 breaking change가 있으므로 착수 시 `node_modules/next/dist/docs/`를 먼저 읽는다 |
| API | Route Handler + **tRPC** + Zod | — | 별도 백엔드 없음 |
| 런타임/호스팅 | **Cloudflare Workers** + `@opennextjs/cloudflare`(OpenNext) | Vercel Pro(월 $20 + Spend Management) | 2026년 기준 OpenNext CF 어댑터가 서버 렌더링 Next.js의 권장 경로이고 Pages는 신규 풀스택 시작점이 아니라는 자료 확인(2026-10-01 웹 조사). R2와 한 벤더. **Cloudflare에는 하드 지출 상한이 없다**(예산 알림만, 정보성) — 비용 방어는 앱 레벨 게이트가 담당(`COST_GUARDS.md`) |
| DB | **Postgres**(서버리스형) + Prisma + `@prisma/adapter-pg` + Hyperdrive | D1(SQLite) + `@prisma/adapter-d1`(현재 Preview) | Workers에서 pg는 nodejs_compat + Hyperdrive로 Prisma 실행 가능(요청마다 클라이언트 생성). 공급자 **Supabase Postgres**(사용자 선택, S-1 통과 2026-10-01: Hyperdrive가 Supabase 직결 IPv6 문자열로 동작, PG 17.11). Supabase는 일반 Postgres로만 사용(RLS·Auth·Storage 미사용, `CLOUD_SESSION.md` §2.1). Prisma 7 `prisma-client` 생성기 `runtime = "workerd"` |
| 실시간 | **사용하지 않음** | — | 가족 피드·아카이브는 실시간이 필수가 아니다. TanStack Query refetch-on-focus + 푸시로 충분. 클라이언트가 직접 브로드캐스트하는 공개 채널 자체가 없으므로 hamkke의 Realtime 우회 남용 리스크가 **구조적으로 사라진다**(G-08) |
| 인증 | **Auth.js v5** — 카카오 + Google | Better Auth(카카오 문서 있음) | Auth.js 환경변수 규칙 `AUTH_<PROVIDER>_ID/SECRET` → `AUTH_KAKAO_ID/SECRET` 확인(2026-10-01). 이메일 매직링크 없음. **S-2 통과(2026-10-01)**: Workers(OpenNext)에서 JWT 세션·카카오·Google 실로그인·보호 tRPC 확인. v5는 아직 beta(5.0.0-beta.32) — 버전 고정 |
| 미디어 | **Cloudflare R2** | — | egress 무료. 업로드 경로는 §5. S-3: Worker 프록시 + `FixedLengthStream`으로 크기 강제 확인(presign 비교는 키 대기) |
| 알림 | **FCM 웹푸시** + 카카오톡 공유하기(사용자 발송) | — | iOS는 홈 화면 추가 PWA만 푸시 가능(웹 조사로 확인). **S-5 통과**: Workers에서 `firebase-admin` 없이 HTTP v1 + WebCrypto(RS256) 서명으로 발송, Android 실기기 포그라운드·백그라운드 수신 확인 |
| 결제 | **미정**(`OPEN_QUESTIONS.md` Q-PAY) | 후보: 포트원+토스페이먼츠 등 국내 PG, Stripe(해외 법인 필요 가능) | Stripe는 한국 사업자에 계정 개설이 불가하다는 자료 확인 — 착수 전 재결정 |
| PDF | **클라이언트 생성**(pdf-lib + fontkit 서브셋, Web Worker) | 서버 생성 | **S-7 통과**: 한글 100쪽 3.2s/0.49MB, 추출 일치. 저사양 기기 대비 Web Worker·진행률 필수 |
| 이미지 | 업로드 전 클라이언트가 썸네일 생성, `next/image`는 `unoptimized` | Cloudflare Images(과금) | 변환 과금 회피(hamkke 계승) |
| 스케줄 | **Cron Triggers**(정리 작업) | — | hamkke는 Vercel이라 스케줄러가 없었지만 CF는 기본 제공. 용도: 미확정 업로드 정리·사용량 집계. 정시 사용자 알림은 별도 결정 |
| 레이트 리밋 | **DB 카운터(주)** + Workers Rate Limiting 바인딩(보조) | — | S-6(2026-10-01): 바인딩은 PoP 단위·10/60초 창·결과적 일관성이라 원격에서 한도를 크게 넘겨 통과 → 비용 게이트(G-04·G-07·G-11)는 DB 고정 창 카운터로 정확히, 바인딩은 폭주 완화만 |
| i18n | **next-intl**, 라우팅 없음, 한국어만 출시 | — | hamkke 계승 |
| 테스트 | Vitest(라우터 = 실제 DB 통합), Playwright(e2e, 로컬 DB 전용 가드) | — | hamkke 계승 |
| UI 기반 | shadcn/ui + Radix, Tailwind | — | 디자인은 `DESIGN.md`·`design-research/` |
| 모바일 | **PWA 우선** → 이후 Capacitor Android(`server.url` 원격 로드 방식) | — | 결제 정책(스토어 인앱 결제)은 Android 착수 시 재검토 |

## 2. 시스템 개요

```
[PWA (Next.js)]  ── tRPC over HTTPS ──▶ [Cloudflare Worker (OpenNext)]
                                             ├─ Prisma ─ Hyperdrive ─▶ [서버리스 Postgres]
                                             ├─ R2 (presign 또는 바인딩)
                                             ├─ FCM HTTP v1 (푸시, fetch)
                                             ├─ 카카오 OAuth / Google OAuth
                                             ├─ 결제 공급자 웹훅 (미정)
                                             └─ Cron Trigger (정리·집계)
```

## 3. 인증 · Space 흐름

1. 카카오 또는 Google로 로그인(Auth.js).
2. 신규 사용자: "가족 만들기"(부모) 또는 "초대코드/링크로 합류"(조부모·친척) 선택.
3. 가족 만들기 → Space + Member(role=parent) 생성, 아이 프로필 등록, 초대 발급.
4. 초대 수락 → Member 생성(역할은 초대에 고정), 만료·1회용 검증, 트랜잭션.
5. 모든 tRPC 프로시저는 `spaceProcedure`가 **요청 사용자가 그 spaceId의 Member인지**, 역할이 필요한 동작을 허용하는지 매 요청 검사.

카카오 이메일 동의항목은 **비즈 앱 전환**(개인 개발자 비즈 앱: 본인인증+약관 동의로 사업자등록 없이 가능하다는 자료 확인)이 필요하다. 이메일 없이 카카오 ID만으로 계정을 만들 수 있으면 비즈 전환을 늦출 수 있다 — 결정은 S-2에서.

## 4. 데이터 접근 통제

- 클라이언트는 DB에 직접 접근하지 않는다. 모든 접근은 tRPC `spaceProcedure`(애플리케이션 계층).
- 미디어는 영구 public URL 금지, 짧은 TTL의 서명 URL로만 읽는다.
- 임신 기록 등 건강 정보는 리소스 단위 `visibility`(부모만/전체 멤버)를 서버에서 강제한다(`PRIVACY_AND_LEGAL.md` §3).

## 5. 미디어 업로드 파이프라인 (비용·보안 핵심)

hamkke에서 R2 남용이 가능했던 다섯 구멍을 처음부터 닫는 경로:

1. 클라이언트 → `media.requestUpload({kind, bytes, contentType})` 요청. 서버가 상한·한도·요청 횟수를 검사(G-01, G-03, G-04)하고 `MediaAsset(status=pending, bytes)`를 만든 뒤 **서명에 `Content-Length`(정확한 bytes)와 `Content-Type`을 포함한** 업로드 URL을 발급. 키는 `spaces/{spaceId}/pending/{assetId}`.
2. 클라이언트가 R2로 직접 PUT.
3. 클라이언트 → `media.confirm(assetId)`. 서버가 `HeadObject`로 **실존·크기 일치·자기 Space 경로**를 확인하고 `confirmed`로 전환(G-02). 콘텐츠를 참조하는 모든 mutation(`moment.create`, `story.create` 등)은 **confirmed 상태의 자기 Space 자산만** 받는다(키 문자열 신뢰 금지).
4. 사용량 한도는 **confirmed 바이트 합계**로 센다(업로드 URL만 받고 안 쓰는 우회 차단).
5. 삭제 시 DB와 R2 객체를 함께 삭제. `pending` 접두사에는 R2 수명주기 규칙(1일)과 Cron 정리를 둔다(G-05).

서명 URL이 R2에서 `Content-Length` 서명 헤더를 실제로 강제하는지, 아니면 Worker가 본문 스트림을 프록시하며 바이트를 세는 방식이 필요한지는 스파이크 S-3에서 확인한다(둘 다 G-01을 만족하는 방식이면 됨).

## 6. 결제 / 구독 설계 (공급자 미정, 공급자 무관 규칙)

- 구독 주체는 `Space`. 구독 행은 **`spaceId`를 키로 upsert**하고 공급자 구독 ID는 갱신 필드(재구독 unique 충돌 방지, G-09).
- Checkout 세션은 진행 중인 세션을 재사용하고 **멱등성 키**를 쓴다(이중 결제 방지). 활성 구독이 있으면 새 세션 거부.
- 웹훅은 서명 검증 필수. 이벤트 처리는 멱등적이어야 한다(재시도 대비).
- 구독이 만료/해지되어도 **저장된 기억은 삭제하지 않는다**(`PRD.md` §4.7). 한도 초과 시 새 업로드만 막는다.
- 계정·Space 삭제 시 구독 해지를 함께 처리한다(G-06).
- 웹 결제와 Android 앱 인앱 결제 정책은 별개 — Android 스토어 배포 Phase에서 재검토(`OPEN_QUESTIONS.md`).

## 7. 알림

- FCM은 Workers에서 `firebase-admin` 대신 **HTTP v1 API + 서비스 계정 JWT를 fetch로** 호출한다고 가정(S-5에서 검증).
- 토큰은 `PushToken`, 다기기 지원. 발송 전 수신자 Space 멤버십 재확인.
- iOS 어르신은 푸시가 불안정하므로 **카카오톡 공유하기**가 1급 경로: 부모 화면에 "어르신께 보내기" 버튼(공유 링크 = 로그인 후 해당 화면으로 딥링크).
- 건당 과금 채널(알림톡·친구톡)은 도입하지 않는다.

## 8. 음성 / STT (후속, 프리미엄 후보)

- V1 이야기는 텍스트 우선. 음성은 짧은 클립 상한 + 저비용 STT를 붙이는 후속 작업.
- 비용 게이트 G-14(STT 호출 횟수·길이 상한, 프리미엄 한정)가 선결 조건이다.
- 어르신 텍스트 부담은 **가족 대필**(작성자·대필자 병기)로 V1에서 완화.

## 9. 스택 검증 스파이크 (Phase 0의 첫 작업, 실패해도 결과를 기록)

| ID | 확인할 것 | 통과 기준 | 실패 시 |
|---|---|---|---|
| S-1 | OpenNext(CF Workers) + Prisma(pg adapter, Hyperdrive) 빌드·배포·쿼리 | 로컬 `wrangler dev`와 실제 배포 각각에서 tRPC 쿼리 왕복 | D1 어댑터 또는 Vercel Pro |
| S-2 | Auth.js 카카오·Google 로그인 + 세션 유지(Workers) | 실제 로그인 후 보호된 tRPC 호출 성공 | Better Auth |
| S-3 | R2 업로드 크기 강제 | 선언과 다른 크기의 PUT이 거부됨 (또는 Worker 프록시로 강제) | Worker 프록시 방식 |
| S-4 | Worker 번들 크기·CPU 한도 vs 요금제 | 배포 성공, 한도 여유 확인 | 코드 분할 또는 Vercel |
| S-5 | FCM HTTP v1 발송(Workers) | 실제 기기 1대에 수신 | Vercel 함수에서 발송 |
| S-6 | 레이트 리밋 방식 | 정해진 횟수 초과 시 429 | DB 카운터 |
| S-7 | 클라이언트 PDF 생성(한글 폰트) | 한글 100쪽 분량 생성 시간·용량 허용 범위 | 서버 생성 |
| S-8 | 클라우드 세션의 외부 호스트 도달성 | 필요 호스트 전부 허용 목록에 넣고 왕복 | 로컬에서 수행 |

스파이크 결과는 `docs/PROGRESS.md`에 기록하고, 통과하면 이 문서 상단 상태와 `CLAUDE.md`를 "확정"으로 바꾼다(사용자 지시가 있을 때 docs 커밋).

## 10. 비용 모델 (개략, 확정 전 단가 재확인)

- 저장: R2 약 $0.015/GB/월(hamkke 점검 시 확인한 값), egress 무료. 무료 티어 10GB.
- 지배 비용은 **저장량**이므로 Space별 총량 상한(무료·프리미엄 모두)이 필수.
- Workers 요금제 (사용자 결정 2026-10-01: **개발 중에는 완전 무료**): 개발은 Free 플랜으로 진행하고, Paid 전환은 **공개 베타 직전 또는 배포 환경에서 1102(CPU 초과) 오류가 관측될 때** 결정한다. Free는 과금 자체가 불가능해 한도를 넘으면 청구가 아니라 오류로 실패한다(비용 측면에서 가장 안전). 근거: 스파이크 중 CPU 200~450ms 요청을 포함한 약 250건이 모두 ok·오류 0(문서상 Free 한도 10ms이므로 보장은 아님). 일상 개발은 로컬 `wrangler dev`(CPU 한도 없음) 위주.
- (S-4 원문) 출시 기준으로는 **유료 플랜 필요(S-4 실측)** — 크기는 64 MiB(비압축) 안에 들어오지만(추적 제외 후 11.5 MiB) CPU가 무료 한도 10ms/요청을 넘는다(웜 8~20ms, 콜드 200~450ms, SSR 30~340ms). 월 $5 최소 + 초과분.
- 최악 비용 시나리오는 `COST_GUARDS.md` §3에서 가정별로 계산해 둔다.

## 11. 테스트 전략

hamkke §11 계승: 순수 로직 Vitest 단위, tRPC 라우터는 실제 DB 통합, 핵심 플로우 Playwright e2e(가족 생성 → 초대 → 사진 → 이야기 → 삭제). **모든 비용 게이트(G-xx)에는 대응하는 테스트가 있어야 한다** — 예: "선언보다 큰 파일 거부", "다른 Space의 자산 키 거부", "재구독이 unique 충돌 없이 동기화".
