# Bombyeol — 클라우드 세션 운영 가이드

실제 개발은 GitHub 리포를 clone하는 **클라우드 세션**(claude.ai/code 등)에서 시작한다. 로컬 세션과 다른 점과 절차를 정리한다. 사실 근거는 공식 문서(`code.claude.com/docs/en/claude-code-on-the-web`, `.../cloud-environments`, 2026-10-01 확인)이고, 확인하지 못한 것은 **V-번호(검증 필요)** 로 표시했다.

## 1. docs 브랜치 부트스트랩

`main`에는 CLAUDE.md·docs·image-asset이 없다. 세션이 시작되면 아래를 실행해 `docs` 브랜치를 `.docs/` 워크트리로 붙이고 루트에 링크한다.

```bash
# scripts가 main에 없으므로 환경 setup 스크립트(리포 밖)에 넣거나 세션 첫 프롬프트로 실행한다
git fetch origin docs
[ -d .docs ] || git worktree add -B docs .docs origin/docs
git -C .docs pull --ff-only origin docs || true
for p in CLAUDE.md docs image-asset; do ln -sfn ".docs/$p" "$p"; done
printf '%s\n' '.docs/' 'CLAUDE.md' 'docs' 'image-asset' >> .git/info/exclude
```

- 링크와 워크트리는 `.git/info/exclude`로 무시하므로 `main`에 섞이지 않는다.
- **주의(첫 클라우드 세션에서 발견)**: `.git/info/exclude`는 모든 워크트리가 공유한다. 그래서 `docs`·`CLAUDE.md`·`image-asset` 패턴이 `.docs/` 워크트리의 실제 문서까지 무시해 새 파일이 `git add`되지 않았다. `docs` 브랜치 루트 `.gitignore`의 `!/docs/` 등 부정 패턴으로 되살린다(`.gitignore`가 info/exclude보다 우선). 이 파일을 지우지 않는다.
- 문서 수정은 링크를 통해 `.docs/`(= `docs` 브랜치 작업 트리)에 반영된다. 커밋은 **수시로 자율 수행**: `git -C .docs commit` + `git -C .docs push origin docs`(`WORKFLOW.md` §4).
- **환경 setup 스크립트 사용 시 주의**: setup 스크립트 결과는 파일시스템 스냅샷으로 **약 7일 캐시**되고 세션을 다시 열어도 재실행되지 않는다. 그러면 `.docs/`가 낡을 수 있으므로 **세션 첫 프롬프트에 항상 `git -C .docs pull --ff-only origin docs`를 포함**한다(§4 템플릿).
- 대안: 리포에 `.claude/settings.json`의 SessionStart 훅을 두고 위 스크립트를 실행(hook 파일 하나는 main에 들어간다 — 개발 도구 설정이라 허용할지는 사용자 결정, `OPEN_QUESTIONS.md` Q-HOOK).

**검증 필요(첫 클라우드 세션의 첫 작업)** — 결과는 `PROGRESS.md` "부트스트랩 검증 결과"(2026-10-01: V-1·V-2 통과, V-3 자동 로드 안 됨, V-4 `add_repo`로 가능, V-5 새 세션 필요)

| ID | 확인 내용 | 실패 시 |
|---|---|---|
| V-1 | 클라우드 clone에서 `git fetch origin docs`가 되는가(단일 브랜치 clone 여부) | 프롬프트로 `git fetch origin docs:docs` 또는 별도 리포 `bombyeol-docs` |
| V-2 | 세션 VM에서 `docs` 브랜치로 **push**가 되는가(브랜치 이름 제한 여부) | 별도 private 리포 `bombyeol-docs`로 전환(사용자 승인 후) |
| V-3 | 루트 `CLAUDE.md` 심볼릭 링크가 세션 시작 시 자동 로드되는가 | 첫 프롬프트로 `CLAUDE.md`를 직접 읽게 지시 |
| V-4 | 한 세션에서 두 번째 리포를 붙일 수 있는가(별도 docs 리포 대안용) | — |
| V-5 | 환경변수를 바꾼 뒤 기존 세션을 "다시 열면" 새 값이 반영되는가(문서상 실행 중 세션은 재읽기 없음) | 항상 **새 세션**으로 재개 |

