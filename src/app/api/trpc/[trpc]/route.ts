import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/auth";
import { appRouter } from "@/server/routers/_app";
import { clientIp } from "@/server/trpc/context";
import { requestContext } from "@/server/trpc/request-context";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return requestContext({
        userId: session?.userId ?? null,
        ip: clientIp(req),
        origin: new URL(req.url).origin,
      });
    },
  });
}

export { handler as GET, handler as POST };
