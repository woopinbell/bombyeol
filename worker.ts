// Worker 진입점: OpenNext가 만든 fetch 핸들러에 Cron(scheduled) 핸들러를 더한다.
// Cron은 Next 내부 경로를 같은 Worker 안에서 호출한다 — Prisma 등을 여기서 import하면
// OpenNext 번들과 별도로 한 번 더 번들돼 Worker가 커지므로(13→18 MiB) 이 파일은 가볍게 둔다.
// 빌드 산출물(.open-next)은 `npm run cf:build` 후에 생기므로 타입 검사에서 존재 여부를 따지지 않는다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nextWorker from "./.open-next/worker.js";
import { INTERNAL_CLEANUP_PATH, internalToken } from "./src/server/internal-auth";

export default {
  fetch: nextWorker.fetch,

  async scheduled(_controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    if (!env.AUTH_SECRET) {
      console.error("[cleanup] AUTH_SECRET 없음 — 건너뜀");
      return;
    }
    const req = new Request(`https://internal${INTERNAL_CLEANUP_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${await internalToken(env.AUTH_SECRET)}` },
    });
    ctx.waitUntil(
      nextWorker.fetch(req, env, ctx).then(async (res: Response) => {
        if (!res.ok) console.error("[cleanup] 실패", res.status);
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
