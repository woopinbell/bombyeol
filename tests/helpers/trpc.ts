import type { PrismaClient } from "@/generated/prisma/client";
import { appRouter } from "@/server/routers/_app";
import { noPush, type PushDispatcher } from "@/server/push/dispatch";
import type { MediaStorage } from "@/server/storage/types";
import { createCallerFactory } from "@/server/trpc/init";
import { MemoryStorage } from "./storage";

const createCaller = createCallerFactory(appRouter);

export function callerFor(
  prisma: PrismaClient,
  userId: string | null,
  ip = "203.0.113.1",
  storage: MediaStorage = new MemoryStorage(),
  push: PushDispatcher = noPush,
) {
  return createCaller({ prisma, userId, ip, storage, push });
}
