import { execSync } from "node:child_process";
import { assertLocalDatabaseUrl } from "../scripts/with-local-db.mjs";

// `npm test`는 scripts/with-local-db.mjs가 DATABASE_URL을 로컬로 덮어쓴다.
// `npx vitest`를 직접 실행해 클라우드 환경의 원격 DATABASE_URL이 그대로 남는 경우를 막는다.
export default function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL이 없습니다. `npm test`로 실행하세요.");
  }
  assertLocalDatabaseUrl(url);
  // 통합 테스트 전에 로컬 DB를 최신 마이그레이션으로 맞춘다.
  execSync("npx prisma migrate deploy", { stdio: "ignore", env: process.env });
}
