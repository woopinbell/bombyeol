# Bombyeol (봄별)

손주의 "봄"(자라나는 오늘)과 조부모의 "별"(살아온 기억)을 이어주는, 세대 간 프라이빗 가족 아카이브. 한 가족이 한 Space를 공유하고, 초대코드로만 들어온다.

이 파일은 새 세션이 시작될 때 가장 먼저 읽는 진입점이다. **이 파일과 `docs/`, `image-asset/`은 `docs` 브랜치에만 있고 `main`에는 없다**(아래 "브랜치 구조"). 클라우드 세션이라면 먼저 `docs/CLOUD_SESSION.md` §1의 부트스트랩을 실행해 이 파일들이 작업 트리에 붙어 있는지 확인한다.

- [docs/PRD.md](docs/PRD.md) — 제품 명세, 화면 구조, 데이터 모델 초안, 무료/프리미엄 경계
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 서버리스 스택(**확정 2026-10-01**), 인증·알림·결제·미디어 설계, 스택 검증 스파이크
- [docs/COST_GUARDS.md](docs/COST_GUARDS.md) — 금전 리스크 방어 게이트(불변 원칙). **기능 커밋마다 해당 게이트를 함께 만족해야 한다**
- [docs/PRIVACY_AND_LEGAL.md](docs/PRIVACY_AND_LEGAL.md) — 아동·건강(임신)·음성·고인 데이터 처리 설계
- [docs/DESIGN.md](docs/DESIGN.md) — 디자인 앵커·토큰·타이포·모션 (임의 변경 금지)
- [docs/design-research/](docs/design-research/) — 디자인 계승자 탐색 기록(검증 결과 포함)
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — 커밋 컨벤션, 브랜치·문서 커밋 정책, 세션 인수인계 규칙
- [docs/COMMIT_PLAN.md](docs/COMMIT_PLAN.md) — Phase별 커밋 청사진(체크박스는 진행 표시)
- [docs/CLOUD_SESSION.md](docs/CLOUD_SESSION.md) — 클라우드 세션 부트스트랩, API 키·환경변수 절차, 인수인계 체크리스트
- [docs/ENV_MANIFEST.md](docs/ENV_MANIFEST.md) — Phase별 필요한 키 목록(이름·형식·발급처)
- [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) — 아직 결정되지 않은 것, 검증이 필요한 가정
- [docs/PROGRESS.md](docs/PROGRESS.md) — 세션 인수인계 로그(현재 상태·다음 할 일·막힌 것)
- [docs/REPO_BOOTSTRAP.md](docs/REPO_BOOTSTRAP.md) — git 리포·`docs` 고아 브랜치·GitHub 리포 생성 절차(2026-10-01 수행 완료, 재현 참고용)
- `image-asset/` — 대화 중 생성한 로고·아이콘·토큰 **임시 후보**(확정 아님, DESIGN.md §1 참고)

## 현재 상태

