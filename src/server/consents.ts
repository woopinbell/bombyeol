import type { ConsentKind, Prisma, PrismaClient } from "@/generated/prisma/client";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { inputError } from "@/server/errors";

type Db = Pick<PrismaClient | Prisma.TransactionClient, "consent">;

/** 유효한 동의 = 철회되지 않았고 현재 문구 버전에 대한 것 */
export function validConsentWhere(
  userId: string,
  kind: ConsentKind,
  spaceId: string | null,
): Prisma.ConsentWhereInput {
  return { userId, kind, spaceId, version: CONSENT_VERSIONS[kind], withdrawnAt: null };
}

export async function hasValidConsent(
  prisma: Db,
  userId: string,
  kind: ConsentKind,
  spaceId: string | null,
) {
  const count = await prisma.consent.count({ where: validConsentWhere(userId, kind, spaceId) });
  return count > 0;
}

/** 동의가 없으면 CONSENT_REQUIRED(클라이언트는 동의 안내를 띄운다) */
export async function requireConsent(
  prisma: Db,
  userId: string,
  kind: ConsentKind,
  spaceId: string | null,
) {
  if (!(await hasValidConsent(prisma, userId, kind, spaceId))) {
    throw inputError("CONSENT_REQUIRED");
  }
}
