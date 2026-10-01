import type { PrismaClient } from "@/generated/prisma/client";
import { callerFor } from "./trpc";
import { MemoryStorage } from "./storage";

/** 부모 1명과 가족 Space, 메모리 저장소를 준비한다 */
export async function mediaSetup(prisma: PrismaClient) {
  const parent = await prisma.user.create({ data: { name: "부모" } });
  const storage = new MemoryStorage();
  const api = callerFor(prisma, parent.id, "203.0.113.1", storage);
  const { id: spaceId } = await api.space.create({ name: "가족" });
  return { parent, storage, api, spaceId };
}