## 2. 로컬 vs 클라우드 차이 (hamkke 경험 포함)

- `.env`는 gitignore 대상이라 **클라우드에 없다**(로컬 번들 업로드 시에도 `.env`류 파일은 제외됨). 값은 환경 설정의 환경변수로 들어간다.
- 세션 VM은 유휴 후 회수된다. 커밋·푸시하지 않은 것은 사라진다(개발·문서 모두 수시로 커밋·푸시, 문서는 §5 규칙).
- 네이티브 다이얼로그(브라우저 권한, 결제 호스티드 화면)와 실기기 검증은 자동화할 수 없다 → `PROGRESS.md` "미완료 검증"에 남기고 사용자가 확인.
- 네트워크: 기본 **Trusted** 수준은 허용 목록(패키지 레지스트리, GitHub, 일부 클라우드 SDK 등)만 도달한다. 우리 서비스 호스트는 **Custom 허용 도메인**에 추가해야 한다 — 스파이크 S-8에서 실측(예상 호스트: DB 공급자, `*.r2.cloudflarestorage.com`(기본 허용에 포함으로 확인), 카카오 인증 서버, Google OAuth, FCM, 결제 공급자, `api.cloudflare.com`). 허용 도메인을 바꾸면 환경 캐시가 재구성된다.
- hamkke의 교훈: 클라우드 환경변수 `DATABASE_URL`이 **실제 DB**를 가리키면 로컬 테스트·마이그레이션이 실수로 실DB에 닿는다. 봄별은 클라우드 환경에 **개발/테스트용 값만** 넣고, 테스트·e2e는 로컬 Docker Postgres를 쓰며 원격 DB면 스스로 거부하는 가드를 둔다.
- Docker는 클라우드 VM에서 사용 가능(문서 확인). 로컬 Postgres는 `docker compose`로 띄운다.

### 2.0 클라우드에서 띄운 서버는 사용자가 못 본다 (사용자 지적, 2026-10-02)

- 클라우드 VM의 `localhost`(dev 서버·정적 서버)는 사용자 로컬 브라우저에서 열리지 않는다. CLAUDE.md "디자인 폴리시 보고 시 dev 서버를 켜 둔다"는 **로컬 세션 규칙**이다.
- 클라우드에서 화면을 보여줄 때는: (1) Playwright 스크린샷·영상을 파일로 보낸다(`SendUserFile`), (2) 정적 목업·프로토타입은 docs 브랜치에 커밋해 사용자가 받아 로컬에서 연다, (3) 실제 앱은 main 머지 후 **스테이징**(`bombyeol-staging` workers.dev)에서 본다.
- 보고에 `localhost` 주소를 "볼 수 있는 곳"처럼 적지 않는다.

## 2.1 작업 위치 규칙 (사용자 결정, 2026-10-01)

배경: 클라우드 VM은 IPv6 미지원·프록시 밖 TCP 차단이라 Supabase(직결 IPv6)에 직접 닿지 않는다(`PROGRESS.md` "Phase S 키 확인"). 기준은 **기능별이 아니라 작업 성격별**로 나눈다.

| 어디서 | 하는 일 |
|---|---|
| **클라우드 세션(기본)** | 거의 모든 개발 커밋, 로컬 Docker Postgres 기반 단위·통합·e2e, Cloudflare 배포·리소스 조작(API), 문서 |
| **CI(GitHub Actions)** | Supabase 마이그레이션 적용(IPv4 풀러 문자열, S-1에서 확정), 배포 후 스모크 테스트 |
| **사용자 기기(배포 URL로 확인)** | 실제 카카오·Google 로그인, 실기기 푸시 수신, PWA 설치, 디자인 육안 확인 |
| **로컬 Claude 세션(예외)** | 실제 DB 직접 접근이 꼭 필요한 디버깅(느린 쿼리·연결 문제)만 |

