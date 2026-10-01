import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { runCleanup } from "@/server/jobs/cleanup";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

// G-06: 삭제 후 잔존 데이터 0. 표 목록을 DB에서 직접 읽어 검사하므로, 앞으로 spaceId·userId 열을 가진
// 모델이 늘어도 삭제 연쇄에서 빠지면 이 테스트가 잡는다.
// 구독 해지 호출 검증은 Phase 8(Subscription 모델)에서 이 파일에 더한다 — TODO(G-06).

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 기록으로 남기는 것이 의도인 표(id만, 개인정보 없음) */
const KEPT = new Set(["DeletionRequest"]);

async function tablesWith(column: string) {
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = ${column}`;
  return rows.map((r) => r.table_name).filter((t) => !KEPT.has(t));
}

async function leftovers(db: PrismaClient, column: string, value: string) {
  const found: Record<string, number> = {};
  for (const table of await tablesWith(column)) {
    const [{ n }] = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `select count(*) as n from "${table}" where "${column}" = $1`,
      value,
    );
    if (Number(n) > 0) found[table] = Number(n);
  }
  return found;
}

/** 모델을 고루 채운 가족 */
async function richFamily() {
  const setup = await mediaSetup(prisma);
  const { api, storage, spaceId } = setup;
  const photo = () => uploadConfirmed(api, storage, spaceId);
  const grandmaUser = await prisma.user.create({ data: { name: "할머니" } });
  const grandmaMember = await prisma.member.create({
    data: { spaceId, userId: grandmaUser.id, role: "grandparent", relationLabel: "할머니" },
  });
  const grandma = callerFor(prisma, grandmaUser.id, "203.0.113.9", storage);
  const dadUser = await prisma.user.create({ data: { name: "아빠" } });
  await prisma.member.create({ data: { spaceId, userId: dadUser.id, role: "parent" } });
  const dad = callerFor(prisma, dadUser.id, "203.0.113.8", storage);

  await api.consent.grantAccount({ kind: "terms", version: CONSENT_VERSIONS.terms });
  await dad.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  await dad.push.register({ token: "fcm-token-dad-0001:APA91b" });
  await prisma.inviteCodeAttempt.create({ data: { userId: dadUser.id, ip: "203.0.113.8" } });
  await api.invite.create({ spaceId, role: "grandparent" });

  const kong = await api.child.create({
    spaceId,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  await dad.pregnancy.create({
    spaceId,
    childId: kong.id,
    kind: "ultrasound",
    date: "2026-09-20",
    photoAssetId: await photo(),
  });
  const pet = await api.pet.create({
    spaceId,
    name: "보리",
    species: "dog",
    coverAssetId: await photo(),
  });
  const moment = await api.moment.create({
    spaceId,
    subject: { type: "pet", petId: pet.id },
    media: [{ assetId: await photo(), thumbnailAssetId: await photo() }],
  });
  await dad.reaction.toggleLike({ spaceId, target: { type: "moment", momentId: moment.id } });
  await api.milestone.create({
    spaceId,
    subject: { type: "pet", petId: pet.id },
    kind: "weight",
    value: { value: 7.2 },
    recordedAt: "2026-08-01",
  });
  const story = await grandma.story.create({
    spaceId,
    body: "옛날 이야기",
    photoAssetId: await photo(),
  });
  await dad.reaction.toggleStar({ spaceId, target: { type: "story", storyEntryId: story.id } });
  await dad.reaction.addComment({
    spaceId,
    target: { type: "story", storyEntryId: story.id },
    body: "또 들려주세요",
  });
  await api.story.ask({ spaceId, toMemberId: grandmaMember.id, promptKey: "food_signature" });
  await api.calendar.create({
    spaceId,
    title: "가족 모임",
    kind: "gathering",
    when: { allDay: true, startDate: "2026-12-24" },
  });
  await api.memorial.mark({
    spaceId,
    target: { type: "pet", petId: pet.id },
    passedAt: "2026-09-01",
  });
  return { ...setup, dadUser, dad };
}

describe("G-06 삭제 후 잔존 데이터 0", () => {
  it("계정 삭제: userId 열이 있는 어떤 표에도 그 사람의 행이 없다(작성자 FK는 비식별 묘비)", async () => {
    const f = await richFamily();
    await f.dad.user.deleteAccount({ confirm: true });
    expect(await leftovers(prisma, "userId", f.dadUser.id)).toEqual({});
    const tomb = await prisma.user.findUniqueOrThrow({ where: { id: f.dadUser.id } });
    expect(tomb.name).toBeNull();
    expect(tomb.deletedAt).not.toBeNull();
  });

  it("Space 삭제: spaceId 열이 있는 어떤 표에도 행이 없고, R2에도 그 Space의 객체가 없다", async () => {
    const f = await richFamily();
    await f.api.space.requestDeletion({ spaceId: f.spaceId, confirmName: "가족" });
    await prisma.deletionRequest.updateMany({ data: { purgeAfter: new Date(Date.now() - 1000) } });
    for (let i = 0; i < 5; i++) await runCleanup(prisma, f.storage);

    expect(await prisma.space.count({ where: { id: f.spaceId } })).toBe(0);
    expect(await leftovers(prisma, "spaceId", f.spaceId)).toEqual({});
    const objects = [...f.storage.objects.keys()].filter((k) => k.includes(f.spaceId));
    expect(objects).toEqual([]);
    const request = await prisma.deletionRequest.findFirstOrThrow({
      where: { spaceId: f.spaceId },
    });
    expect(request.completedAt).not.toBeNull();
  });
});
