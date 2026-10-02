#!/usr/bin/env node
// 로컬 Postgres 전용으로 명령을 실행한다.
// 클라우드 환경의 DATABASE_URL은 개발용 Supabase를 가리키므로, 로컬 작업(마이그레이션, 테스트)이
// 실수로 원격 DB에 닿지 않게 DATABASE_URL을 LOCAL_DATABASE_URL(기본: docker-compose 값)로 덮어쓰고
// 호스트가 로컬이 아니면 거부한다. 원격 마이그레이션은 CI에서 prisma migrate deploy로만 한다.
import { spawnSync } from "node:child_process";

const DEFAULT_LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/bombyeol";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres"]);

export function assertLocalDatabaseUrl(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("LOCAL_DATABASE_URL 형식이 올바르지 않습니다.");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`로컬 DB가 아닌 호스트(${host})로는 실행하지 않습니다.`);
  }
  return url;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.error("사용법: node scripts/with-local-db.mjs <명령> [인자...]");
    process.exit(2);
  }
  let url;
  try {
    url = assertLocalDatabaseUrl(process.env.LOCAL_DATABASE_URL ?? DEFAULT_LOCAL_URL);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  process.exit(result.status ?? 1);
}
