import type { MemberRole, PrismaClient } from "@/generated/prisma/client";
import type { PushDispatcher } from "@/server/push/dispatch";
import type { MediaStorage } from "@/server/storage/types";
import { callerFor } from "./trpc";
import { createUser } from "./users";

/** 초대 절차 없이 Space에 멤버를 바로 넣는다(권한 테스트용) */
export async function addMember(
  prisma: PrismaClient,
  spaceId: string,
  role: MemberRole,
  storage?: MediaStorage,
  push?: PushDispatcher,
) {
  const user = await createUser(prisma, role);
  await prisma.member.create({ data: { spaceId, userId: user.id, role } });
  return callerFor(prisma, user.id, "203.0.113.50", storage, push);
}
