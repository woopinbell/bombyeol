// 배포 Worker의 Secret(값은 wrangler secret put 또는 대시보드로 등록, ENV_MANIFEST).
// `wrangler types`는 Secret을 모르므로 여기서 선언한다. 로컬 .env는 타입 생성에 쓰지 않는다
// (Worker에 없는 DATABASE_URL 등이 섞이기 때문).
interface CloudflareEnv {
  AUTH_SECRET?: string;
  AUTH_KAKAO_ID?: string;
  AUTH_KAKAO_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  FIREBASE_ADMIN_PROJECT_ID?: string;
  FIREBASE_ADMIN_CLIENT_EMAIL?: string;
  FIREBASE_ADMIN_PRIVATE_KEY?: string;
}
