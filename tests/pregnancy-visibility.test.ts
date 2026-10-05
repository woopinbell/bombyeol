import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { PREGNANCY_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { callerFor } from "./helpers/trpc";
import { CHILD_CONSENT, createUser } from "./helpers/users";

// PRIVACY §3: visibility는 서버가 강제한다. parents_only 기록은 parent가 아닌 멤버의
// 어떤 응답(목록, 상세, 페이지 커서, 다른 기록에 붙이기)에도 드러나지 않아야 한다.

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const { api, storage, spaceId } = setup;
  await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  const { id: childId } = await api.child.create({
    spaceId,
    childDataConsent: CHILD_CONSENT,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  const join = async (role: "grandparent" | "relative") => {
    const user = await createUser(prisma, role);
    const member = await prisma.member.create({ data: { spaceId, userId: user.id, role } });
    return { member, api: callerFor(prisma, user.id, "203.0.113.9", storage) };
  };
  const photo = await uploadConfirmed(api, storage, spaceId);
  const hidden = await api.pregnancy.create({
    spaceId,
    childId,
    kind: "ultrasound",
    date: "2026-09-20",
    note: "parents_only 메모",
    photoAssetId: photo,
  });
  const shared = await api.pregnancy.create({
    spaceId,
    childId,
    kind: "kick",
    date: "2026-09-21",
    note: "가족에게 알린 태동",
    visibility: "family",
  });
  return {
    ...setup,
    childId,
    photo,
    hidden,
    shared,
    grandma: await join("grandparent"),
    uncle: await join("relative"),
  };
}

describe("pregnancy parents_only 비노출", () => {
  it("parent는 전부, 그 외 멤버는 가족 공개 기록만 목록에서 본다", async () => {
    const { api, spaceId, childId, hidden, shared, grandma, uncle } = await family();
    const all = await api.pregnancy.list({ spaceId, childId });
    expect(all.items.map((r) => r.id)).toEqual([shared.id, hidden.id]);
    for (const viewer of [grandma.api, uncle.api]) {
      const { items, nextCursor } = await viewer.pregnancy.list({ spaceId, childId });
      expect(items.map((r) => r.id)).toEqual([shared.id]);
      expect(nextCursor).toBeNull();
      expect(JSON.stringify(items)).not.toContain("parents_only 메모");
    }
  });

  it("숨은 기록을 id로 찾으면 없는 기록과 똑같이 NOT_FOUND", async () => {
    const { spaceId, hidden, shared, grandma, uncle } = await family();
    for (const viewer of [grandma.api, uncle.api]) {
      const missing = await viewer.pregnancy
        .get({ spaceId, recordId: "does-not-exist" })
        .catch((e: unknown) => e);
      const concealed = await viewer.pregnancy
        .get({ spaceId, recordId: hidden.id })
        .catch((e: unknown) => e);
      expect(concealed).toMatchObject({ code: "NOT_FOUND", message: "ITEM_NOT_FOUND" });
      expect(concealed).toMatchObject({
        code: (missing as { code: string }).code,
        message: (missing as { message: string }).message,
      });
      await expect(viewer.pregnancy.get({ spaceId, recordId: shared.id })).resolves.toMatchObject({
        id: shared.id,
        visibility: "family",
        photo: null,
      });
    }
  });

  it("숨은 기록이 한 페이지를 넘게 많아도 다른 멤버의 페이지, 커서에 흔적이 없다", async () => {
    const { api, spaceId, childId, shared, grandma } = await family();
    await prisma.pregnancyRecord.createMany({
      data: Array.from({ length: PREGNANCY_POLICY.pageSize + 5 }, (_, i) => ({
        spaceId,
        childId,
        kind: "kick" as const,
        date: new Date(Date.UTC(2026, 8, 22, 0, 0, 0) + i * 1000),
        createdById: shared.createdBy.id,
      })),
    });
    const parentPage = await api.pregnancy.list({ spaceId, childId });
    expect(parentPage.nextCursor).not.toBeNull();
    const { items, nextCursor } = await grandma.api.pregnancy.list({ spaceId, childId });
    expect(items.map((r) => r.id)).toEqual([shared.id]);
    expect(nextCursor).toBeNull();
  });

  it("parent가 아니면 고치기, 지우기, 공개 범위 바꾸기를 할 수 없다", async () => {
    const { spaceId, hidden, shared, grandma, uncle } = await family();
    for (const viewer of [grandma.api, uncle.api]) {
      for (const recordId of [hidden.id, shared.id]) {
        await expect(
          viewer.pregnancy.update({ spaceId, recordId, visibility: "family" }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(viewer.pregnancy.delete({ spaceId, recordId })).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
      }
    }
    expect(await prisma.pregnancyRecord.count({ where: { visibility: "parents_only" } })).toBe(1);
  });

  it("숨은 초음파 사진은 다른 기록에 붙여 우회 공개하거나 지울 수 없다", async () => {
    const { spaceId, childId, photo, grandma } = await family();
    await expect(
      grandma.api.story.create({ spaceId, body: "x", photoAssetId: photo }),
    ).rejects.toMatchObject({ message: "ASSET_IN_USE" });
    await expect(
      grandma.api.moment.create({
        spaceId,
        subject: { type: "family" },
        media: [{ assetId: photo }],
      }),
    ).rejects.toMatchObject({ message: "ASSET_IN_USE" });
    await expect(grandma.api.media.delete({ spaceId, assetId: photo })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const { items } = await grandma.api.pregnancy.list({ spaceId, childId });
    expect(JSON.stringify(items)).not.toContain(photo);
  });

  it("공개 범위, 역할이 바뀌면 다음 요청부터 바로 반영된다", async () => {
    const { api, spaceId, childId, hidden, shared, grandma } = await family();
    await api.pregnancy.update({ spaceId, recordId: shared.id, visibility: "parents_only" });
    expect((await grandma.api.pregnancy.list({ spaceId, childId })).items).toEqual([]);

    // grandparent가 parent가 되면 보이고, 다시 내려가면 안 보인다
    await prisma.member.update({ where: { id: grandma.member.id }, data: { role: "parent" } });
    await expect(
      grandma.api.pregnancy.get({ spaceId, recordId: hidden.id }),
    ).resolves.toMatchObject({ id: hidden.id });
    await prisma.member.update({ where: { id: grandma.member.id }, data: { role: "relative" } });
    await expect(grandma.api.pregnancy.get({ spaceId, recordId: hidden.id })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );

    // 멤버에서 빠지면 Space 자체가 보이지 않는다
    await prisma.member.delete({ where: { id: grandma.member.id } });
    await expect(grandma.api.pregnancy.list({ spaceId, childId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("다른 Space의 parent는 가족 공개 기록도 볼 수 없다", async () => {
    const { spaceId, childId, shared } = await family();
    const other = await mediaSetup(prisma);
    await expect(other.api.pregnancy.list({ spaceId, childId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      other.api.pregnancy.get({ spaceId: other.spaceId, recordId: shared.id }),
    ).rejects.toMatchObject({ message: "ITEM_NOT_FOUND" });
  });

  it("쓴 parent가 동의를 철회하면 가족 공개가 거둬진다", async () => {
    const { api, spaceId, childId, grandma } = await family();
    await api.consent.withdraw({ spaceId, kind: "pregnancy" });
    expect((await grandma.api.pregnancy.list({ spaceId, childId })).items).toEqual([]);
  });
});
