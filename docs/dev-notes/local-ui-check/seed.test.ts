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
  const grandpa = await prisma.user.create({ data: { name: "김영수사랑하는우리할아버지" } });
  const solo = await prisma.user.create({ data: { name: "새로온사람" } });
  const nofam = await prisma.user.create({ data: { name: "처음온사람" } });
  const api = callerFor(prisma, mom.id);
  for (const k of ["terms", "privacy"] as const)
    for (const u of [mom, dad, grandma, grandpa, solo, nofam])
      await callerFor(prisma, u.id).consent.grantAccount({ kind: k, version: CONSENT_VERSIONS[k] });
  const { id: spaceId } = await api.space.create({ name: "지우네 가족", relationLabel: "엄마" });
  await prisma.member.create({ data: { spaceId, userId: dad.id, role: "parent", relationLabel: "아빠" } });
  await prisma.member.create({ data: { spaceId, userId: grandma.id, role: "grandparent", relationLabel: "할머니" } });
  await prisma.member.create({ data: { spaceId, userId: grandpa.id, role: "grandparent", relationLabel: "외할아버지(제주)" } });
  await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  await api.consent.grantSpace({ spaceId, kind: "child_data", version: CONSENT_VERSIONS.child_data });
  const child = await api.child.create({ spaceId, child: { nickname: "콩이", dueDate: "2027-03-01" } });
  await api.pregnancy.create({ spaceId, childId: child.id, kind: "checkup", date: "2026-09-20", note: "정밀 초음파 예약" });
  await api.pregnancy.create({ spaceId, childId: child.id, kind: "kick", date: "2026-09-28", note: "처음 느꼈어요", visibility: "family" });
  await callerFor(prisma, dad.id).consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  await callerFor(prisma, dad.id).pregnancy.create({ spaceId, childId: child.id, kind: "note", date: "2026-09-30", note: "아빠의 메모" });
  const gm = callerFor(prisma, grandma.id);
  const s1 = await gm.story.create({ spaceId, promptKey: "childhood_play", body: "고무줄놀이를 제일 잘했지. 동네 아이들이 다 모여서 해가 질 때까지 놀았어. 저녁 먹으라고 부르는 소리가 나야 집에 들어갔지." });
  await gm.story.create({ spaceId, body: "시집오던 날은 눈이 많이 왔어", title: "눈 오던 날" });
  await callerFor(prisma, grandpa.id).story.create({ spaceId, body: "제주 바다에서 처음 수영을 배웠단다. 아버지가 등에 태워 주셨지.", title: "바다에서 처음 헤엄친 날, 아버지 등에 업혀서" });
  await api.reaction.toggleStar({ spaceId, target: { type: "story", storyEntryId: s1.id } });
  await callerFor(prisma, dad.id).reaction.toggleStar({ spaceId, target: { type: "story", storyEntryId: s1.id } });
  const born = await api.child.create({ spaceId, child: { name: "김지우", birthDate: "2026-01-01" } });
  const pet = await api.pet.create({ spaceId, name: "보리", species: "dog", breed: "진돗개", adoptedAt: "2024-05-05" });
  await api.moment.createDiary({ spaceId, subject: { type: "child", childId: born.id }, body: "오늘 처음 뒤집었어요", takenAt: new Date("2026-10-03T09:00:00+09:00") });
  await api.moment.createDiary({ spaceId, subject: { type: "family" }, body: "주말에 다 같이 공원에 갔어요. 지우는 처음 보는 비둘기를 한참 바라보다가 손을 뻗었고, 보리는 산책이 너무 좋아서 꼬리를 쉬지 않고 흔들었어요.", takenAt: new Date("2026-10-04T15:00:00+09:00") });
  const m1 = await api.milestone.create({ spaceId, subject: { type: "child", childId: born.id }, kind: "roll", value: {}, recordedAt: "2026-10-03", first: true });
  await api.milestone.create({ spaceId, subject: { type: "child", childId: born.id }, kind: "height", value: { value: 72.5 }, recordedAt: "2026-10-01" });
  await api.milestone.create({ spaceId, subject: { type: "pet", petId: pet.id }, kind: "walk", value: { note: "한강 산책" }, recordedAt: "2026-10-02" });
  await gm.reaction.toggleLike({ target: { type: "milestone", milestoneId: m1.id }, spaceId } as never);
  await gm.reaction.addComment({ spaceId, target: { type: "milestone", milestoneId: m1.id }, body: "우리 지우 장하다! 할머니가 다음 주에 보러 갈게" });
  await api.calendar.create({ spaceId, title: "할머니 생신", kind: "birthday", when: { allDay: true, startDate: "2026-10-17" }, recurrence: "yearly" });
  await api.calendar.create({ spaceId, title: "추석 가족 모임(큰집, 저녁 6시)", kind: "gathering", when: { allDay: true, startDate: "2026-10-11" } });
  const gmMember = await prisma.member.findFirstOrThrow({ where: { spaceId, userId: grandma.id } });
  await api.story.ask({ spaceId, toMemberId: gmMember.id, promptKey: "grandchildren_birth" });
  const { id: emptySpaceId } = await callerFor(prisma, solo.id).space.create({ name: "할머니 할아버지와 함께 크는 우리 아이들", relationLabel: "엄마" });
  writeFileSync(process.env.SEED_OUT!, JSON.stringify({ spaceId, childId: child.id, bornId: born.id, petId: pet.id, mom: mom.id, dad: dad.id, grandma: grandma.id, grandpa: grandpa.id, solo: solo.id, nofam: nofam.id, emptySpaceId }));
  await prisma.$disconnect();
});
