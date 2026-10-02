import type { PrismaClient } from "@/generated/prisma/client";

export type OAuthIdentity = {
  provider: string;
  providerAccountId: string;
  /** 표시 이름(카카오 닉네임 등). 이메일, 프로필 사진은 저장하지 않는다(PRIVACY §2) */
  name?: string | null;
};

/** OAuth 계정으로 봄별 User를 찾고, 없으면 User + Account를 함께 만든다. */
export async function findOrCreateUser(prisma: PrismaClient, identity: OAuthIdentity) {
  const { provider, providerAccountId } = identity;
  const name = identity.name?.trim().slice(0, 50) || null;
  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { user: { select: { id: true, deletedAt: true, name: true } } },
  });
  if (existing) {
    const { id, deletedAt } = existing.user;
    // 가입 뒤 동의항목(닉네임)을 켠 경우: 비어 있는 이름만 채운다(사용자가 바꾼 이름은 덮어쓰지 않음).
    if (!existing.user.name && name && !deletedAt) {
      await prisma.user.updateMany({ where: { id, name: null }, data: { name } });
    }
    return { id, deletedAt };
  }

  try {
    return await prisma.user.create({
      data: {
        name,
        accounts: { create: { provider, providerAccountId } },
      },
      select: { id: true, deletedAt: true },
    });
  } catch (error) {
    // 같은 계정의 동시 첫 로그인: unique 충돌이면 먼저 만들어진 쪽을 쓴다.
    const raced = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      select: { user: { select: { id: true, deletedAt: true } } },
    });
    if (raced) return raced.user;
    throw error;
  }
}
