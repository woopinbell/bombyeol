import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDevMemoryStorage } from "./dev-memory";
import { createR2Storage } from "./r2";
import type { MediaStorage } from "./types";

/**
 * 요청 환경의 R2 설정으로 저장소를 만든다. 설정(버킷, S3 토큰)이 없는 환경에서는
 * 미디어 기능을 쓸 때만 실패하도록 지연 오류를 돌려준다.
 */
export function storageFromEnv(env: CloudflareEnv = getCloudflareContext().env): MediaStorage {
  const config = {
    accountId: env.R2_ACCOUNT_ID ?? "",
    bucket: env.R2_BUCKET_NAME ?? "",
    accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
  };
  if (Object.values(config).every(Boolean)) return createR2Storage(config);
  // 로컬 개발(next dev)에서만: R2 키 없이 화면의 업로드, 보기 흐름을 확인한다
  if (process.env.NODE_ENV === "development") return createDevMemoryStorage();
  const missing = (): never => {
    throw new Error(
      "R2 설정이 없습니다(R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).",
    );
  };
  return {
    presignPut: missing,
    head: missing,
    copy: missing,
    delete: missing,
    presignGet: missing,
  };
}
