# Bombyeol — 진행 상황 (세션 인수인계 로그)

새 세션은 `CLAUDE.md` 다음으로 이 파일을 읽는다. 세션을 끝내거나 옮기기 전 Claude가 갱신하고 `docs` 브랜치에 커밋·푸시한다(자율, `WORKFLOW.md` §4).

## 현재 상태 (2026-10-01)

- 단계: **기반 문서 작성 완료, 리포 부트스트랩 완료(2026-10-01), 코드 없음.** GitHub private 리포 `woopinbell/bombyeol` 생성, `main`(빈 초기 커밋 9744db2)·`docs`(고아, 8621748) 푸시 완료. 클라우드 환경은 사용자가 claude.ai/code에서 만든다(허용 도메인 Custom, 개발용 키만). 첫 세션 프롬프트는 `docs/CLOUD_SESSION.md` §4.
- 결정 완료(사용자): 식별자 `bombyeol` / 서버리스 재선정 / 웹·PWA 우선 후 Android / 새 GitHub private 리포 + `docs` 고아 브랜치 / 비용 방어는 설계 제약 / 개인정보 초기 설계 / 텍스트 우선·음성 후속 / 가족 1 Space 안에 여러 아이 / 카카오+Google 로그인 / Cloudflare 검토 / next-intl(한국어만 출시) / 임신 기록·고인 처리 V1 포함 / PDF 다운로드 프리미엄 / 웹푸시 + 카카오톡 공유 / devlog는 docs 브랜치에만 / hamkke 절대 원칙 4종 계승.
- 미해결: `OPEN_QUESTIONS.md` (특히 **Q-PAY 결제 공급자 재결정**).

## 다음 할 일

1. ~~리포 부트스트랩~~ 완료. 주의: 루트 심볼릭 링크 `docs`와 브랜치 `docs`의 이름이 겹쳐 `git log docs`가 모호 오류를 낸다 → 브랜치는 `refs/heads/docs`(또는 `.docs/`에서 `git -C .docs ...`)로 참조한다.
2. (사용자) 클라우드 환경 생성(리포 `woopinbell/bombyeol`). 스파이크 전에 필요한 키(`ENV_MANIFEST.md` Phase S)는 Claude가 세션에서 정확히 요청한다.
3. 첫 클라우드 세션: 부트스트랩 검증 V-1~V-5 → 스택 스파이크 S-1~S-8 → 결과로 `ARCHITECTURE.md` 확정 → Phase 0(토큰 이식 제외).
   **디자인은 Kaddie가 먼저**(2026-10-01 결정): 봄별은 기술 스파이크만 병행하고, Phase DS(로고·폰트·목업·토큰)는 Kaddie 디자인이 자리 잡은 뒤 진행.
4. 첫 세션에서 디자인 리서치 §7 병행.

## 스파이크 결과 (기록란)

| ID | 결과 | 날짜 |
|---|---|---|
| S-1 ~ S-8 | 미수행 | — |

## 미완료 검증 항목

- (없음 — 코드 없음)

## 임시 완화한 게이트 (`TODO(G-xx)`)

- (없음)

## 세션 로그

- 2026-10-01: 구상 대화 정리, hamkke 구조·점검 결과 분석, 디자인 계승자 웹 검증, 스택 조사, 기반 문서 작성. 문서·에셋 커밋은 아직 없음(사용자 지시 대기).

- 2026-10-01(후속): 사용자 지시로 리포 부트스트랩 수행(main 초기 커밋, docs 고아 브랜치 커밋, GitHub private 리포 생성, 두 브랜치 푸시). 이 PROGRESS 갱신은 아직 커밋하지 않음(지시 대기).

- 2026-10-01(정정): 리포를 잘못된 계정(seungwoo7050)에 만들어 `woopinbell/bombyeol`(private)로 다시 생성·푸시. 옛 리포는 사용자가 삭제.

- 2026-10-01(추가 결정): 반려동물을 V1부터 가족 구성원(Pet)으로 포함. PRD §2·§4.2.1·§4.5·§5·§6, COMMIT_PLAN Phase 3·4·5, COST_GUARDS G-11, PRIVACY §1, CLAUDE.md 스코프 갱신. 의료 기록 관리(투약 알림 등)는 후속으로 분리.
- 2026-10-01(추가 결정): 봄별 디자인은 Kaddie 이후. COMMIT_PLAN에 Phase DS와 진행 순서 메모 추가.
- 2026-10-01(정책 변경): 문서 브랜치가 분리되어 있으므로 docs 커밋은 지시 없이 수시로 자율 수행(main 금지). WORKFLOW §4, CLAUDE.md, CLOUD_SESSION 개정.
