import type { ConsentKind, Prisma, PrismaClient } from "@/generated/prisma/client";
import { ACCOUNT_CONSENTS, CONSENT_VERSIONS } from "@/lib/consents";
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

/**
 * 가입 동의(이용약관, 개인정보 처리방침)가 둘 다 현재 버전으로 있어야 가족을 만들거나 합류할 수 있다.
 * 없으면 TERMS_REQUIRED(화면은 /agree로 보낸다). 동의 전에도 로그인, 동의 화면, 약관 읽기는 된다.
 */
export async function requireAccountConsents(prisma: Db, userId: string) {
  const count = await prisma.consent.count({
    where: {
      OR: ACCOUNT_CONSENTS.map((kind) => validConsentWhere(userId, kind, null)),
    },
  });
  if (count < ACCOUNT_CONSENTS.length) throw inputError("TERMS_REQUIRED");
}

/**
 * 아이 정보 등록(법정대리인 동의, PRIVACY §2): 그 가족에서 이 사람의 유효한 child_data 동의가 있으면 통과,
 * 없으면 화면이 보여준 동의 버전(shownVersion)을 받아 함께 기록한다. 둘 다 없으면 CHILD_CONSENT_REQUIRED.
 * 트랜잭션 안에서 부른다(아이 행과 동의 기록이 함께 남거나 함께 사라지게).
 */
export async function ensureChildConsent(
  tx: Db,
  userId: string,
  spaceId: string,
  shownVersion: string | undefined,
) {
  if (await hasValidConsent(tx, userId, "child_data", spaceId)) return;
  if (!shownVersion) throw inputError("CHILD_CONSENT_REQUIRED");
  if (shownVersion !== CONSENT_VERSIONS.child_data) throw inputError("CONSENT_VERSION_STALE");
  await tx.consent.create({
    data: { userId, kind: "child_data", spaceId, version: CONSENT_VERSIONS.child_data },
  });
}