운영 규칙:
1. Supabase는 **일반 Postgres로만** 쓴다(RLS·Supabase Auth·Storage 미사용). 로컬 Docker Postgres는 Supabase와 같은 메이저 버전으로 고정.
2. **Phase 완료 조건에 배포 스모크**(스테이징 Worker → Hyperdrive → Supabase 핵심 쿼리 왕복)를 넣는다. 검증을 몰아서 하지 않는다.
3. 같은 기능을 두 위치에서 나눠 하지 않는다. 어디서 하든 상태의 기준은 git + `PROGRESS.md`.
4. 이 VM에서 검증하지 못한 항목은 `PROGRESS.md` "미완료 검증"에 반드시 기록한다.
5. 로컬 세션은 실DB에 닿으므로 "원격 DB면 테스트·마이그레이션 거부" 가드를 우회하지 않는다.

## 3. API 키·환경변수 절차 (질문 7의 답)

### 3.1 짧은 답

- **클라우드에서도 "필요한 시점에 정확히 요구 → 사용자가 추가 → 재개"가 가능하다.** 단 `.env` 파일을 직접 고치는 방식이 아니라 **클라우드 환경 설정의 환경변수**를 쓰고, 값은 **새 세션 시작 시** 반영된다(문서: "editing or adding variables affects sessions you start afterward; sessions already running keep the values they started with").
- **키를 대화(채팅)에 붙여넣는 것은 하지 않는다 — 맞는 판단이다.** 세션 대화는 기록·공유될 수 있고(공유 시 "Sessions may contain code and credentials"라는 경고가 문서에 있다), hamkke는 devlog에 대화 기록을 커밋했다가 `.gitignore`에 키 유출 경고를 남긴 전례가 있다.
- **환경변수에 넣는 것이 정답이지만 만능은 아니다.** 환경변수는 그 환경을 쓰는 사람과 세션 안의 명령이 읽을 수 있다(개인 환경이면 본인만 사용). 프롬프트 인젝션·로그 출력으로 새어 나갈 수 있으므로 **아래 §3.3 등급 규칙**을 지킨다.

### 3.2 절차 (요청 → 등록 → 재개)

1. **선제 방식(권장)**: 각 Phase 시작 전에 `ENV_MANIFEST.md`의 그 Phase 항목을 사용자가 **한 번에** 환경에 넣고 새 세션을 시작한다. 중간에 멈출 일이 거의 없어진다.
2. **누락 시(로컬 방식과 동일한 요청)**:
   1. Claude가 필요한 키가 처음 필요해지는 지점에서 **이름·형식·발급처·필요 이유**를 `ENV_MANIFEST.md`와 `.env.example`에 먼저 채우고(값은 비움) 사용자에게 알린다.
   2. Claude는 그 키 없이 진행 가능한 작업을 끝내고 커밋 가능한 상태로 정리, `PROGRESS.md`에 "대기 중인 키와 재개 지점"을 기록.
   3. 사용자가 claude.ai/code의 **환경 편집** 대화상자 "Environment variables"(`KEY=value` 한 줄씩, `#`이 든 값·여러 줄 값은 따옴표)에 추가.
   4. **새 세션**을 시작해 재개한다(문서상 실행 중 세션은 값을 다시 읽지 않음, 다시 열기 동작은 V-5).
   5. 세션을 옮기기 전에 Claude가 `PROGRESS.md`(대기 중인 키·재개 지점)를 **직접 커밋·푸시**한다. 새 세션은 첫 프롬프트의 `git pull`로 이를 받는다.
