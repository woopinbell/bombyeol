import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/auth";
import { appRouter } from "@/server/routers/_app";
import { clientIp } from "@/server/trpc/context";
import { createPrisma } from "@/server/db";
import { createPushDispatcher } from "@/server/push/dispatch";
import { fcmSenderFromEnv } from "@/server/push/fcm";
import { storageFromEnv } from "@/server/storage/from-env";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      const { env, ctx } = getCloudflareContext();
      const prisma = createPrisma();
      return {
        prisma,
        userId: session?.userId ?? null,
        ip: clientIp(req),
        storage: storageFromEnv(),
        // 알림은 응답 뒤에 같은 요청의 DB 연결로 보낸다(ARCHITECTURE §7)
        push: createPushDispatcher(
          { prisma, sender: fcmSenderFromEnv(env), origin: new URL(req.url).origin },
          (work) => ctx.waitUntil(work),
        ),
      };
    },
  });
}

export { handler as GET, handler as POST };
