import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createR2Storage } from "./r2";
import type { MediaStorage } from "./types";

/** wrangler types가 모르는 Secret(대시보드·wrangler secret으로 등록) */
type R2Secrets = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
};

/**
 * 요청 환경의 R2 설정으로 저장소를 만든다. 설정(버킷·S3 토큰)이 없는 환경에서는
 * 미디어 기능을 쓸 때만 실패하도록 지연 오류를 돌려준다.
 */
export function storageFromEnv(): MediaStorage {
  const env = getCloudflareContext().env as CloudflareEnv & R2Secrets;
  const config = {
    accountId: env.R2_ACCOUNT_ID ?? "",
    bucket: env.R2_BUCKET_NAME ?? "",
    accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
  };
  if (Object.values(config).every(Boolean)) return createR2Storage(config);
  const missing = (): never => {
    throw new Error("R2 설정이 없습니다(R2_BUCKET_NAME·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY).");
  };
  return {
    presignPut: missing,
    head: missing,
    copy: missing,
    delete: missing,
    presignGet: missing,
  };
}
