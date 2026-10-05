import type { PrismaClient } from "@/generated/prisma/client";
import { callerFor } from "./trpc";
import { MemoryStorage } from "./storage";
import { createUser } from "./users";

/** 부모 1명과 가족 Space, 메모리 저장소를 준비한다 */
export async function mediaSetup(prisma: PrismaClient) {
  const parent = await createUser(prisma, "부모");
  const storage = new MemoryStorage();
  const api = callerFor(prisma, parent.id, "203.0.113.1", storage);
  const { id: spaceId } = await api.space.create({ name: "가족" });
  return { parent, storage, api, spaceId };
}

type Api = ReturnType<typeof callerFor>;

/** 업로드 요청 → 저장소 PUT → 확정까지 마친 자산 ID */
export async function uploadConfirmed(
  api: Api,
  storage: MemoryStorage,
  spaceId: string,
  kind: "image" | "video" = "image",
  bytes = 100,
) {
  const contentType = kind === "image" ? "image/jpeg" : "video/mp4";
  const { assetId } = await api.media.requestUpload({ spaceId, kind, contentType, bytes });
  storage.upload(`pending/${spaceId}/${assetId}`, bytes, contentType);
  await api.media.confirm({ spaceId, assetId });
  return assetId;
}
