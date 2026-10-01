import type { PrismaClient } from "@/generated/prisma/client";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "@/server/trpc/init";

const createCaller = createCallerFactory(appRouter);

export function callerFor(prisma: PrismaClient, userId: string | null, ip = "203.0.113.1") {
  return createCaller({ prisma, userId, ip });
}
