# 봄별 (bombyeol)

손주의 "봄"과 조부모의 "별"을 잇는 가족 앨범. Next.js(App Router) + tRPC + Prisma, Cloudflare Workers(OpenNext)에 배포한다.

설계 문서, 결정 기록, 진행 상황은 `main`이 아니라 `docs` 브랜치에 있다. 세션 시작 훅(`.claude/settings.json` → `scripts/session-start.sh`)이 `docs` 브랜치를 `.docs/`에 붙이고 `CLAUDE.md`, `docs/`, `image-asset/`을 루트에 링크한다. 손으로 할 때도 같은 스크립트를 실행하면 된다.

## 처음 실행

```bash
npm ci                 # prisma generate까지
cp .env.example .env   # 이름, 형식만 있다. 로컬은 AUTH_SECRET 정도만 채우면 된다
npm run db:up          # 로컬 Postgres(docker compose, Supabase와 같은 17)
npm run db:migrate     # 마이그레이션 적용(원격 DB면 스스로 거부)
npm run dev            # http://localhost:3000
```

로컬 개발에서 R2 키가 없으면 사진은 개발 서버 메모리에 저장된다(`src/server/storage/dev-memory.ts`, 다시 켜면 사라진다).

## 확인

```bash
npm run format:check && npm run lint && npm run typecheck
npm test               # 로컬 DB를 비우고 쓴다
npm run cf:build       # OpenNext 빌드(CI와 같음)
npm run e2e            # 브라우저 핵심 흐름(로컬 DB 전용, 개발 서버가 떠 있으면 E2E_PORT로 그 포트를 준다)
```

## 배포

- 스테이징: `npm run cf:deploy:staging` 뒤 `node scripts/smoke-staging.mjs`(AUTH_SECRET 필요)
- 마이그레이션은 GitHub Actions(`migrate-staging.yml`)가 적용한다
- 프로덕션 절차와 출시 전 할 일은 `docs` 브랜치의 출시 마무리 안내서를 따른다

## 규칙 요약

커밋은 `type(scope): 한국어 메시지`, 원자적으로. 문서, 에셋은 `main`에 커밋하지 않는다. 긴 대시, 가운뎃점, 말줄임표, 둥근 따옴표는 쓰지 않는다(`tests/banned-chars.test.ts`).
