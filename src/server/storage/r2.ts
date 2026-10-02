import { AwsClient } from "aws4fetch";
import type { MediaStorage } from "./types";

export type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** R2 S3 호환 API(SigV4) 구현. presign, Head, Copy, Delete를 한 경로로 통일한다(ARCHITECTURE §5). */
export function createR2Storage(config: R2Config): MediaStorage {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  const objectUrl = (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

  async function presign(
    key: string,
    method: string,
    expiresSec: number,
    headers?: Record<string, string>,
  ) {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(expiresSec));
    const signed = await client.sign(url.toString(), {
      method,
      headers,
      aws: { signQuery: true, allHeaders: true },
    });
    return signed.url;
  }

  async function ok(res: Response, what: string, allow: number[] = []) {
    if (res.ok || allow.includes(res.status)) return res;
    throw new Error(`R2 ${what} 실패: ${res.status}`);
  }

  return {
    presignPut: (key, { bytes, contentType, expiresSec }) =>
      // 길이, 타입을 서명해야 다른 크기, 타입의 PUT이 SignatureDoesNotMatch로 거부된다(S-3 검증).
      presign(key, "PUT", expiresSec, {
        "content-length": String(bytes),
        "content-type": contentType,
      }),

    async head(key) {
      const res = await ok(await client.fetch(objectUrl(key), { method: "HEAD" }), "HEAD", [404]);
      if (res.status === 404) return null;
      return {
        bytes: Number(res.headers.get("content-length") ?? "-1"),
        contentType: res.headers.get("content-type"),
      };
    },

    async copy(fromKey, toKey) {
      await ok(
        await client.fetch(objectUrl(toKey), {
          method: "PUT",
          headers: { "x-amz-copy-source": `/${config.bucket}/${fromKey}` },
        }),
        "COPY",
      );
    },

    async delete(key) {
      await ok(await client.fetch(objectUrl(key), { method: "DELETE" }), "DELETE", [404]);
    },

    presignGet: (key, expiresSec) => presign(key, "GET", expiresSec),
  };
}
