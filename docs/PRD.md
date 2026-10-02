# Bombyeol - 제품 명세 (PRD)

## 1. 한 줄 정의

손주의 **봄**(자라나는 오늘)과 조부모의 **별**(살아온 기억)을 이어주는, 세대 간 프라이빗 가족 아카이브.

hamkke가 "시차 있는 두 연인이 한 화면에서 만난다"였다면, 봄별은 같은 설계 원리를 세대 축으로 옮긴다 - 서로 다른 시간대를 사는 두 세대가 같은 가족 공간에서 마주친다.

| | 봄 (자녀, 손주 세대) | 별 (부모, 조부모 세대) |
|---|---|---|
| 시간성 | 지금, 찰나, 빠르게 지나감 | 과거, 영속, 천천히 빛남 |
| 콘텐츠 | 오늘의 성장, 일상(사진, 마일스톤, 임신 기록) | 살아온 기억, 이야기(텍스트 우선, 음성은 후속) |
| 정서 | "이만큼 컸어요" | "그땐 이랬단다" |

## 2. 핵심 컨셉 - Space(가족)

- **한 가족 = 한 Space**. 그 안에 **여러 아이(Child)와 반려동물(Pet)** 이 가족 구성원으로 있고, 조부모는 한 번 초대되어 모든 손주, 반려동물에 접근한다. 반려동물은 계정이 없는 '가족 구성원'이며 사람이 대신 기록한다.
- 구독은 **Space 단위**(User 아님). 한 명이 결제하면 가족 전체가 혜택.
- 오픈 가입/검색/추천 없음. 초대코드(6자리, TTL) 또는 초대 링크로만 합류. 링크는 카카오톡 공유하기로 보낸다.
- 역할(Member.role): `parent`(관리자 권한: 초대, 아이 관리, 결제, 삭제), `grandparent`(어르신: 열람, 댓글, 이야기 작성), `relative`(삼촌, 이모 등: 열람, 댓글). 관계 표시명(할머니/외할아버지 등)은 Member.relationLabel로 자유 입력.
- 한 사용자가 여러 Space에 속할 수 있다(양가 조부모). **사용자당 Space 수에 상한**을 둔다(`COST_GUARDS.md` G-11).
- 무료 티어: 부모 2 + 조부모 최대 4(양가) + 기타 초대는 프리미엄 - 수치는 §5 초안 참고(확정 아님).

## 3. 정보구조 - 하단 3탭 (hamkke 구조 계승, 시안 확정은 DESIGN.md)

| 탭 | 역할 | 주요 내용 |
|---|---|---|
| **오늘 (봄)** | 아이, 반려동물의 오늘 | 사진, 영상 피드, 마일스톤(키, 몸무게, 첫 걸음 등), 부모의 짧은 일기, 임신 기록(태명 시절), 반려동물의 일상, 성장 기록 |
| **이야기 (별)** | 어르신의 기억 | 인터뷰 질문 카드 → 텍스트 답변(음성은 후속), 사진에 얽힌 이야기, 고인의 이야기 보존 |
| **우리** | 가족 전체 조망 | 생일, 기념일 캘린더, 세대별 프로필, 다음 가족 모임 D-day, 초대, 설정 진입 |

**교차 지점(시그니처 인터랙션)**: 아이의 사진에 조부모가 "그땐 이랬단다"를 달거나, 조부모의 옛날 사진에 손주가 반응하는 순간. hamkke의 "터치"에 해당하는 봄별만의 1비트 신호(가칭 **"별 하나"**)를 두고, 이름, 동작은 DESIGN.md 시안 단계에서 확정한다.

화면 원칙: 화면당 하나의 초점, 상세는 시트, 어르신 기본 글자 크기는 크게(DESIGN.md §접근성). 구조 변경 제안은 스크린샷으로 먼저 확인받는다.

## 4. 기능 명세

