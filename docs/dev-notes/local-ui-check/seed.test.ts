// 로컬 화면 검증용 시드(커밋하지 않음). SEED=1일 때만 실행.
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";

it.runIf(process.env.SEED === "1")("seed", async () => {
  const prisma = createTestPrisma();
  await resetDb(prisma);
  const mom = await prisma.user.create({ data: { name: "지은" } });
  const dad = await prisma.user.create({ data: { name: "민수" } });
  const grandma = await prisma.user.create({ data: { name: "순자" } });
  const api = callerFor(prisma, mom.id);
  for (const k of ["terms", "privacy"] as const)
    for (const u of [mom, dad, grandma])
      await callerFor(prisma, u.id).consent.grantAccount({ kind: k, version: CONSENT_VERSIONS[k] });
  const { id: spaceId } = await api.space.create({ name: "봄별네", relationLabel: "엄마" });
  await prisma.member.create({ data: { spaceId, userId: dad.id, role: "parent", relationLabel: "아빠" } });
  await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent", relationLabel: "할머니" } });
  await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  await api.consent.grantSpace({ spaceId, kind: "child_data", version: CONSENT_VERSIONS.child_data });
  const child = await api.child.create({ spaceId, child: { nickname: "콩이", dueDate: "2027-03-01" } });
  await api.pregnancy.create({ spaceId, childId: child.id, kind: "checkup", date: "2026-09-20", note: "정밀 초음파 예약" });
  await api.pregnancy.create({ spaceId, childId: child.id, kind: "kick", date: "2026-09-28", note: "처음 느꼈어요", visibility: "family" });
  await callerFor(prisma, dad.id).consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  await callerFor(prisma, dad.id).pregnancy.create({ spaceId, childId: child.id, kind: "note", date: "2026-09-30", note: "아빠의 메모" });
  const gm = callerFor(prisma, grandma.id);
  const s1 = await gm.story.create({ spaceId, promptKey: "childhood_play", body: "고무줄놀이를 제일 잘했지" });
  await gm.story.create({ spaceId, body: "시집오던 날은 눈이 많이 왔어", title: "눈 오던 날" });
  await api.reaction.toggleStar({ spaceId, target: { type: "story", storyEntryId: s1.id } });
  await callerFor(prisma, dad.id).reaction.toggleStar({ spaceId, target: { type: "story", storyEntryId: s1.id } });
  const born = await api.child.create({ spaceId, child: { name: "김봄", birthDate: "2026-01-01" } });
  await api.moment.createDiary({ spaceId, subject: { type: "child", childId: born.id }, body: "오늘 처음 뒤집었어요" });
  const gmMember = await prisma.member.findFirstOrThrow({ where: { spaceId, userId: grandma.id } });
  await api.story.ask({ spaceId, toMemberId: gmMember.id, promptKey: "grandchildren_birth" });
  writeFileSync(process.env.SEED_OUT!, JSON.stringify({ spaceId, childId: child.id, mom: mom.id, dad: dad.id, grandma: grandma.id }));
  await prisma.$disconnect();
});
