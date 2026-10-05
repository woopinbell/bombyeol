import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { ACCOUNT_LIMITS, DELETION_POLICY } from "@/lib/plan";
import { runCleanup } from "@/server/jobs/cleanup";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { callerFor } from "./helpers/trpc";
import { CHILD_CONSENT, createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const DAY = 24 * 60 * 60 * 1000;

async function family() {
  const setup = await mediaSetup(prisma);
  const { storage, spaceId } = setup;
  const join = async (role: "parent" | "grandparent") => {
    const user = await createUser(prisma, role);
    await prisma.member.create({ data: { spaceId, userId: user.id, role } });
    return { userId: user.id, api: callerFor(prisma, user.id, "203.0.113.9", storage) };
  };
  return { ...setup, dad: await join("parent"), grandma: await join("grandparent") };
}

/** 유예를 끝낸다(시간을 흘리는 대신 요청의 파기 시각을 당긴다) */
const expireGrace = (spaceId: string) =>
  prisma.deletionRequest.updateMany({
    where: { spaceId, completedAt: null, canceledAt: null },
    data: { purgeAfter: new Date(Date.now() - 1000) },
  });

describe("space.requestDeletion, cancelDeletion", () => {
  it("parent만, Space 이름을 정확히 다시 입력해야 요청된다 - 유예 30일, 다시 눌러도 같은 요청", async () => {
    const { api, spaceId, grandma } = await family();
    await expect(
      grandma.api.space.requestDeletion({ spaceId, confirmName: "가족" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(api.space.requestDeletion({ spaceId, confirmName: "가족들" })).rejects.toThrow(
      /CONFIRM_MISMATCH/,
    );
    const first = await api.space.requestDeletion({ spaceId, confirmName: "가족" });
    const days = (first.purgeAfter.getTime() - first.requestedAt.getTime()) / DAY;
    expect(days).toBe(DELETION_POLICY.spaceGraceDays);
    expect(await api.space.requestDeletion({ spaceId, confirmName: "가족" })).toEqual(first);
    expect(await prisma.deletionRequest.count()).toBe(1);
    expect(await grandma.api.space.deletionStatus({ spaceId })).toEqual(first);
  });

  it("요청하면 열린 초대를 거두고, 그 Space의 초대는 받아들여지지 않는다", async () => {
    const { api, spaceId } = await family();
    const invite = await api.invite.create({ spaceId, role: "grandparent" });
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });
    const stranger = await createUser(prisma, "새 가족");
    await expect(
      callerFor(prisma, stranger.id).invite.accept({ code: invite.code }),
    ).rejects.toThrow(/INVITE_INVALID/);
  });

  it("유예 중에는 읽기만 - 쓰기는 SPACE_DELETING, 나가기, 동의 철회, 취소는 된다", async () => {
    const { api, spaceId, dad, grandma } = await family();
    await api.consent.grantSpace({
      spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });

    await expect(api.space.get({ spaceId })).resolves.toBeTruthy();
    await expect(api.moment.list({ spaceId })).resolves.toBeTruthy();
    await expect(
      api.moment.createDiary({ spaceId, subject: { type: "family" }, body: "일기" }),
    ).rejects.toThrow(/SPACE_DELETING/);
    await expect(
      api.media.requestUpload({ spaceId, kind: "image", contentType: "image/jpeg", bytes: 10 }),
    ).rejects.toThrow(/SPACE_DELETING/);
    await expect(api.invite.create({ spaceId, role: "grandparent" })).rejects.toThrow(
      /SPACE_DELETING/,
    );

    await expect(
      api.consent.withdraw({ spaceId, kind: "pregnancy", deleteRecords: true }),
    ).resolves.toEqual({ withdrawn: true });
    await expect(grandma.api.family.leave({ spaceId })).resolves.toBeTruthy();
    await expect(dad.api.space.cancelDeletion({ spaceId })).resolves.toEqual({ canceled: true });
    expect(await api.space.deletionStatus({ spaceId })).toBeNull();
    await expect(
      api.moment.createDiary({ spaceId, subject: { type: "family" }, body: "다시 일기" }),
    ).resolves.toBeTruthy();
  });

  it("어르신은 취소할 수 없고, 유예가 끝난 뒤에는 취소되지 않는다", async () => {
    const { api, spaceId, grandma } = await family();
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });
    await expect(grandma.api.space.cancelDeletion({ spaceId })).rejects.toThrow(/FORBIDDEN/);
    await expireGrace(spaceId);
    expect(await api.space.cancelDeletion({ spaceId })).toEqual({ canceled: false });
  });
});

describe("유예 후 파기(정리 Cron, G-06)", () => {
  it("숨기고 → 파일(R2)을 지우고 → Space 행과 모든 기록을 연쇄 삭제한다", async () => {
    const { api, storage, spaceId, parent } = await family();
    const child = await api.child.create({
      spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { name: "김봄", birthDate: "2026-01-01" },
    });
    const photo = await uploadConfirmed(api, storage, spaceId);
    const moment = await api.moment.create({
      spaceId,
      subject: { type: "child", childId: child.id },
      media: [{ assetId: photo }],
    });
    await api.reaction.addComment({
      spaceId,
      target: { type: "moment", momentId: moment.id },
      body: "예뻐요",
    });
    await api.story.create({ spaceId, body: "이야기" });
    const other = await mediaSetup(prisma); // 다른 가족은 그대로여야 한다
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });

    expect((await runCleanup(prisma, storage)).spacesStarted).toBe(0); // 유예 중
    await expireGrace(spaceId);

    const first = await runCleanup(prisma, storage);
    expect(first).toMatchObject({ spacesStarted: 1, spacesCompleted: 0, purged: 1 });
    await expect(api.space.get({ spaceId })).rejects.toThrow(/NOT_FOUND/);
    expect(await storage.head(`spaces/${spaceId}/${photo}`)).toBeNull();

    const second = await runCleanup(prisma, storage);
    expect(second.spacesCompleted).toBe(1);
    expect(await prisma.space.count({ where: { id: spaceId } })).toBe(0);
    for (const count of await Promise.all([
      prisma.member.count({ where: { spaceId } }),
      prisma.child.count({ where: { spaceId } }),
      prisma.moment.count({ where: { spaceId } }),
      prisma.reaction.count({ where: { spaceId } }),
      prisma.storyEntry.count({ where: { spaceId } }),
      prisma.mediaAsset.count({ where: { spaceId } }),
      prisma.invite.count({ where: { spaceId } }),
      prisma.consent.count({ where: { spaceId } }),
      prisma.usageCounter.count({ where: { spaceId } }),
    ])) {
      expect(count).toBe(0);
    }
    const request = await prisma.deletionRequest.findFirstOrThrow({ where: { spaceId } });
    expect(request.completedAt).not.toBeNull();
    expect(await prisma.space.count({ where: { id: other.spaceId } })).toBe(1);
    expect(await prisma.user.count({ where: { id: parent.id } })).toBe(1); // 계정은 그대로
  });

  it("G-11: 파기가 끝난 Space도 재생성 쿨다운 동안 만든 수에 센다", async () => {
    const { api, storage, spaceId } = await family();
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });
    await expireGrace(spaceId);
    await runCleanup(prisma, storage);
    expect(await prisma.space.count({ where: { id: spaceId } })).toBe(0);
    for (let i = 1; i < ACCOUNT_LIMITS.spacesCreatedPerUser; i++) {
      await api.space.create({ name: `새 가족 ${i}` });
    }
    await expect(api.space.create({ name: "하나 더" })).rejects.toThrow(/SPACE_CREATE_LIMIT/);
  });
});
