# Q-PAY 결제 공급자 조사 (결정 문서)

- 조사일: 2026-10-01 (모든 "확인"은 이 날짜 기준)
- 범위: 조사만. 구현 없음. **결정은 사용자.**
- 표기: 출처 URL이 있는 것만 사실로 적었다. 공식 본문을 직접 못 봤거나 검색 요약에만 의존한 것은 "미확인" 또는 "(검색 요약)"으로 표시했다.

## 1. 목적·결론 요약

봄별은 Space 단위 월/연 정기구독(+선택적 단건 "책")을 받아야 한다. Stripe는 한국 사업자 계정 불가로 제외됐다(`docs/OPEN_QUESTIONS.md` Q-PAY). 남은 길은 (a) 국내 PG, (b) 해외 MoR, (c) 무료 출시 후 결제 후속이다.

**추천 후보 (결정은 사용자):**

1. **조건 A — 개인사업자를 등록할 의향이 있다면: 포트원 V2 + 토스페이먼츠.**
   - 이유: 카드·계좌 빌링키 정기결제, 간편결제(토스페이·네이버페이·카카오페이) 폭이 넓고, 원화로 정산한다. 포트원은 "결제 예약 API"로 청구 시각을 포트원 쪽에 맡길 수 있어 Cloudflare Cron만 있는 우리 구조와 잘 맞는다(§5).
   - 대가: 사업자등록, 통신판매업 신고, 자동결제 별도 심사·계약, 부가세·소득 신고를 직접 처리해야 한다.
2. **조건 B — 사업자 등록을 피하고 싶다면: Paddle(차선 Polar).**
   - 이유: MoR이라 해외 세금·한국 부가세 처리를 대행한다. 개인(Individual)도 가입 가능하다고 안내한다. 한국 로컬 카드·카카오페이·네이버페이를 지원한다.
   - 대가: 수수료 5% + 50¢ 고정, 정산은 외화(검색 요약 기준). 한국 거주 개인이 세무상 어떻게 신고해야 하는지는 이 조사로 확인하지 못했다(세무사 확인 필요).
3. **(c) 무료 출시 후 결제 후속**은 항상 가능한 안전판이다. 결제 코드가 없으면 G-07·G-09 부담이 없고, Q-LAUNCH가 "본인 가족만"이면 가장 싸다.

Lemon Squeezy는 Stripe 인수 후 신규 도입 비추천(§4.5).

## 2. 선결 질문

| # | 질문 | 영향 |
|---|---|---|
| 1 | 개인사업자(또는 법인)를 등록할 계획인가? | 토스페이먼츠 PG 계약은 **사업자만 가능**(아래 출처). 아니면 B 또는 (c) |
| 2 | 공개 출시 시점은? (Q-LAUNCH) | 본인 가족용이면 (c)로 충분 |
| 3 | 단건 "책" 판매를 구독과 함께 할 것인가? (Q-PRICE) | 단건은 PG 일반결제 또는 MoR 일회성 상품으로 모두 가능하나, 구독 심사와 별개로 약관 필요 |
| 4 | Android 앱 배포 시 앱 안에서 디지털 구독을 팔 것인가? | Google Play 결제 의무 문제(§6) |
| 5 | 원화 정산이 필수인가, 외화 정산 + 환전 감수 가능한가? | PG vs MoR |
| 6 | 세무 처리 책임을 누가 질 것인가? | 세무사 상담 필요(이 문서 범위 밖) |

## 3. 비교표

