# 봄별 에셋 목록 (2026-10-02 갱신 — 로고 S2 + W2 확정)

모든 파생 에셋은 `logo-v2/build.py`(SVG) → `logo-v2/render.mjs`(PNG)로 다시 만든다. 손으로 고치지 않는다.

| 파일 | 용도 |
|---|---|
| `logo/primary.svg` · `.png` | 가로 로고(심볼 + 워드마크), 밝은 바탕 |
| `logo/primary-dark.svg` · `.png` | 가로 로고, 어두운 바탕(글자 paper, 별 silver) — 바탕은 투명 |
| `logo/stacked.svg` · `.png` | 세로 로고(스플래시·온보딩) |
| `logo/symbol.svg` · `.png` / `symbol-dark` | 심볼만(앱 안 헤더·프로필) |
| `logo/wordmark.svg` · `.png` / `wordmark-dark` | 워드마크만 |
| `logo/monochrome.svg` · `.png` | 단색(ink) — 인쇄·제약 환경 |
| `icon/favicon.svg` | SVG 파비콘 — 브라우저가 어두우면 별이 silver로(파일 안 미디어 쿼리), 틈은 마스크라 바탕 무관 |
| `icon/favicon-16/32/48.png` | PNG 파비콘(paper 둥근 바탕) |
| `icon/icon-180.png` | apple-touch-icon(꽉 찬 paper, iOS가 모서리를 깎음) |
| `icon/icon-192.png` · `icon-512.png` · `icon-1024.png` | PWA·스토어 |
| `icon/maskable-512.png` | 안드로이드 마스커블(심볼이 지름 80% 안전 원 안) |
| `icon/manifest-icons.json` | 매니페스트 `icons` 조각 |
| `icon/_app.svg` · `_maskable.svg` · `_favicon-png.svg` | PNG 원본(직접 쓰지 않음) |
| `og/og-image.svg` · `.png` | 공유 이미지 1200×630(가운데 정렬 — 메신저가 가운데를 잘라도 남음) |
| `logo-v2/` | 후보 전부(S1·S2·S3 × W1·W2)와 생성기 — 결정 기록 |
| `concept/logo-concepts.png` | 처음 탐색 보드 — 결정 기록 |
