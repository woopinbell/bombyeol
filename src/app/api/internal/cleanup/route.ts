import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createPrisma } from "@/server/db";
import { isInternalRequest } from "@/server/internal-auth";
import { runCleanup } from "@/server/jobs/cleanup";
import { storageFromEnv } from "@/server/storage/from-env";

// Cron(worker.ts scheduled)만 호출한다. 토큰이 없거나 틀리면 존재를 드러내지 않고 404.
export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  if (!(await isInternalRequest(req, env.AUTH_SECRET, "cleanup"))) {
    return new Response(null, { status: 404 });
  }
  const result = await runCleanup(createPrisma(), storageFromEnv());
  console.log("[cleanup]", JSON.stringify(result));
  return Response.json(result);
}
