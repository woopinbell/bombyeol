// 브라우저 e2e(npm run e2e)가 쓰는 로컬 DB 시드. E2E_SEED=1일 때만 돈다(평소 npm test에서는 건너뜀).
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { createTestPrisma, resetDb } from "../helpers/db";
import { callerFor } from "../helpers/trpc";
import { CHILD_CONSENT, createUser } from "../helpers/users";

it.runIf(process.env.E2E_SEED === "1")("e2e 시드", async () => {
  const prisma = createTestPrisma();
  await resetDb(prisma);
  const mom = await createUser(prisma, "지은");
  const grandma = await createUser(prisma, "순자");
  const api = callerFor(prisma, mom.id);
  const { id: spaceId } = await api.space.create({
    name: "e2e 가족",
    relationLabel: "엄마",
    childDataConsent: CHILD_CONSENT,
    child: { name: "봄이", birthDate: "2026-01-01" },
  });
  await prisma.member.create({
    data: { spaceId, userId: grandma.id, role: "grandparent", relationLabel: "할머니" },
  });
  writeFileSync(
    process.env.E2E_SEED_OUT!,
    JSON.stringify({ spaceId, mom: mom.id, grandma: grandma.id }),
  );
  await prisma.$disconnect();
});
