import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createPrisma } from "@/server/db";
import { isInternalRequest } from "@/server/internal-auth";
import { fcmConfigFromEnv, probeFcm } from "@/server/push/fcm";
import { storageFromEnv } from "@/server/storage/from-env";

/**
 * 배포 스모크(CLOUD_SESSION §2.1): Worker → Hyperdrive → DB, Worker → R2(presign 서명 강제, Head, Copy, Delete),
 * Worker → FCM(서비스 계정 토큰 교환, 발송 호출).
 * 내부 토큰 없이는 404. 시험 객체는 `pending/_smoke/`에만 만들고 끝나면 지운다.
 */
export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  if (!(await isInternalRequest(req, env.AUTH_SECRET, "smoke"))) {
    return new Response(null, { status: 404 });
  }
  const checks: Record<string, string> = {};
  try {
    await createPrisma().$queryRaw`select 1`;
    checks.db = "ok";
  } catch (error) {
    checks.db = `fail: ${(error as Error).message.slice(0, 120)}`;
  }

  const storage = storageFromEnv();
  const id = crypto.randomUUID();
  const pendingKey = `pending/_smoke/${id}`;
  const finalKey = `spaces/_smoke/${id}`;
  try {
    const put = async (bytes: number, contentType: string) => {
      const url = await storage.presignPut(pendingKey, {
        bytes: 1000,
        contentType: "image/jpeg",
        expiresSec: 60,
      });
      const res = await fetch(url, {
        method: "PUT",
        body: new Uint8Array(bytes),
        headers: { "content-type": contentType },
      });
      return res.status;
    };
    checks.putWrongSize = String(await put(2000, "image/jpeg")); // 기대 403
    checks.putWrongType = String(await put(1000, "application/zip")); // 기대 403
    checks.putExact = String(await put(1000, "image/jpeg")); // 기대 200
    const head = await storage.head(pendingKey);
    checks.head = head ? `${head.bytes} ${head.contentType}` : "missing";
    await storage.copy(pendingKey, finalKey);
    checks.copy = (await storage.head(finalKey)) ? "ok" : "missing";
    await storage.delete(pendingKey);
    await storage.delete(finalKey);
    checks.cleanup =
      (await storage.head(finalKey)) || (await storage.head(pendingKey)) ? "left" : "ok";
  } catch (error) {
    checks.r2 = `fail: ${(error as Error).message.slice(0, 120)}`;
  }

  // 가짜 등록 토큰으로 보낸다 - 실제 알림은 나가지 않는다. 기대값 invalid_token(키, 토큰 교환, FCM 호출 정상),
  // 아니면 멈춘 단계(key, token, send)를 값 없이 보여준다.
  const fcm = fcmConfigFromEnv(env);
  checks.fcm = fcm ? await probeFcm(fcm, new URL("/", req.url).toString()) : "not configured";
  return Response.json(checks);
}
