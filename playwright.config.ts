import { defineConfig } from "@playwright/test";

// 브라우저 e2e(로컬 DB 전용): `npm run e2e`가 시드를 넣고 이 설정으로 돌린다(scripts/e2e.mjs).
// 개발 서버는 R2 없이 메모리 저장소로 사진을 받는다(src/server/storage/dev-memory.ts).
// Next는 한 폴더에서 개발 서버를 하나만 띄운다 - 이미 떠 있으면(npm run dev) 그 서버를 그대로 쓴다
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
