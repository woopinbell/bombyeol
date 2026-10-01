import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { findOrCreateUser } from "@/server/auth/users";
import { runCleanup } from "@/server/jobs/cleanup";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 카카오로 가입한 엄마가 만든 가족 + 아빠·할머니 */
async function family() {
  const mom = await findOrCreateUser(prisma, {
    provider: "kakao",
    providerAccountId: "k-mom",
    name: "엄마",
  });
  const setup = await mediaSetup(prisma);
  // mediaSetup의 부모 대신 카카오 계정이 있는 엄마로 Space를 만든다
  const api = callerFor(prisma, mom.id, "203.0.113.1", setup.storage);
  const { id: spaceId } = await api.space.create({ name: "우리집" });
  const join = async (role: "parent" | "grandparent", name: string) => {
    const user = await prisma.user.create({ data: { name } });
    const member = await prisma.member.create({ data: { spaceId, userId: user.id, role } });
    return {
      userId: user.id,
      member,
      api: callerFor(prisma, user.id, "203.0.113.9", setup.storage),
    };
  };
  return { storage: setup.storage, api, momId: mom.id, spaceId, join };
}

describe("user.deleteAccount", () => {
  it("확인 없이 부르면 거부한다", async () => {
    const { api } = await family();
    // @ts-expect-error confirm은 true만 받는다
    await expect(api.user.deleteAccount({ confirm: false })).rejects.toThrow();
  });

  it("개인 식별 정보를 지우고 가족의 기록은 남긴다", async () => {
    const f = await family();
    await f.join("parent", "아빠");
    const grandma = await f.join("grandparent", "할머니");
    await f.api.consent.grantAccount({ kind: "terms", version: CONSENT_VERSIONS.terms });
    await f.api.consent.grantSpace({
      spaceId: f.spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    await f.api.push.register({ token: "fcm-token-mom-0001:APA91b" });
    await f.api.invite.create({ spaceId: f.spaceId, role: "grandparent" });
    const kong = await f.api.child.create({
      spaceId: f.spaceId,
      child: { nickname: "콩이", dueDate: "2027-03-01" },
    });
    const ultrasound = await uploadConfirmed(f.api, f.storage, f.spaceId);
    await f.api.pregnancy.create({
      spaceId: f.spaceId,
      childId: kong.id,
      kind: "ultrasound",
      date: "2026-09-20",
      photoAssetId: ultrasound,
    });
    const diary = await f.api.moment.createDiary({
      spaceId: f.spaceId,
      subject: { type: "family" },
      body: "가족 일기",
    });
    await f.api.story.ask({
      spaceId: f.spaceId,
      toMemberId: grandma.member.id,
      promptKey: "food_signature",
    });

    expect(await f.api.user.deleteAccount({ confirm: true })).toEqual({
      ok: true,
      spacesPurged: 0,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: f.momId } });
    expect(user.name).toBeNull();
    expect(user.deletedAt).not.toBeNull();
    for (const count of await Promise.all([
      prisma.account.count({ where: { userId: f.momId } }),
      prisma.pushToken.count({ where: { userId: f.momId } }),
      prisma.consent.count({ where: { userId: f.momId } }),
      prisma.member.count({ where: { userId: f.momId } }),
      prisma.invite.count({ where: { createdById: f.momId, usedAt: null } }),
      prisma.pregnancyRecord.count({ where: { createdById: f.momId } }),
    ])) {
      expect(count).toBe(0);
    }
    const photo = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: ultrasound } });
    expect(photo.status).toBe("purging");
    // 가족의 기록은 남는다(작성자는 묘비 User)
    expect(await prisma.moment.count({ where: { id: diary.id } })).toBe(1);
    expect(await prisma.storyAsk.count()).toBe(1);
    expect(await prisma.child.count()).toBe(1);
    expect(
      await prisma.deletionRequest.count({ where: { kind: "account", userId: f.momId } }),
    ).toBe(1);
  });

  it("이미 로그인된 세션은 다음 요청부터 막히고, 같은 카카오 계정으로 다시 오면 새 사용자다", async () => {
    const f = await family();
    await f.join("parent", "아빠");
    await f.api.user.deleteAccount({ confirm: true });
    await expect(f.api.user.me()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(f.api.space.list()).rejects.toThrow(/UNAUTHORIZED/);
    const again = await findOrCreateUser(prisma, {
      provider: "kakao",
      providerAccountId: "k-mom",
      name: "엄마",
    });
    expect(again.id).not.toBe(f.momId);
    expect(again.deletedAt).toBeNull();
  });

  it("다른 가족이 남은 Space의 유일한 parent면 막는다 — 다른 parent가 있거나 삭제 요청 중이면 된다", async () => {
    const f = await family();
    await f.join("grandparent", "할머니");
    await expect(f.api.user.deleteAccount({ confirm: true })).rejects.toThrow(/LAST_PARENT/);
    expect(await prisma.account.count({ where: { userId: f.momId } })).toBe(1); // 아무것도 지워지지 않음

    await f.api.space.requestDeletion({ spaceId: f.spaceId, confirmName: "우리집" });
    await expect(f.api.user.deleteAccount({ confirm: true })).resolves.toMatchObject({ ok: true });
  });

  it("혼자 남은 Space(기념 상태인 분만 남은 경우 포함)는 유예 없이 파기된다", async () => {
    const f = await family();
    const grandpa = await f.join("grandparent", "할아버지");
    await prisma.memorialProfile.create({
      data: { spaceId: f.spaceId, memberId: grandpa.member.id, createdById: f.momId },
    });
    expect(await f.api.user.deleteAccount({ confirm: true })).toEqual({
      ok: true,
      spacesPurged: 1,
    });
    await runCleanup(prisma, f.storage);
    await runCleanup(prisma, f.storage);
    expect(await prisma.space.count({ where: { id: f.spaceId } })).toBe(0);
  });
});
