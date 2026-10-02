import { devMemory, devMemoryPut } from "@/server/storage/dev-memory";

/** 로컬 개발 전용 미디어 경로(src/server/storage/dev-memory.ts). 개발 서버가 아니면 없는 경로다. */
const enabled = process.env.NODE_ENV === "development";
const notFound = () => new Response(null, { status: 404 });

type Params = { params: Promise<{ key: string[] }> };

export async function PUT(req: Request, { params }: Params) {
  if (!enabled) return notFound();
  const key = (await params).key.join("/");
  const body = new Uint8Array(await req.arrayBuffer());
  const ok = devMemoryPut(key, body, req.headers.get("content-type") ?? "");
  return new Response(null, { status: ok ? 200 : 403 });
}

export async function GET(_req: Request, { params }: Params) {
  if (!enabled) return notFound();
  const obj = devMemory().objects.get((await params).key.join("/"));
  if (!obj) return notFound();
  return new Response(obj.body.slice().buffer, {
    headers: { "content-type": obj.contentType, "cache-control": "private, max-age=3600" },
  });
}