스택 확정(2026-10-01, 스파이크 S-1~S-8 통과). Phase 0(디자인 토큰 이식 제외)은 main에 머지됨(PR woopinbell/bombyeol#2). Phase 1 서버 쪽(온보딩 UI 제외)도 main에 머지됨(PR woopinbell/bombyeol#3), 스테이징 `bombyeol-staging` 배포·실로그인 확인됨. Phase 2(미디어) 서버도 main에 머지됨(PR woopinbell/bombyeol#4, 스테이징 R2 스모크 통과). Phase 3(오늘) 서버도 main에 머지됨(PR woopinbell/bombyeol#5), 스테이징 배포·R2 스모크 통과. Phase 4(이야기) 서버도 main에 머지됨(PR woopinbell/bombyeol#6), 스테이징 배포·스모크 통과. Phase 5(우리·임신 기록) 서버는 작업 브랜치 `claude/compassionate-knuth-whf5li`에 구현·푸시, 설계 확인 후 머지 예정. 스파이크 코드는 `spike/s1-opennext-prisma` 참고용(머지 금지). 개발 코드 쪽 에이전트 규칙은 main의 `AGENTS.md`(Next.js가 관리하는 블록 — 코드 작성 전 `node_modules/next/dist/docs/` 확인)도 함께 읽는다. 실제 상태는 항상 `docs/PROGRESS.md`가 우선한다.

## 브랜치 구조 (사용자 결정, 2026-10-01)

- `main` — **개발 커밋만**. 문서·에셋·세션 로그·devlog는 여기에 커밋하지 않는다.
- `docs` — 고아(orphan) 브랜치. 이 파일, `docs/`, `image-asset/`, `devlog/`(있다면)가 여기 산다.
- 작업 트리에는 `docs` 브랜치를 `.docs/` 워크트리로 붙여 쓴다(`docs/CLOUD_SESSION.md` §1). 문서 수정은 **지시 없이 수시로 `docs` 브랜치에 커밋·푸시**한다(의미 단위, 세션 종료·전환 전 필수). `main`에는 절대 문서를 커밋하지 않는다.
- 세션을 끝내거나 옮기기 전에 `docs/PROGRESS.md`를 갱신하고 커밋·푸시한다(커밋하지 않은 수정은 클라우드 VM과 함께 사라진다). 푸시가 막히면 사용자에게 알린다.

## 절대 원칙 (재작업 방지용 고정 결정)

- **제품명**: 봄별. 영문·식별자는 `bombyeol`(폴더·패키지·리포). `bombyul` 표기는 쓰지 않는다.
- **스코프**: V1은 기능을 좁히지 않는다. 논의된 기능 전부(성장 기록·임신 기록·**반려동물 가족 구성원(2026-10-01 추가)**·이야기 아카이브·가족 캘린더·프리미엄 PDF 등)가 목표이고 `COMMIT_PLAN.md` 순서는 착수 순서일 뿐이다.
- **서버리스**: 상시 구동 서버·자체 WebSocket 서버를 두지 않는다. 별도 백엔드 서비스 없이 Next.js 단일 코드베이스 + tRPC.
- **디자인**: "AI가 만든 기본 프론트"를 피하고 `docs/design-research/`에서 검증한 계승자들의 원칙만 쓴다. 토큰(색·폰트·모션) 외의 값을 임의로 도입하지 않는다 — 필요하면 토큰 문서에 먼저 추가하고 갱신한 뒤 쓴다.
- **디자인 폴리시는 절대 완료 선언하지 않는다**: 체크리스트를 다 채워도 "완료"라고 보고하거나 문서에 종료 표시를 하지 않는다. 이 작업의 보고 시에는 dev 서버를 끄지 않고 켜둔 채로 보고한다.
- **스택 재논의 금지(확정 후)**: `ARCHITECTURE.md`의 스택은 §9 스파이크로 확정하기 전까지만 "잠정"이다. 확정 후에는 명백한 이유 없이 세션마다 다시 논의하지 않는다. 바꿔야 하면 사용자에게 먼저 확인.
- **비용 방어는 설계 제약이다**: `COST_GUARDS.md`의 게이트는 "나중에 하는 Phase"가 아니라 각 기능 커밋의 완료 조건이다.
- **개인정보**: 아동·임신·고인 데이터는 `PRIVACY_AND_LEGAL.md` 기준으로 처음부터 설계한다.
- **오픈 가입 금지**: 가입은 초대코드(또는 초대 링크) 경유만. 가족 Space 생성자는 로그인 후 만든다.
- **개발 커밋 방법론**: `docs/WORKFLOW.md`. `type(scope): 한국어 메시지`, 원자적 커밋, 동작 먼저·폴리시 나중.
- **환경변수**: 사용자에게 키를 요청하기 전에 `.env.example`(main)과 `docs/ENV_MANIFEST.md`에 이름·형식·발급처를 먼저 채운다. 키 값을 대화에 붙여넣게 하지 않는다(`docs/CLOUD_SESSION.md` §3).

## 하지 말 것

- 개발 커밋은 COMMIT_PLAN 단위로, 문서·에셋 커밋은 `docs` 브랜치에 **자율적으로** 한다. 단 GitHub 리포·계정·도메인·클라우드 리소스를 **새로 만드는 것**은 지시가 있을 때만.
- `main`에 문서·에셋·세션 기록을 섞지 않는다.
- 결제 공급자·호스팅 같은 미확정 항목을 `OPEN_QUESTIONS.md`를 확인하지 않고 구현하지 않는다.
- 대화에서 나온 레퍼런스 이름을 검증 없이 인용하지 않는다(일부는 사실과 달라 정정했다 — `docs/design-research/2026-10-01-successor-research.md`).