### 4.1 가입, 초대, 역할
- 로그인: **카카오**(조부모 세대 기본 경로) + **Google**. 이메일 매직링크는 V1에 두지 않는다(메일 폭탄, 도메인 평판 리스크 제거 - `COST_GUARDS.md` G-07). Apple은 iOS 착수 시.
- 온보딩: 부모가 가족 Space 생성 → 아이 프로필 등록(태명/이름, 출생 예정일 또는 생일) → 조부모 초대 링크, 코드 발급 → 카카오톡 공유하기.
- 어르신 온보딩은 **한 화면에 한 가지**, 큰 글씨, 카카오 로그인 한 번(이메일 입력 없음)이 목표.
- 초대 brute-force 방지(`InviteCodeAttempt`, DB 기반 - hamkke 방식 계승).

### 4.2 오늘 (봄)
- **성장 피드**: 사진, 짧은 영상(길이, 용량 상한 - G-01), 촬영일 기준 정렬, 아이별 필터.
- **마일스톤**: 키, 몸무게, 첫 뒤집기/첫 걸음/첫 단어 등 프리셋 + 자유 입력. 아이 나이 기반 제안.
- **부모 일기**: 짧은 텍스트. 사진과 묶어 기록.
- **임신 기록(태명 시절)**: 태명 프로필, 출생 예정일, 주차 자동 계산, 초음파 사진, 짧은 메모, 태동, 검진 일정. **건강 관련 민감 정보** - 열람 범위를 Space 멤버 중 부모가 고른 대상으로 한정하는 옵션과 명시적 동의가 필요(`PRIVACY_AND_LEGAL.md` §3). 출생 후 프로필이 "임신 중 → 출생"으로 전환되며 기록은 유지.
- 아이별 좋아요, 댓글(가족 멤버만).

### 4.2.1 반려동물 (2026-10-01 결정 - V1부터 가족 구성원)
- **Pet 프로필**: 이름, 종(강아지, 고양이, 기타 자유 입력), 품종(선택), 생일(모르면 추정일), **입양일(우리 가족이 된 날)**, 사진. 계정이 없으므로 `parent`/가족 멤버가 대신 기록한다.
- 사진, 영상 피드와 일기는 아이와 같은 `Moment`를 쓰고 대상만 고른다(아이 / 반려동물 / 가족 전체).
- **마일스톤(반려동물용 프리셋)**: 입양일, 첫 산책, 체중 변화, 예방접종, 병원 방문 메모 등. **의료 기록 관리(투약 알림, 진료 연동)는 V1 범위 밖의 후속**이며, V1에서는 자유 메모와 체중 수치까지만 둔다(건강 앱 경계, 의료 규제를 피하기 위한 제약).
- 기념일: 입양기념일, 생일을 가족 캘린더에 자동 등록(조회 시점 계산).
- 이야기(별) 탭과 연결: 어르신이 "옛날에 우리 집 강아지" 같은 이야기를 반려동물 프로필에 붙일 수 있다.
- **무지개다리 기념 상태**: 반려동물이 세상을 떠나면 프로필을 기념 상태로 전환(§4.5)한다.

### 4.3 이야기 (별)
- **질문 카드**: 큐레이션된 인터뷰 질문(예: "어린 시절 살던 동네는 어땠어요?", "손주가 태어난 날 기억나세요?"). 카테고리(어린 시절/일/가족/음식/명절...). 부모가 어르신께 특정 질문을 골라 "물어보기"(푸시, 공유 링크).
- **답변 입력: 텍스트 우선**. 어르신 부담을 줄이기 위해 (a) 어르신 본인 입력, (b) 가족이 대필, 받아쓰기해 "○○ 어르신 말씀"으로 기록(작성자, 대필자 병기)을 모두 지원. 음성 답변, 전사는 **프리미엄/후속**(`ARCHITECTURE.md` §8, 비용 게이트 G-14 선결).
- **사진에 얽힌 이야기**: 옛날 사진 한 장에 이야기를 붙이는 형식(가장 쉬운 진입점).
- **교차 반응**: 손주, 자녀가 이야기에 반응/질문을 남기고 어르신이 답한다(별 하나 등).
- **이야기 모음**: 카테고리, 시기별로 모인 아카이브. 프리미엄 PDF 내보내기의 원본.

### 4.4 우리
- **가족 캘린더**: 생일, 기념일, 가족 모임. UTC 저장 + 로컬 표시(hamkke 방식). 정시 push 스케줄러는 없다 - 조회 시점 계산(pull) 원칙 계승, 정시 알림이 필요하면 별도 결정(`OPEN_QUESTIONS.md`).
- **세대별 프로필**: 멤버 목록, 역할, 관계 표시명 관리.
- **다음 가족 모임 D-day**.
- 설정 시트: 알림, 글자 크기, 언어(구조만), 계정, Space 삭제(G-06).

