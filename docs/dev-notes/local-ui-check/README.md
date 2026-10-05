# 로컬 화면 확인 도구 (클라우드 세션용, main에 넣지 않는다)

2026-10-03 세션에서 쓴 것. 실제 tRPC 프로시저로 가족을 만들고, OAuth 없이 세션 쿠키를 만들어 Playwright로 화면을 확인한다.

1. `npm ci`, Docker(`dockerd`가 없으면 백그라운드로 띄움), `npm run db:up`
2. `seed.test.ts`를 `tests/zz-local-seed.test.ts`로 복사하고 `.git/info/exclude`에 추가(커밋 금지)
   - `SEED=1 SEED_OUT=<스크래치>/seed.json npm test -- tests/zz-local-seed.test.ts`
   - 엄마, 아빠(parent), 할머니(grandparent), 태명 아이와 임신 기록 3건, 이야기 2건과 별, 태어난 아이 일기 1건, 물어보기 1건
   - `npm test`(전체)는 로컬 DB를 비우므로 화면 확인 전에 다시 시드한다
3. `cookie.mjs`를 리포 루트에 `zz-cookie.mjs`로 복사(exclude 추가). `node zz-cookie.mjs <userId>`가 `authjs.session-token` 값을 낸다(AUTH_SECRET 환경변수 사용)
4. `npx next dev -p 3100`을 백그라운드로. 빌드 시점 값을 바꾸려면 다시 띄운다(예: `NEXT_PUBLIC_KAKAO_JS_KEY=가짜값`)
5. 스크래치에 `npm i playwright-core@1.56`, `pw-lib.mjs`를 `lib.mjs`로 두고 스크립트 작성(`example-share.mjs` 참고). 브라우저는 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`

주의
- 커밋 전에 `zz-*` 파일을 리포 밖으로 옮긴다(format:check가 잡는다).
- `pkill -f "next dev"`를 다른 명령과 한 줄에 쓰면 자기 셸까지 죽는다(따로 실행).
- 스크린샷이 하이드레이션 전에 `caret-color`를 넣어 개발 서버에 하이드레이션 경고가 뜬다(앱 문제 아님).
- 헤드리스 Chromium은 웹푸시 구독을 거절한다. 서비스 워커 표시는 CDP `ServiceWorker.deliverPushMessage`로 확인.
- 외부 호스트(카카오 등)는 Chromium이 프록시를 안 써서 열리지 않는다. 필요한 스크립트는 `ctx.route`로 받은 파일을 그대로 돌려준다(무결성 해시가 맞아야 함).

## 2026-10-05 추가 (기준선 2차)
- `seed.test.ts`: 할아버지(긴 이름), 반려동물, 마일스톤, 일정, 댓글, 빈 가족(`solo`, `emptySpaceId`), 가족 없는 사람(`nofam`)까지.
- `photos.mjs`: 개발 서버가 떠 있을 때 캔버스로 만든 사진을 실제 업로드 경로(`media.requestUploads` → `/api/dev-media` PUT → `confirmMany` → `moment.create`)로 올린다. 개발 메모리 저장소라 **dev 서버를 다시 켜면 사진이 사라진다** - 시드부터 다시.
- `shots.mjs`: 16화면 x 밝게, 어둡게, 글자 더 크게 320px. 뷰포트를 페이지 높이로 늘려 찍는다(fullPage는 고정 하단 탭이 중간에 찍히고 지연 로딩 사진이 회색으로 남는다).
- `pw-lib.mjs`: 스크래치 경로는 `SCRATCH` 환경변수. **Chromium을 `--lang=ko-KR`, `LANG=ko_KR.UTF-8`로 띄운다** - 아니면 날짜칸이 mm/dd/yyyy로 찍힌다(앱 문제 아님).
