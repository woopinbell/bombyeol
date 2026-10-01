import { getCloudflareContext } from "@opennextjs/cloudflare";

// S-3 스파이크: Worker 프록시 업로드. 서버가 선언 크기를 상한과 대조하고,
// FixedLengthStream으로 실제 본문 길이가 선언과 정확히 같을 때만 R2에 저장한다(G-01).
const MAX_BYTES: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "video/mp4": 50 * 1024 * 1024,
};

export async function PUT(req: Request) {
  const url = new URL(req.url);
  const declared = Number(url.searchParams.get("bytes"));
  const contentType = req.headers.get("content-type") ?? "";
  const key = `spike/pending/${crypto.randomUUID()}`;

  const cap = MAX_BYTES[contentType];
  if (cap === undefined) return Response.json({ error: "type" }, { status: 415 });
  if (!Number.isInteger(declared) || declared <= 0 || declared > cap) {
    return Response.json({ error: "size" }, { status: 413 });
  }
  if (!req.body) return Response.json({ error: "body" }, { status: 400 });

  const { env } = getCloudflareContext();
  const fixed = new FixedLengthStream(declared);
  const pump = req.body.pipeTo(fixed.writable).catch((e: unknown) => e);
  try {
    await env.MEDIA.put(key, fixed.readable, { httpMetadata: { contentType } });
  } catch {
    await pump;
    return Response.json({ error: "length-mismatch" }, { status: 400 });
  }
  const pumpErr = await pump;
  const head = await env.MEDIA.head(key);
  if (pumpErr || !head || head.size !== declared) {
    await env.MEDIA.delete(key);
    return Response.json({ error: "length-mismatch" }, { status: 400 });
  }
  await env.MEDIA.delete(key); // 스파이크: 저장 확인 후 정리
  return Response.json({ ok: true, stored: head.size });
}

// 진단: 버킷에 남은 스파이크 객체 수(거부된 업로드가 잔존하지 않는지)
export async function GET() {
  const { env } = getCloudflareContext();
  const list = await env.MEDIA.list({ prefix: "spike/" });
  return Response.json({ remaining: list.objects.length });
}
