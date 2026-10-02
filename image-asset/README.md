# 봄별 Assets

봄별(Bombyeol) 브랜드의 컨셉과 실제 프로젝트용 에셋을 함께 보관하는 디렉터리입니다.

## Direction

**1번의 꽃 + 별 심볼**을 고정하고 **6번 계열의 손맛 있는 타이포**를 결합했습니다. 2026-10-02 다시 그린 v2에서 **심볼 S2(네 꽃잎 + 둥근 남색 별) + 워드마크 W2(손맛 곡선)**로 확정 - `logo-v2/`, 목록은 `brand/asset-index.md`.

브랜드의 두 축:

- **봄** - 성장, 오늘, 생동감
- **별** - 기억, 밤, 지속성

## Directory

```text
concept/     원래의 로고 탐색 보드
logo/        실제 사용 로고 SVG
icon/        favicon / PWA / 앱 아이콘
og/          SNS 공유 이미지
brand/tokens.json  확정 토큰 v1(원본)
brand/       디자인 토큰과 간단한 사용 가이드
```

## Production note

SVG가 기본 실사용 포맷입니다. PNG는 favicon, PWA/app icon, 공유 이미지 등 래스터가 필요한 위치에 사용하세요.

브랜드 보드(`concept/logo-concepts.png`)는 **의사결정 기록**으로 보존하며, 최종 제품 UI에서는 `logo/`와 `brand/`의 에셋을 기준으로 삼습니다.

## Suggested web usage

```html
<link rel="icon" type="image/svg+xml" href="/brand/icon/favicon.svg" />
<img src="/brand/logo/primary.svg" alt="봄별" />
```
