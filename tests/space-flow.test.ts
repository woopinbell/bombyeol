import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { callerFor } from "./helpers/trpc";
import { CHILD_CONSENT, signedUp } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

// 실제 사용 흐름: 카카오 로그인 → 가족 만들기 → 초대 → 양가 조부모 합류 → 역할별 권한
describe("가족 생성, 초대, 역할 통합", () => {
  it("부모가 만든 가족에 조부모가 합류하고, 역할에 따라 할 수 있는 일이 다르다", async () => {
    const mom = await signedUp(prisma, {
      provider: "kakao",
      providerAccountId: "m",
      name: "엄마",
    });
    const dad = await signedUp(prisma, {
      provider: "google",
      providerAccountId: "d",
      name: "아빠",
    });
    const grandma = await signedUp(prisma, {
      provider: "kakao",
      providerAccountId: "g1",
      name: "할머니",
    });
    const grandpa = await signedUp(prisma, {
      provider: "kakao",
      providerAccountId: "g2",
      name: "외할아버지",
    });

    const momApi = callerFor(prisma, mom.id);
    const { id: spaceId } = await momApi.space.create({
      name: "봄이네",
      relationLabel: "엄마",
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "봄이", dueDate: "2027-04-01" },
    });

    // 배우자(parent)와 양가 조부모 초대
    const dadInvite = await momApi.invite.create({
      spaceId,
      role: "parent",
      relationLabel: "아빠",
    });
    const g1 = await momApi.invite.create({
      spaceId,
      role: "grandparent",
      relationLabel: "할머니",
    });
    const g2 = await momApi.invite.create({
      spaceId,
      role: "grandparent",
      relationLabel: "외할아버지",
    });

    await callerFor(prisma, dad.id).invite.accept({ code: dadInvite.code });
    await callerFor(prisma, grandma.id).invite.accept({ code: g1.code });
    const grandpaApi = callerFor(prisma, grandpa.id);
    await grandpaApi.invite.accept({ code: g2.code });

    // 모두 같은 가족을 본다
    const view = await grandpaApi.space.get({ spaceId });
    expect(view.members.map((m) => `${m.role}:${m.relationLabel}`)).toEqual([
      "parent:엄마",
      "parent:아빠",
      "grandparent:할머니",
      "grandparent:외할아버지",
    ]);
    expect(view.children.map((c) => c.nickname)).toEqual(["봄이"]);
    expect(await momApi.invite.list({ spaceId })).toEqual([]);

    // 아빠(parent)는 아이를 등록하고 초대할 수 있다
    const dadApi = callerFor(prisma, dad.id);
    await expect(
      dadApi.child.create({
        spaceId,
        childDataConsent: CHILD_CONSENT,
        child: { name: "별이", birthDate: "2024-12-25" },
      }),
    ).resolves.toMatchObject({ status: "born" });

    // 조부모는 열람만: 아이 등록, 초대, 회수 불가
    await expect(
      grandpaApi.child.create({
        spaceId,
        childDataConsent: CHILD_CONSENT,
        child: { name: "x", birthDate: "2024-01-01" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(grandpaApi.invite.create({ spaceId, role: "grandparent" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(grandpaApi.invite.list({ spaceId })).rejects.toMatchObject({ code: "FORBIDDEN" });

    // 다른 가족은 이 Space를 볼 수 없다
    const stranger = await signedUp(prisma, { provider: "kakao", providerAccountId: "s" });
    await expect(callerFor(prisma, stranger.id).space.get({ spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("한 조부모가 양가(두 Space)에 각각 합류할 수 있다", async () => {
    const grandma = await signedUp(prisma, { provider: "kakao", providerAccountId: "g" });
    const spaces = [];
    for (const name of ["큰아들네", "딸네"]) {
      const parent = await signedUp(prisma, { provider: "kakao", providerAccountId: name });
      const api = callerFor(prisma, parent.id);
      const { id } = await api.space.create({ name });
      const invite = await api.invite.create({ spaceId: id, role: "grandparent" });
      await callerFor(prisma, grandma.id).invite.accept({ code: invite.code });
      spaces.push(id);
    }
    const mine = await callerFor(prisma, grandma.id).space.list();
    expect(mine.map((m) => m.space.name)).toEqual(["큰아들네", "딸네"]);
    expect(mine.every((m) => m.role === "grandparent")).toBe(true);
  });
});