3. **`.env.example`은 main의 개발 산출물**(Phase 0의 `chore(env)`)이라 개발 커밋으로 남고, 이름·형식은 거기에도 있어 새 세션이 알 수 있다.
4. 사용자가 키를 넣은 뒤 Claude는 **값을 출력·기록하지 않고** 존재 여부만 확인한다(예: 변수가 비어 있지 않은지 길이만). 로그에 값이 찍히는 명령(`env`, `printenv`, `set -x`)을 쓰지 않는다.

### 3.3 키 등급 규칙

| 등급 | 예 | 클라우드 환경에 넣나 |
|---|---|---|
| A. 개발/테스트 전용 | 개발용 DB URL, 테스트 R2 버킷 토큰, 카카오/Google 개발 앱 키, FCM 개발 프로젝트, 결제 **테스트 모드** 키 | **넣는다**(권한 최소화, 별도 dev 리소스 사용) |
| B. 프로덕션 | 프로덕션 DB URL, 프로덕션 R2 토큰, 라이브 결제 키·웹훅 시크릿 | **넣지 않는다.** 호스팅(Cloudflare) 대시보드에만 사용자가 직접 |
| C. 계정 전권 | Cloudflare 전역 API 키 | 쓰지 않는다. 필요하면 **범위가 제한된 API 토큰**만(배포 권한 등) |

- **API credential 기능**(Pro/Max, 사용자 플랜 확인됨): 키를 Claude·세션 명령이 볼 수 없게 프록시가 요청에 붙여준다. 그러나 *특정 호스트로 나가는 Bearer 형식 요청*에만 해당한다. 봄별의 대부분 키는 (a) 앱 코드가 환경변수로 읽는 값(DB URL, OAuth 시크릿, R2 SigV4 키)이거나 (b) 서버 SDK가 서명하는 값이라 **일반 환경변수가 될 수밖에 없다**. Bearer 방식으로 호출하는 외부 API(예: 결제 공급자 테스트 API 조회)에만 검토한다. 등록은 이미 존재하는 환경의 편집 화면에서 하나씩, 저장 후 값은 다시 볼 수 없고 수정은 삭제 후 재추가.
- 다중 줄 값(예: Firebase 서비스 계정 `private_key`)은 큰따옴표로 감싸고 `\n` 이스케이프 유지(hamkke `.env.example` 규칙).
- Claude는 **키 값을 파일에 쓰지 않는다**(로컬 `.env` 생성이 필요한 랜덤 시크릿 제외). 로컬 개발 세션에서만 `.env`를 만든다.

## 4. 세션 시작 프롬프트 템플릿

새 클라우드 세션 첫 메시지에 붙여넣는다(사용자용):

```
봄별 클라우드 세션 시작. 이 리포의 main에는 문서가 없고 docs 브랜치에 있어.
1) 먼저 아래 부트스트랩을 그대로 실행해줘 (docs를 .docs/에 붙이고 루트에 링크):
   git fetch origin docs
   [ -d .docs ] || git worktree add -B docs .docs origin/docs
   git -C .docs pull --ff-only origin docs || true
   for p in CLAUDE.md docs image-asset; do ln -sfn ".docs/$p" "$p"; done
   printf '%s\n' '.docs/' 'CLAUDE.md' 'docs' 'image-asset' >> .git/info/exclude
   (주의: 링크 docs와 브랜치 docs가 이름이 같으니 브랜치는 refs/heads/docs 또는 git -C .docs 로 다뤄)
2) CLAUDE.md → docs/PROGRESS.md → docs/CLOUD_SESSION.md §1의 검증 V-1~V-5를 순서대로 읽고 수행해. 특히 docs 브랜치 push 가능 여부(V-2)를 실제로 시험하되, 시험용 커밋은 남기지 말고 결과만 알려줘.
3) 그다음 docs/ARCHITECTURE.md §9 스택 스파이크 S-1~S-8을 spike/* 브랜치에서 진행 (main에 머지 금지). 필요한 키가 생기면 docs/ENV_MANIFEST.md 기준 정확한 이름을 먼저 알려주고 멈춰. 키 값은 대화에 붙여넣지 않을 거야.
4) 문서는 자유롭게 수정하고 docs 브랜치에 수시로 커밋·푸시해줘(main에는 금지). 세션을 끝내거나 옮기기 전에는 PROGRESS.md를 갱신해 커밋·푸시하고 알려줘.
오늘 할 일: 부트스트랩 검증(V-1~V-5) 결과 보고 후 스파이크 S-1 착수 여부를 나에게 확인.
```

