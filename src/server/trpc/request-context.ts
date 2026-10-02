import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createPrisma } from "@/server/db";
import { createPushDispatcher } from "@/server/push/dispatch";
import { fcmSenderFromEnv } from "@/server/push/fcm";
import { storageFromEnv } from "@/server/storage/from-env";
import type { Context } from "./context";

/**
 * 요청 하나의 tRPC 컨텍스트. API 라우트(/api/trpc)와 서버 컴포넌트·서버 액션이 같은 것을 쓴다 —
 * 권한 검사는 프로시저 안에 있으므로 어느 길로 불러도 같다.
 */
export function requestContext({
  userId,
  ip,
  origin,
}: {
  userId: string | null;
  ip: string;
  origin: string;
}): Context {
  const { env, ctx } = getCloudflareContext();
  const prisma = createPrisma();
  return {
    prisma,
    userId,
    ip,
    storage: storageFromEnv(),
    // 알림은 응답 뒤에 같은 요청의 DB 연결로 보낸다(ARCHITECTURE §7)
    push: createPushDispatcher({ prisma, sender: fcmSenderFromEnv(env), origin }, (work) =>
      ctx.waitUntil(work),
    ),
  };
}