### 4.5 별이 되신 가족 (고인, 반려동물 - V1 포함)
- 어르신 프로필을 **"기념" 상태**로 전환(부모/관리자가 유가족 동의 하에). 기념 상태의 프로필: 이야기, 사진 **영구 보존**, 새 이야기 작성 불가, 가족의 추모 반응만 가능, 기일 카드(조회 시점 계산).
- **구독이 만료되어도 이야기는 삭제하지 않는다**(읽기 전용, 다운로드 가능 상태로 유지). 이 원칙은 §5 게이팅 설계의 상위 제약.
- **반려동물의 기념 상태("별이 된" 반려동물)**: 사람과 같은 규칙. 프로필을 기념으로 전환하면 기록은 영구 보존되고 새 일상 기록은 막되 추모 반응, 사진 추가(추억)는 허용한다. 기일은 조회 시점 카드로 보여준다. 전환은 `parent`가 하고 되돌릴 수 있다.
- 계정 승계(고인의 로그인 계정)는 다루지 않는다 - 콘텐츠는 Space 소유이고 계정은 별개(`PRIVACY_AND_LEGAL.md` §5).

### 4.6 알림
- **웹푸시(FCM)**: Android/데스크톱은 그대로, **iOS는 홈 화면에 추가한 PWA에서만** 동작(iOS 제약). 따라서 iOS 어르신에게는 신뢰할 수 없는 채널이다.
- **공유 링크 메시지**: 카카오톡 "공유하기"(사용자가 직접 보내는 방식, 서버 비용 0)로 초대, "물어보기", 새 사진 알림을 대체 전달.
- 알림톡/친구톡 등 건당 과금 채널은 사용하지 않는다(G-16).
- 알림 종류: 새 사진/이야기, 내 이야기에 반응, 질문 도착, 기념일 조회 시점 카드.

### 4.7 프리미엄
- 스페이스 단위 구독. 결제 공급자는 **미정**(`OPEN_QUESTIONS.md` Q-PAY, Stripe는 한국 사업자 계정 불가 가능성이 확인되어 재결정 필요).
- 게이팅 후보: 저장 용량, 영상 길이, 개수, 초대 인원(삼촌, 이모 등 확장), **이야기 PDF 다운로드**(책자), 음성 답변(후속).
- 게이팅 원칙: (1) 이미 저장된 가족의 기억은 어떤 상태에서도 삭제하지 않는다, (2) 한도 초과 시 새 업로드만 막고 열람, 다운로드는 유지, (3) 한도 80%부터 안내, (4) 모든 한도는 서버에서 검증(클라이언트 신뢰 금지).

### 4.8 언어
- 처음부터 **next-intl 구조**, 출시는 한국어만. 문구는 키 참조, 하드코딩 금지(hamkke의 `no-hardcoded` 테스트 계승). 새 언어 = 문구 파일 추가.

## 5. 무료/프리미엄 경계 (초안 - 수치는 미정, 비용 역산 후 확정)

| 항목 | 무료(초안) | 프리미엄(초안) | 근거 |
|---|---|---|---|
| Space당 저장 | 2GB | 50GB | R2 약 $0.015/GB/월, egress 무료. 프리미엄에도 상한 필수 |
| 사진 원본 상한 | 10MB/장 | 20MB/장 | G-01 |
| 영상 | 30초, 50MB, 월 N개 | 2분, 200MB | 전송, 저장비 급증 요소 |
| 초대 인원 | 부모2 + 조부모4 | 삼촌, 이모 등 최대 20명 | 인원 확장 게이팅 |
| 아이, 반려동물 수 | 아이 3 + 반려동물 3 | 각 10 | G-11 남용 방지(수치 초안) |
| 이야기 PDF | 미리보기만 | 전체 다운로드 | 생성 CPU, 저장 |
| 음성 답변 | 없음 | 후속 | STT 비용 |

수치는 `ARCHITECTURE.md`의 비용 모델과 실제 단가 확인 뒤 `src/lib/plan.ts` 한 곳에서만 정의(hamkke 패턴 계승).

