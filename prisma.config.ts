import { defineConfig } from "prisma/config";

// DATABASE_URL은 로컬 작업에서는 scripts/with-local-db.mjs가 로컬 Docker Postgres로 덮어쓴다.
// 원격(Supabase) 마이그레이션은 CI에서만 수행한다(CLOUD_SESSION §2.1).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
