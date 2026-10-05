#!/usr/bin/env node
// 브라우저 e2e(로컬 DB 전용): 로컬 DB에 시드를 넣고(vitest, 원격 DB면 거부) Playwright로 핵심 흐름을 돈다.
// 로컬 DB를 비우고 쓴다. 필요: docker compose Postgres(npm run db:up), AUTH_SECRET 환경변수.
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(tmpdir(), "bombyeol-e2e-seed.json");
const env = { ...process.env, E2E_SEED_OUT: out };
execSync("node scripts/with-local-db.mjs vitest run tests/e2e/seed.test.ts", {
  stdio: "inherit",
  env: { ...env, E2E_SEED: "1" },
});
execSync(`npx playwright test ${process.argv.slice(2).join(" ")}`, { stdio: "inherit", env });
