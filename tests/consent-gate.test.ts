import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";
import { CHILD_CONSENT, createUser, grantAccountConsents } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 가입 동의 없이 막 로그인한 사용자 */
async function fresh(name = "새 사용자") {
  const user = await prisma.user.create({ data: { name } });
  return { user, api: callerFor(prisma, user.id) };
}

describe("가입 동의 게이트(약관, 처리방침)", () => {
  it("동의 전에는 가족을 만들 수 없고, 둘 다 현재 버전으로 동의하면 된다", async () => {
    const { user, api } = await fresh();
    await expect(api.space.create({ name: "가족" })).rejects.toThrow("TERMS_REQUIRED");
    // 하나만, 또는 옛 버전은 동의가 아니다
    await api.consent.grantAccount({ kind: "terms", version: CONSENT_VERSIONS.terms });
    await expect(api.space.create({ name: "가족" })).rejects.toThrow("TERMS_REQUIRED");
    await prisma.consent.create({
      data: { userId: user.id, kind: "privacy", version: "2000-01-01" },
    });
    await expect(api.space.create({ name: "가족" })).rejects.toThrow("TERMS_REQUIRED");
    await api.consent.grantAccount({ kind: "privacy", version: CONSENT_VERSIONS.privacy });
    await expect(api.space.create({ name: "가족" })).resolves.toMatchObject({
      id: expect.any(String),
    });
  });

  it("동의 전에는 초대로 합류할 수 없고 초대도 쓰이지 않는다", async () => {
    const mom = await createUser(prisma, "엄마");
    const { id: spaceId } = await callerFor(prisma, mom.id).space.create({ name: "가족" });
    const { code } = await callerFor(prisma, mom.id).invite.create({
      spaceId,
      role: "grandparent",
    });
    const { user, api } = await fresh("할머니");
    await expect(api.invite.accept({ code })).rejects.toThrow("TERMS_REQUIRED");
    expect(await prisma.invite.count({ where: { code, usedAt: null } })).toBe(1);
    await grantAccountConsents(prisma, user.id);
    await expect(api.invite.accept({ code })).resolves.toMatchObject({ spaceId });
  });

  it("철회된 동의는 동의가 아니다", async () => {
    const user = await createUser(prisma, "엄마");
    await prisma.consent.updateMany({
      where: { userId: user.id, kind: "terms" },
      data: { withdrawnAt: new Date() },
    });
    await expect(callerFor(prisma, user.id).space.create({ name: "가족" })).rejects.toThrow(
      "TERMS_REQUIRED",
    );
  });
});

describe("아이 정보 동의(법정대리인, child_data)", () => {
  it("가족을 만들며 아이를 함께 등록하면 동의가 필요하고, 없으면 가족도 만들어지지 않는다", async () => {
    const mom = await createUser(prisma, "엄마");
    const api = callerFor(prisma, mom.id);
    await expect(api.space.create({ name: "가족", child: { nickname: "콩이" } })).rejects.toThrow(
      "CHILD_CONSENT_REQUIRED",
    );
    expect(await prisma.space.count()).toBe(0);
    await expect(
      api.space.create({
        name: "가족",
        childDataConsent: "2000-01-01",
        child: { nickname: "콩이" },
      }),
    ).rejects.toThrow("CONSENT_VERSION_STALE");
    const { id: spaceId } = await api.space.create({
      name: "가족",
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "콩이" },
    });
    expect(
      await prisma.consent.findMany({
        where: { userId: mom.id, kind: "child_data" },
        select: { spaceId: true, version: true },
      }),
    ).toEqual([{ spaceId, version: CHILD_CONSENT }]);
    // 아이 없이 만든 가족은 아이 정보 동의가 필요 없다
    await expect(api.space.create({ name: "다른 가족" })).resolves.toBeTruthy();
  });

  it("아이 더하기: 이 가족에서 처음이면 동의를 함께 보내고, 그 뒤로는 필요 없다. 다른 엄마 아빠는 따로 동의한다", async () => {
    const mom = await createUser(prisma, "엄마");
    const dad = await createUser(prisma, "아빠");
    const { id: spaceId } = await callerFor(prisma, mom.id).space.create({ name: "가족" });
    await prisma.member.create({ data: { spaceId, userId: dad.id, role: "parent" } });
    const momApi = callerFor(prisma, mom.id);
    await expect(momApi.child.create({ spaceId, child: { nickname: "콩이" } })).rejects.toThrow(
      "CHILD_CONSENT_REQUIRED",
    );
    expect(await prisma.child.count()).toBe(0);
    await momApi.child.create({
      spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "콩이" },
    });
    await expect(
      momApi.child.create({ spaceId, child: { nickname: "별이" } }),
    ).resolves.toBeTruthy();
    await expect(
      callerFor(prisma, dad.id).child.create({ spaceId, child: { nickname: "봄이" } }),
    ).rejects.toThrow("CHILD_CONSENT_REQUIRED");
  });
});
