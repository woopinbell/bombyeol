import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { clientIp } from "@/server/trpc/context";
import { createPrisma } from "@/server/db";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({ prisma: createPrisma(), userId: null, ip: clientIp(req) }),
  });
}

export { handler as GET, handler as POST };