| 항목 | 토스페이먼츠 | 포트원 V2 (PG 위 오케스트레이션) | Paddle | Polar.sh | Lemon Squeezy |
|---|---|---|---|---|---|
| 한국 셀러 자격 | 사업자만(개인사업자/법인) [T1] | 포트원 자체는 PG 계약 별도 필요 [P3] | 개인·사업자 가능, 한국 사업자등록증 사례 있음 [D2][D3] | 한국 지급 지원 국가 목록에 포함 [L1] | 해당 없음/비추천 [S1] |
| 통신판매업 | 신고 미완료로도 PG 신청 가능, 이후 정부24 신고 필요 [T2] | PG 따름 | 해당 없음(MoR) — 미확인 | 해당 없음 — 미확인 | — |
| 정기결제 심사 | **리스크 검토 + 추가 계약 필요**, 구독형 업종 한정 [T3] | 정기결제는 PG별 계약 필요(토스는 위 [T3]) [P4] | 기본 제공(구독 객체) | 기본 제공 | — |
| 카드 수수료 | 일반 3.4% [T4] (협의/영세 요율은 미확인) | 포트원 이용료 월 순거래 5,000만원 미만 무료 + PG 수수료 별도 [P3] | 5% + 50¢ [D1] (10달러 미만 상품은 별도 협의) | Starter 5% + 50¢, 해외카드 +1.5%, 유료 플랜은 더 낮음 [L2] | 5% + 50¢ [S1] |
| 가입비/연관리비 | 가입비 22만원(1회), 연 11만원 (계약형태별 상이) [T4] | 포트원 추천패키지 가입비 무료 프로모션 2024-06-30 종료 [P3]; PG 쪽 비용은 PG 따름 | 없음 [D1] | 없음(플랜 월 $0~400) [L2] | — |
| 정산 | 평균 5일 이내(원화 추정, 통화 명시는 미확인) [T4] | PG 따름 | 외화(USD/EUR/GBP/AUD/CAD) (검색 요약) [D4] | Stripe Connect Express로 지급, 출금 수수료 별도 [L1][L2] | — |
| 구독 방식 | 빌링키 + **가맹점이 직접 스케줄** [T3] | 빌링키 + 결제 예약 API(포트원이 시각에 실행 후 웹훅) [P5] | 네이티브 구독 | 네이티브 구독 | 네이티브 |
| 웹훅 서명 | HMAC-SHA256 헤더는 payout/seller 이벤트에 한함. 결제는 조회 재확인 방식 권장(아래 4.1) [T5] | Standard Webhooks(secret 서명), 5회 지수 재시도 [P1] | `Paddle-Signature` HMAC-SHA256 (ts:h1) [D5] | 미확인 | 미확인 |
| 테스트 모드 | 샌드박스 있음 [T3] | 미확인(공식 확인 못 함) | 미확인(샌드박스 존재 여부 직접 확인 못 함) | 미확인 | — |
| 결제수단 | 카드, 계좌(빌링키는 카드·계좌만); 간편결제는 별도 승인 [T3][P4] | PG에 따름(토스, 카카오, 네이버, KG, KCP, 나이스 등 연동) [P2] | 한국 로컬 카드 22+, 네이버페이, 카카오페이, 삼성페이, 페이코 (검색 요약) [D6] | 미확인 | — |
| Workers 적합 | REST + 시크릿 키 Basic 인증 가정 — fetch로 가능하나 미확인 | REST API, 서버 SDK 외 fetch 가능 가정 — 미확인 | REST API + 웹훅(HMAC는 WebCrypto 가능) | REST + 웹훅 | — |

## 4. 후보별 상세

### 4.1 토스페이먼츠 (자동결제/빌링)
- **자격**: 사업자만 PG 계약 가능, 개인사업자는 사업자등록증+대표자 신분증 [T1]. 통신판매업 신고 전에도 신청은 가능하나 이후 신고 필요 [T2]. (T1·T2는 검색 요약이며 공식 가입 페이지 본문은 확인하지 못함.)
- **자동결제**: "리스크 검토 및 추가 계약 후 사용" 가능, 구독형 업종 한정 [T3]. **스케줄은 가맹점 책임**이며 토스가 실행해 주지 않는다 [T3]. 빌링키 발급 → 고객-빌링키 매핑 저장 → 주기에 맞춰 승인 API 호출.
- **간편결제 빌링**: 네이버페이·토스페이는 별도 승인 하에 지원 [T3]. 카카오페이 정기결제 여부는 미확인.
- **수수료**: 카드 3.4%(공시 일반), 가입비 22만원, 연관리비 11만원, 정산 평균 5일 [T4]. 정기결제 전용 요율은 페이지에 없음 → 미확인(영업 문의 필요).
- **웹훅**: `PAYMENT_STATUS_CHANGED`, `BILLING_DELETED` 등 [T5]. 서명 헤더(`tosspayments-webhook-signature`, HMAC-SHA256)는 payout/seller 이벤트 문서에 명시되어 있고, 결제 이벤트의 검증 방식은 이 조사에서 확인 못 함 → 결제 이벤트는 수신 후 **결제 조회 API로 재확인**하는 설계가 안전(권고, 미확인 항목). 재시도 횟수 헤더 있음 [T5].
- **환불/취소**: 미확인(이번 조사에서 페이지 미열람).

