import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/auth";
import { appRouter } from "@/server/routers/_app";
import { clientIp } from "@/server/trpc/context";
import { createPrisma } from "@/server/db";
import { storageFromEnv } from "@/server/storage/from-env";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return {
        prisma: createPrisma(),
        userId: session?.userId ?? null,
        ip: clientIp(req),
        storage: storageFromEnv(),
      };
    },
  });
}

export { handler as GET, handler as POST };
