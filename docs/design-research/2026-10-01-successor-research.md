# 디자인 계승자 탐색 - 검증 결과 (2026-10-01)

목적: 프로젝트 구상 대화에서 나온 레퍼런스를 웹 조사로 확인해 **실제로 근거가 있는 것만 앵커로 삼고**, 사실과 다른 것은 정정, 제외한다. "AI가 만든 기본 프론트"를 피하기 위해, 앵커마다 **무엇을 어디에 적용하는지**를 화면 단위로 연결한다.

조사 방법: 웹 검색 요약(1차 자료 전문 정독은 아님). 아래 "확인됨"은 검색 결과가 그 사실을 뒷받침했다는 뜻이고, "미검증"은 확인하지 못했다는 뜻이다. **1차 자료 정독은 첫 클라우드 세션의 디자인 리서치 작업으로 남긴다**(§7).

## 1. 대화의 주장 vs 검증 결과

| 대화의 주장 | 결과 | 비고 |
|---|---|---|
| 후카사와 "Without Thought"/슈퍼노멀 | **확인됨** | "Without Thought"는 무의식적 행동에 스며드는 디자인, Super Normal은 2006 Jasper Morrison과 시작한 프로젝트 [Wikipedia](https://en.wikipedia.org/wiki/Naoto_Fukasawa), [Fukasawa 공식](https://naotofukasawa.com/about/) |
| 토스 디자인 시스템, 한국어 타이포 리듬 | **부분 확인** | TDS와 **UX 라이팅 원칙(해요체, 능동형, 한 줄)** 은 확인 [토스 UX 라이팅](https://developers-apps-in-toss.toss.im/design/ux-writing.html)(2026-10-01 현재 404 - 내용은 `consumer-ux-guide.md`로 이동, 1차 자료 문서 §5), [토스 8가지 라이팅 원칙](https://toss.tech/article/8-writing-principles-of-toss). "타이포 리듬"은 라이팅이 아닌 시각 규칙이라 별도 확인 필요 |
| Josh Comeau 마이크로 인터랙션 | **확인됨** | 인터랙티브 설명 콘텐츠, *Whimsical Animations* 코스, 디즈니 12원칙 기반 SVG 마이크로 인터랙션 [Josh W. Comeau](https://www.joshwcomeau.com/animation/), [Whimsical Animations](https://whimsy.joshwcomeau.com/) |
| Maggie Appleton - 손그림 일러스트, 디지털 가든 | **확인됨** (설명 보정) | 일러스트를 곁들인 시각적 에세이와 디지털 가든을 운영, 디자인 엔지니어/연구자(GitHub Next). 그림 스타일이 "구술 아카이브"에 어울린다는 것은 **우리의 해석**이지 그의 주장이 아니다 [maggieappleton.com](https://maggieappleton.com/about) |
| **Emil Kowalski** - Sonner/Vaul, 미니멀 촉각 모션 | **확인됨** (소속 보정) | Sonner(토스트), Vaul(드로어) 제작, *Animations on the Web* 코스. **현재 Linear 디자인 엔지니어**, 이전 Vercel [animations.dev](https://animations.dev/) |
| **Rauno Freiberg(Vercel/Linear)** | **부분 정정** | **Vercel Staff Design Engineer**(Linear가 아님). cmdk 제작자, *Devouring Details*(인터랙션 디자인 23장+) [Raycast 스토리](https://www.raycast.com/community-stories/rauno-freiberg). **정정(2026-10-01 1차 자료 정독)**: interfacecraft.dev는 Josh Puckett의 유료 라이브러리로 Rauno와 무관 - `2026-10-01-primary-sources.md` §2 |
| Panic(파이어워치, Playdate) 노스탤직 톤 | **미검증** | Firewatch는 Campo Santo 개발, Panic 퍼블리싱으로 알고 있으나 이번에 검증하지 않았다. 톤 레퍼런스로 쓰려면 실제 작품, 제품을 확인한 뒤 채택 |
| StoryWorth / Artifact Uprising = 가족 구술사 → 실물 | **부분** | StoryWorth(주간 질문 → 답변 → 책)는 이 문제를 푸는 제품으로 알고 있음(이번에 재검증 안 함). **Artifact Uprising은 사진 인화, 포토북 제품**으로 알고 있어 구술사 제품이 아니다(미검증) - 포토북 플로우 참고용으로만 |
| **얼라이트(Alright Studio) - 토스, 배민 계열 한국형 프로덕트 디자인** | **근거 없음 → 제외** | 검색된 Alright Studio는 **뉴욕 브루클린의 전략, 크리에이티브 에이전시**이며 토스, 배민 작업 근거 없음 [alright.studio](https://alright.studio/). 한국 제품 디자인 레퍼런스는 토스(TDS), 배민 등 **직접 확인 가능한 것**으로 대체 |
| 오디너리피플 - 프릳츠, 몬스터플라워 브랜딩 | **부분 확인** | 오디너리피플은 2006년 창립, 서울, 뉴욕 기반 브랜딩, 아트 디렉션 스튜디오 [ordinarypeople.info](https://ordinarypeople.info/about). **프릳츠, 몬스터플라워 작업은 검색으로 확인하지 못함** - 인용하지 않는다 |
| 스튜디오 fnt - 편집/출판 감성 | **부분 확인** | 2006년 창립 서울 그래픽 디자인 스튜디오(메가박스, JTBC 브랜딩, MMCA 아이덴티티 등). 그래픽, 인쇄 강점은 맞으나 "책자 편집 톤" 근거는 약함 [studio fnt](https://studiofnt.com/About), [BP&O](https://bpando.org/2018/04/11/studio-showcase-studio-fnt/) |
| 온글잎(산돌) 시리즈, '이는', '박다현체' | **부분 정정** | 온글잎은 **폰트 제작 서비스가 종료**됐다는 공지가 있다 [ownglyph.com](https://www.ownglyph.com/). 민혜체, 보현체 등 샘플 폰트는 **상업적 사용 가능**(폰트 자체 판매, 수정 금지)이라는 자료 [산돌구름 민혜체](https://www.sandollcloud.com/free-font/16943/Ownglyph-MinhyeChae), [눈누 보현체](https://noonnu.cc/font_page/662). '이는', '박다현체'의 라이선스, 웹폰트 여부는 **미확인** |
| Pretendard | 기존 검증(hamkke) | 라이선스(OFL)는 Phase 0에서 재확인 |

## 2. 신규 후보 (대화에 없던 것)

| 후보 | 근거 | 적용 |
|---|---|---|
| **Benji Taylor** (Family 지갑 앱, Honk 제작, 현재 X 디자인 리드로 보도) | "복잡함은 필요할 때만 나타난다", 화면 이동이 물 흐르듯 이어지는 유동성 [benji.org](https://benji.org/) 등 | 시트, 트레이 전환의 연속성. 모션 참고 한정(제품 도메인은 다름) |
| **KWCAG 2.2**(한국형 웹 콘텐츠 접근성 지침), WCAG 2.2 | 어르신 사용성의 객관 기준 | DESIGN §8 접근성 게이트. 세부 조항은 첫 세션에서 원문 확인 |
| Apple HIG Dynamic Type / Material 3 Expressive | hamkke 연구에서 채택(표현적 디자인이 연령 무관하게 탐색 속도 향상) | 글자 크기, 위계. `material-web`은 유지보수 모드 → 원칙만 채택 |
| Between, 썸원, Honk 등 커플/관계 앱 | hamkke 연구(2026-09-27) 참고 | 한 번에 한 초점, presence - 가족 앱에 맞게 재해석 |

## 3. 화면별 계승 매핑

| 화면, 요소 | 계승자 | 구체적으로 가져올 것 | 버릴 것 |
|---|---|---|---|
| 전체 골격, 온보딩(어르신) | 후카사와 + 토스 | 설명 없이 쓰는 한 화면 한 행동, 해요체 짧은 문구 | 학습이 필요한 제스처, 전문용어 |
| 오늘(봄) 마일스톤, 성장 | Josh Comeau | 달성 순간의 작은 애니메이션(스프링), 쌓이는 시각화 | 상시 움직이는 장식, 캐릭터 남발 |
| 이야기(별) 질문 카드, 빈 화면 | Maggie Appleton + StoryWorth | 손그림 일러스트 빈 상태, 정원처럼 자라는 기록 은유, 질문→답변 흐름 | 일러스트 과다(어르신 가독성 저하) |
| 시트, 토스트, "별 하나" 전달 | Emil Kowalski, Rauno Freiberg, Benji Taylor | 바텀시트 드래그, 스냅, 절제된 토스트, 1비트 신호의 촉각적 피드백 | 모션을 위한 모션 |
| PDF 책자 | StoryWorth, 한국 편집 디자인(스튜디오 fnt 등 참고 후보) | 큰 글자, 넉넉한 여백, 목차 | 화려한 템플릿 |
| 접근성 | 후카사와 + KWCAG/WCAG | 대비, 크기, 터치 타깃 | - |

## 4. 한국 로컬 레퍼런스 - 정리

- 채택 확정: **토스**(TDS, UX 라이팅). 근거 확인.
- 참고 후보(부분 확인): 오디너리피플(브랜딩, 아트 디렉션), 스튜디오 fnt(그래픽, 인쇄).
- 제외: 얼라이트(근거 없음).
- 조사 필요(미검증 후보): 배달의민족(우아한형제들)의 브랜드 서체, 디자인 시스템, 당근의 제품 디자인, 카카오/네이버 어르신 대상 UX 사례. **첫 클라우드 세션의 리서치 작업으로 넘긴다.**

## 5. 폰트 결정에 필요한 확인 (미해결)

1. 후보 손글씨(아이용 둥근 체 / 조부모용 차분한 체) 각각: 라이선스(웹폰트, 앱 임베딩, PDF 임베딩 포함 여부), 한글 완성형 커버리지, 파일 용량, 배포처.
2. 온글잎 종료 이후 산돌구름 등에서 계속 받을 수 있는지.
3. hamkke가 쓴 Gaegu는 영문, 한글 커버리지가 다르므로 재사용 여부 판단.
4. PDF 클라이언트 생성(S-7)과 폰트 임베딩 호환.

→ 확정 전까지 손글씨는 쓰지 않는다(DESIGN §4).

## 6. 정직한 한계

- 검색 요약에 기반하며, 앵커별 **원칙의 세부는 1차 자료를 읽지 않았다**. 그래서 화면 규칙에 "그의 원칙"을 인용하기보다 "우리가 어떻게 적용하는가"를 적었다.
- 이 조사에서 확인되지 않은 항목은 앵커로 승격하지 않았다.

## 7. 다음 세션(클라우드 초반)의 디자인 리서치 작업

> 2026-10-01 수행 → [`2026-10-01-primary-sources.md`](2026-10-01-primary-sources.md). 화면 규칙은 `DESIGN.md` §9.

- [x] Emil Kowalski, Rauno Freiberg 1차 자료(Devouring Details, animations.dev 공개 글)에서 시트, 토스트, 이징 규칙을 뽑아 `DESIGN.md` §5 모션 토큰에 반영
- [ ] Maggie Appleton 일러스트 스타일 분석 → 봄별 빈 화면 일러스트 방향(직접 그릴지, 생성할지, 미사용할지는 사용자 결정)
- [ ] Josh Comeau 마이크로 인터랙션 중 채택할 3개 이내 선정
- [ ] 한국 제품, 서체 레퍼런스(§4 미검증 후보) 조사
- [ ] 어르신 UX 가이드(KWCAG 2.2, 공공 가이드) 원문 확인 → 체크리스트화
- [ ] 화면 목업을 스크린샷으로 사용자에게 먼저 확인받기(구조 변경 제안 원칙)

Sources:
- [Naoto Fukasawa - Wikipedia](https://en.wikipedia.org/wiki/Naoto_Fukasawa)
- [토스 UX 라이팅](https://developers-apps-in-toss.toss.im/design/ux-writing.html)
- [Josh W. Comeau - Animation](https://www.joshwcomeau.com/animation/)
- [Maggie Appleton](https://maggieappleton.com/about)
- [animations.dev - Emil Kowalski](https://animations.dev/)
- [Raycast: Rauno Freiberg](https://www.raycast.com/community-stories/rauno-freiberg)
- [Alright Studio](https://alright.studio/)
- [Ordinary People](https://ordinarypeople.info/about)
- [studio fnt](https://studiofnt.com/About)
- [온글잎](https://www.ownglyph.com/)
