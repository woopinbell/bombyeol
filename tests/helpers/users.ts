import type { PrismaClient } from "@/generated/prisma/client";
import { ACCOUNT_CONSENTS, CONSENT_VERSIONS } from "@/lib/consents";
import { findOrCreateUser } from "@/server/auth/users";

/** 가입 동의(약관, 처리방침)를 현재 버전으로 남긴다 - 가족 만들기, 합류의 전제(requireAccountConsents) */
export async function grantAccountConsents(prisma: PrismaClient, userId: string) {
  await prisma.consent.createMany({
    data: ACCOUNT_CONSENTS.map((kind) => ({ userId, kind, version: CONSENT_VERSIONS[kind] })),
  });
}

/** 가입 동의까지 마친 사용자(테스트 기본값). 동의 게이트 자체를 볼 때는 prisma.user.create를 바로 쓴다 */
export async function createUser(prisma: PrismaClient, name: string | null) {
  const user = await prisma.user.create({ data: { name } });
  await grantAccountConsents(prisma, user.id);
  return user;
}

/** 아이를 등록할 때 화면이 보여주는 아이 정보 동의 버전 */
export const CHILD_CONSENT = CONSENT_VERSIONS.child_data;

/** 실제 로그인 경로(findOrCreateUser)로 만든 뒤 가입 동의까지 - 첫 로그인 뒤 동의 화면을 지난 상태 */
export async function signedUp(
  prisma: PrismaClient,
  ...args: DropFirst<Parameters<typeof findOrCreateUser>>
) {
  const user = await findOrCreateUser(prisma, ...args);
  // 같은 계정으로 다시 로그인한 경우(이미 동의함)는 그대로 둔다
  const existing = await prisma.consent.count({ where: { userId: user.id } });
  if (existing === 0) await grantAccountConsents(prisma, user.id);
  return user;
}
type DropFirst<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