### 4.1 이후 세션용 (스파이크 완료 후, 2026-10-01 추가)

```
봄별 클라우드 세션. main에는 문서가 없고 docs 브랜치에 있어.
1) 부트스트랩을 그대로 실행해줘:
   git fetch origin docs
   [ -d .docs ] || git worktree add -B docs .docs origin/docs
   git -C .docs pull --ff-only origin docs || true
   for p in CLAUDE.md docs image-asset; do ln -sfn ".docs/$p" "$p"; done
   printf '%s\n' '.docs/' 'CLAUDE.md' 'docs' 'image-asset' >> .git/info/exclude
   (브랜치 docs는 refs/heads/docs 또는 git -C .docs 로 다뤄)
2) CLAUDE.md → docs/PROGRESS.md("다음 할 일") → docs/COMMIT_PLAN.md 해당 Phase 순서로 읽어.
3) 오늘 할 일: <예: Phase 0>. 개발 커밋은 작업 브랜치에서 COMMIT_PLAN 단위로, 문서는 docs 브랜치에 수시 커밋·푸시. main 머지는 내 확인 후.
4) 키가 필요하면 ENV_MANIFEST 기준 이름을 먼저 알려주고 멈춰. 세션을 끝내기 전 PROGRESS 갱신·푸시하고 알려줘.
```

## 5. 세션 인수인계 체크리스트 (Claude가 세션 종료 전 수행)

- [ ] `docs/PROGRESS.md` 갱신: 완료한 커밋, 다음 항목, 막힌 것(키·결정), 미완료 검증, 임시 완화한 게이트(`TODO(G-xx)`)
- [ ] `COMMIT_PLAN.md` 체크박스 갱신
- [ ] 설계가 바뀌었으면 해당 문서 갱신(작업 트리)
- [ ] 개발 코드는 모두 커밋·푸시했는가(개발 커밋은 지시 없이 수행)
- [ ] 문서 변경을 `docs` 브랜치에 커밋·푸시했는가(`main` 금지), 푸시 실패 시 사용자에게 알림
- [ ] 다음 세션에 필요한 키·환경 변경(새 세션 필요 여부)을 명시
- [ ] dev 서버를 띄우는 작업(폴리시)이면 켜둔 채 보고
- [ ] **Phase(또는 큰 작업 묶음)가 끝날 때마다 "다음 Phase를 이 세션에서 계속할지 / 새 세션으로 옮길지"를 근거와 함께 보고**(사용자 규칙, 2026-10-01). 근거: 컨텍스트 사용량(`get_session`의 `context_usage`, 대략 50% 넘으면 이동 권장), 환경변수 변경 필요 여부(바꾸면 새 세션), VM 상태(Docker·`.docs` 유지 여부), 진행 중 PR. 옮길 때는 PROGRESS 갱신·푸시 후 §4.1 프롬프트를 채워 건넨다.

## 6. 비용·계정 메모

- 클라우드 세션은 별도 VM 컴퓨트 요금이 없고 계정의 사용 한도를 공유한다(문서 확인). 병렬 세션이 많으면 한도를 더 빨리 쓴다.
- GitHub 연동: 새 private 리포 생성과 첫 푸시는 사용자 승인 후에만(`CLAUDE.md` 하지 말 것). 클라우드 세션은 GitHub 앱/`/web-setup` 중 하나로 리포 접근이 필요하다.