## 6. 데이터 모델 (초안)

```
User(id, name, image, locale, createdAt)                      // Auth.js 어댑터 필드 우선
Account/Session(...)                                          // Auth.js (카카오, Google)
Space(id, name, createdAt, deletedAt?)                        // = 가족
Member(id, spaceId, userId, role, relationLabel, joinedAt)    // unique(spaceId,userId)
Invite(id, spaceId, code, role, expiresAt, usedAt?, createdById)
InviteCodeAttempt(id, userId, ip, createdAt)                  // 실패 기록만
Child(id, spaceId, name?, nickname?, dueDate?, birthDate?, status) // expecting|born
Pet(id, spaceId, name, species(dog|cat|other), speciesLabel?, breed?, birthDate?, birthDateEstimated, adoptedAt?, passedAt?, status, coverAssetId?) // living|memorial
PregnancyRecord(id, childId, weekAt, kind, note?, mediaId?, visibility, createdById)
Moment(id, spaceId, childId?, petId?, kind(media|diary), body?, takenAt, createdById) // childId, petId는 동시에 채우지 않는다(둘 다 비면 가족 전체, 체크 제약)
MomentMedia(momentId, position, assetId UNIQUE, thumbnailAssetId? UNIQUE) // 첨부 최대 10, 자산은 한 곳에만
MediaAsset(id, spaceId, key, kind, bytes, contentType, status(pending|confirmed|deleted), createdAt, confirmedAt?) // G-02, G-05
Milestone(id, spaceId, childId?, petId?, kind, value(Json), recordedAt, createdById) // 정확히 하나만 채운다(체크 제약), kind는 src/lib/milestones.ts 프리셋
// StoryPrompt는 DB 모델이 아니라 코드 카탈로그(src/lib/story-prompts.ts: key → category), 문구는 messages story.prompts.<key>
StoryEntry(id, spaceId, narratorMemberId?, narratorName?, narratorLabel?, scribeMemberId?, scribeName?, promptKey?, category?, title?, body, storyYear?, petId?, photoAssetId? UNIQUE, createdById) // 화자, 대필자는 Member FK(SetNull) + 이름 스냅샷
StoryAsk(id, spaceId, askedById, toMemberId, promptKey?, question?, entryId? UNIQUE)  // 물어보기: 카드, 질문 중 정확히 하나, 답하면 entryId
Reaction(id, spaceId, momentId?, milestoneId?, storyEntryId?, kind(like|comment|star), body?, createdById, createdAt) // 대상별 FK 중 정확히 하나(체크 제약). like는 오늘 기록, star(별 하나)는 이야기
FamilyEvent(id, spaceId, title, startsAt, allDay, recurring, kind)
MemorialProfile(id, spaceId, memberId? UNIQUE, petId? UNIQUE, name?, relationLabel?, passedAt?, note?, createdById)  // 기념 상태(사람 또는 반려동물), 행 삭제 = 되돌리기
Subscription(id, spaceId UNIQUE, provider, providerSubscriptionId, status, currentPeriodEnd, ...) // G-09: spaceId 기준 upsert
UsageCounter(spaceId, periodKey, uploadUrlsIssued, bytesStored, pdfExports, ...)                 // G-03, G-04
PushToken(id, userId, token, platform, createdAt)
DeletionRequest(id, subjectType, subjectId, requestedById, status, requestedAt, completedAt?)   // G-06
```

주의: hamkke에서 `Subscription.spaceId @unique` + `stripeSubscriptionId` 기준 upsert가 재구독 때 충돌한 문제를 처음부터 피한다 - 구독 행은 `spaceId`를 키로 upsert하고 공급자 구독 ID는 갱신 필드로 둔다.

## 7. 구현 순서 제안 (스코프 컷이 아님)

`COMMIT_PLAN.md` 참고. 대략: 스파이크 → 부트스트랩 → 인증, Space, 초대 → 미디어 업로드 파이프라인(비용 게이트 포함) → 오늘(봄) → 이야기(별) → 우리 → 알림 → 삭제, 개인정보 → 결제 → PWA, 릴리스 → Android 패키징 → 디자인 폴리시(상시 개방).
