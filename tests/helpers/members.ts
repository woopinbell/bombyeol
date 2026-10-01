import type { MemberRole, PrismaClient } from "@/generated/prisma/client";
import type { MediaStorage } from "@/server/storage/types";
import { callerFor } from "./trpc";

/** 초대 절차 없이 Space에 멤버를 바로 넣는다(권한 테스트용) */
export async function addMember(
  prisma: PrismaClient,
  spaceId: string,
  role: MemberRole,
  storage?: MediaStorage,
) {
  const user = await prisma.user.create({ data: { name: role } });
  await prisma.member.create({ data: { spaceId, userId: user.id, role } });
  return callerFor(prisma, user.id, "203.0.113.50", storage);
}