### 4.2 포트원 V2
- PG가 아니라 연동 계층. PG 가맹 계약은 별도, 수수료는 계약한 PG 기준 [P3]. 포트원 이용료는 월 순거래 5,000만원 미만 무료 [P3] (검색 요약; 공식 요금 페이지 직접 확인 못 함 → 계약 전 재확인).
- 지원 PG: 토스페이먼츠, KG이니시스, NHN KCP, 나이스정보통신, KSNET, 스마트로, 카카오페이, 네이버페이, 토스페이, PayPal 등 [P2].
- **빌링키 + 예약결제**: `POST /payments/{PAYMENT_ID}/schedule`에 billingKey, orderName, `timeToPay`(ISO)를 보내면 해당 시각에 결제를 실행하고 결과를 웹훅으로 알린다 [P5]. 즉 "상시 서버 없이" 청구를 포트원에 위임 가능. 실패 재시도 정책, 예약 취소 방법은 문서에서 확인 못 함 → 미확인.
- 토스페이먼츠 경유 시 빌링키는 카드·계좌만 가능하고 간편결제 등은 사전 계약 필요 [P4].
- **웹훅**: Standard Webhooks 형식, secret로 서명, 실패 시 5회 지수 백오프 재시도, 발신 IP 52.78.5.241 [P1]. 이벤트 예: `Transaction.Paid`, `Transaction.Cancelled`, `BillingKey.Issued` [P1].

### 4.3 KG이니시스 / NHN KCP / 나이스페이먼츠 (간략)
- 포트원 V2가 이니시스, KCP, 나이스정보통신 연동을 지원한다 [P2]. 개별 요율·심사·정기결제 조건은 이번 조사에서 공식 자료로 확인하지 못함 → 모두 **미확인**. 필요하면 포트원 경유로 견적을 받는 것이 현실적(포트원 블로그가 PG 수수료 비교를 다룬다고 검색에 나옴: https://blog.portone.io/pgcompare/ — 본문 미확인).

### 4.4 Paddle (MoR)
- **자격**: 개인·1인 사업자는 사업자 인증(business verification) 없이 신원 인증만 요구, 개인 정산은 본인 은행계좌로 직접 [D2](검색 요약). 지원 불가 국가는 제재 대상국 등이고 한국은 목록에서 확인되지 않음(목록 일부만 열람) [D3]. 한국 사업자등록증으로 승인된 사례, 승인 1~2주라는 서술은 비공식 요약이라 참고만.
- **수수료**: 5% + 50¢, 월정액 없음, 세금 처리·사기 방어 포함, 10달러 미만 상품은 별도 협의 [D1]. → 월 4,900원급 구독은 고정 50¢가 매우 큼(약 700원 이상 → 약 15%). 가격 설계(Q-PRICE)와 직결.
- **결제수단**: 한국 로컬 카드, 네이버페이, 카카오페이, 삼성페이, 페이코 [D6](검색 요약).
- **정산**: USD/EUR/GBP/AUD/CAD [D4](검색 요약, 직접 확인 못 함). 원화 정산 불가로 보이나 미확인.
- **웹훅**: `Paddle-Signature` 헤더, `ts`+`h1`, HMAC-SHA256(`ts:rawBody`), 기본 5초 허용 오차 [D5]. WebCrypto로 구현 가능.
- **세금**: 한국 부가세 10% 처리 대행(비공식 요약). 판매자 본인의 소득 신고는 별개.
- 환불/취소 API, 테스트 샌드박스: 미확인.

### 4.5 Lemon Squeezy / Polar
- **Lemon Squeezy**: Stripe 인수 후 2026-01 지원·업데이트 감소 공지, 2026-02 Stripe Managed Payments(공개 프리뷰, 35개국 한정) 이전 경로 안내. 종료일은 미발표, 장기 방향 불명확 [S1](2차 요약). 신규 도입 리스크가 커 비추천. Stripe Managed Payments 자체의 한국 셀러 지원은 미확인(35개국에 한국 포함 여부 미확인).
- **Polar**: 한국이 지급 지원 국가에 포함, Stripe Connect Express 계정 필요 [L1]. 수수료 Starter 5%+50¢, Pro $20/월 3.8%+40¢ 등, 해외카드 +1.5%, 분쟁 건당 $15, 출금 수수료 별도 [L2]. 웹훅 서명 방식, 한국 결제수단(카카오/네이버페이 등)은 미확인. 주의: Stripe Connect 기반 지급이라 "Stripe 한국 계정 불가"와의 관계(수취인 계정 개설 가능 여부)는 [L1]이 지원한다고 하나 실제 가입으로 확인해야 한다.

### 4.6 (c) 무료 출시 후 결제 후속
- 비용 0, 규제 부담 0, G-07/G-09 구현 후속 연기. 단점: 수익 검증이 늦어지고, 한도(plan.ts)가 무료 한도로 고정.

## 5. 우리 아키텍처 적합성

제약: Cloudflare Workers + Cron Triggers만(상시 서버 없음), 구독은 `spaceId` upsert(G-09), 웹훅은 서명 검증·멱등, 결제 세션 생성 레이트 리밋(G-07), 건당 과금 채널 금지(G-16) (`docs/COST_GUARDS.md`, `docs/ARCHITECTURE.md` §6).

| 관점 | 빌링키 방식 (토스 직접) | 빌링키 + 포트원 예약결제 | MoR 구독 (Paddle/Polar) |
|---|---|---|---|
| 청구 스케줄 | **우리 Cron이 매일 도래 건 조회 후 승인 API 호출**. 실패 재시도·유예·해지 상태머신 모두 직접 | 우리가 다음 회차를 예약 API로 등록, 포트원이 실행 후 웹훅 [P5]. 단 매 성공 웹훅 때 다음 예약을 다시 등록해야 함. 실패 정책 미확인 | 공급자가 스케줄·재시도·세금·영수증 수행. 우리는 웹훅만 처리 |
| 멱등성(G-09) | 승인 요청에 우리가 만든 orderId/중복 방지 키 필요, Cron 중복 실행 대비 `(spaceId, period)` 유니크 | `PAYMENT_ID`가 곧 멱등 키(우리가 결정) | 공급자 이벤트 ID로 멱등, 구독 ID는 spaceId 행의 갱신 필드 |
| 웹훅 검증 | 결제 이벤트는 조회 API 재확인 권장(서명 방식 미확인, §4.1) | Standard Webhooks 서명 [P1] | HMAC-SHA256 [D5] |
| 운영 부담 | 가장 큼(청구 로직 = 금전 리스크) | 중간 | 가장 작음 |
| 원화·간편결제 | 좋음 | 좋음 | 로컬 카드·페이 지원(검색 요약), 정산은 외화 |

요약: Workers+Cron 환경에서 "직접 빌링키 스케줄러"는 가능하지만 Cron 누락·중복 실행이 곧 과소/이중 청구 사고다. 사업자 등록이 가능하다면 **포트원 예약결제**가 가장 균형이 좋고, 등록이 싫다면 MoR이 구조적으로 가장 단순하다. 결제 세션 생성 레이트 리밋(G-07)은 어느 쪽이든 우리 몫이다.

## 6. Google Play 정책 (간략)

- 디지털 아이템·서비스 구독·앱 기능·클라우드 소프트웨어는 Google Play 결제 사용이 원칙이다 [G1]. 한국은 대체 결제 시스템 병행이 허용되며(수수료 4%p 감면) [G1], 구체 조건·신청 절차는 이번에 미확인.
- 따라서 Capacitor Android(`server.url`로 웹을 로드) 앱에서 웹 결제로 디지털 구독을 판매하는 방식은 정책 위반 소지가 있으니 Android 착수 시 재검토한다(`ARCHITECTURE.md` §6 기존 방침과 일치). 이는 어느 공급자를 고르든 동일하다.

## 7. 정직한 한계

- 토스페이먼츠 자격(사업자 필수, 통신판매업 시점)은 공식 가입 페이지가 아닌 검색 요약 위주다. 계약 전 토스페이먼츠 영업/약관에서 재확인할 것.
- 정기결제 수수료율, 토스 결제 이벤트 웹훅 서명, 환불·취소 정책, 포트원 예약결제 실패 재시도·취소, 테스트 모드(포트원/Paddle/Polar), Paddle 정산 통화·한국 셀러 세부 조건은 직접 확인하지 못했다.
- KG이니시스·NHN KCP·나이스페이먼츠 개별 조건은 확인하지 못했다.
- MoR 사용 시 한국 거주자의 부가세·소득세 처리(해외 사업자로부터의 수입 신고 등)는 이 문서 범위 밖이며 세무사 확인이 필요하다.
- Lemon Squeezy 상태는 2차 자료다.
- 수수료·정책은 자주 바뀐다. 확정 전 각 공급자에게 서면 견적을 받을 것.

## 8. Sources

- [T1] 토스페이먼츠 가입 관련 검색 요약(개인사업자 서류, PG 계약 사업자만): https://help.pro.sixshop.com/payments/tosspayments , https://www.codemshop.com/wp-content/uploads/pgall/tosspayment_individual.pdf
- [T2] 통신판매업 신고: https://www.tosspayments.com/blog/articles/sales-registration
- [T3] 자동결제 가이드: https://docs.tosspayments.com/guides/v2/billing
- [T4] 수수료: https://www.tosspayments.com/about/fee
- [T5] 웹훅 이벤트: https://docs.tosspayments.com/reference/using-api/webhook-events
- [P1] 포트원 웹훅: https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2
- [P2] 포트원 V2 개요: https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2
- [P3] 포트원 요금(검색 요약): https://help.portone.io/content/content200013 , https://faq.portone.io/346326de-15e5-4524-9303-f700c1941273 , https://blog.portone.io/pgcompare/
- [P4] 포트원 토스페이먼츠 연동: https://developers.portone.io/opi/ko/integration/pg/v2/tosspayments?v=v2
- [P5] 포트원 예약/반복결제: https://developers.portone.io/opi/ko/integration/start/v2/billing/schedule?v=v2 , https://developers.portone.io/api/rest-v2/payment.paymentSchedule?v=v2
- [D1] Paddle 요금: https://www.paddle.com/pricing
- [D2] Paddle 계정/사업자 인증: https://www.paddle.com/help/start/account-verification , https://www.paddle.com/help/start/account-verification/what-is-business-verification
- [D3] Paddle 지원 국가: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle , https://developer.paddle.com/concepts/sell/supported-countries-locales/
- [D4] Paddle 통화: https://developer.paddle.com/concepts/sell/supported-currencies/
- [D5] Paddle 웹훅 서명: https://developer.paddle.com/webhooks/signature-verification
- [D6] Paddle 한국 결제수단: https://developer.paddle.com/concepts/payment-methods/korean-cards/
- [L1] Polar 지원 국가: https://polar.sh/docs/merchant-of-record/supported-countries
- [L2] Polar 수수료: https://polar.sh/docs/merchant-of-record/fees
- [S1] Lemon Squeezy/Stripe: https://www.lemonsqueezy.com/migration-offer , https://dodopayments.com/blogs/lemonsqueezy-review
- [G1] Google Play 결제 정책: https://support.google.com/googleplay/android-developer/answer/10281818
- 내부: `docs/OPEN_QUESTIONS.md` Q-PAY, `docs/COST_GUARDS.md` G-07·G-09, `docs/ARCHITECTURE.md` §6
