import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { CLEANUP_POLICY, runCleanup } from "@/server/jobs/cleanup";
import { spaceUsage } from "@/server/media/usage";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const { api, storage, spaceId } = setup;
  const kong = await api.child.create({
    spaceId,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  const bom = await api.child.create({ spaceId, child: { name: "김봄", birthDate: "2026-01-01" } });
  const photo = () => uploadConfirmed(api, storage, spaceId);
  return { ...setup, kong, bom, photo };
}

const statuses = async (ids: string[]) =>
  (await prisma.mediaAsset.findMany({ where: { id: { in: ids } }, select: { status: true } })).map(
    (a) => a.status,
  );

describe("child.delete", () => {
  it("parent만, 이름(또는 태명)을 정확히 다시 입력해야 지운다", async () => {
    const { api, storage, spaceId, kong } = await family();
    const grandma = await addMember(prisma, spaceId, "grandparent", storage);
    await expect(
      grandma.child.delete({ spaceId, childId: kong.id, confirmName: "콩이" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      api.child.delete({ spaceId, childId: kong.id, confirmName: "콩" }),
    ).rejects.toThrow(/CONFIRM_MISMATCH/);
    expect(await prisma.child.count({ where: { id: kong.id } })).toBe(1);
  });

  it("그 아이의 기록·마일스톤·임신 기록을 지우고 파일은 purging으로 넘긴다(다른 아이는 그대로)", async () => {
    const { api, spaceId, kong, bom, photo } = await family();
    await api.consent.grantSpace({
      spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    const ultrasound = await photo();
    await api.pregnancy.create({
      spaceId,
      childId: kong.id,
      kind: "ultrasound",
      date: "2026-09-20",
      photoAssetId: ultrasound,
    });
    const bomPhoto = await photo();
    const bomThumb = await photo();
    const moment = await api.moment.create({
      spaceId,
      subject: { type: "child", childId: bom.id },
      media: [{ assetId: bomPhoto, thumbnailAssetId: bomThumb }],
    });
    await api.reaction.toggleLike({ spaceId, target: { type: "moment", momentId: moment.id } });
    await api.milestone.create({
      spaceId,
      subject: { type: "child", childId: bom.id },
      kind: "height",
      value: { value: 68.5 },
      recordedAt: "2026-07-01",
    });
    const kongMoment = await photo();
    await api.moment.create({
      spaceId,
      subject: { type: "child", childId: kong.id },
      media: [{ assetId: kongMoment }],
    });

    const before = await spaceUsage(prisma, spaceId);
    const result = await api.child.delete({ spaceId, childId: bom.id, confirmName: "김봄" });
    expect(result).toEqual({ ok: true, purgingFiles: 2 });
    expect(await prisma.child.count({ where: { id: bom.id } })).toBe(0);
    expect(await prisma.moment.count({ where: { id: moment.id } })).toBe(0);
    expect(await prisma.milestone.count({ where: { childId: bom.id } })).toBe(0);
    expect(await prisma.reaction.count()).toBe(0);
    expect(await statuses([bomPhoto, bomThumb])).toEqual(["purging", "purging"]);
    expect((await spaceUsage(prisma, spaceId)).confirmedBytes).toBe(before.confirmedBytes - 200);

    // 다른 아이는 그대로, 태명 아이 삭제는 초음파 파일까지
    expect(await statuses([kongMoment])).toEqual(["confirmed"]);
    await api.child.delete({ spaceId, childId: kong.id, confirmName: "콩이" });
    expect(await prisma.pregnancyRecord.count()).toBe(0);
    expect(await statuses([ultrasound, kongMoment])).toEqual(["purging", "purging"]);
  });

  it("다른 Space의 아이는 없는 아이처럼 NOT_FOUND", async () => {
    const a = await family();
    const b = await mediaSetup(prisma);
    await expect(
      b.api.child.delete({ spaceId: b.spaceId, childId: a.kong.id, confirmName: "콩이" }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe("pet.delete", () => {
  it("기록·커버·기념 정보는 지우고, 반려동물에 붙인 이야기는 남긴다", async () => {
    const { api, spaceId, photo } = await family();
    const cover = await photo();
    const pet = await api.pet.create({
      spaceId,
      name: "보리",
      species: "dog",
      coverAssetId: cover,
    });
    const walk = await photo();
    await api.moment.create({
      spaceId,
      subject: { type: "pet", petId: pet.id },
      media: [{ assetId: walk }],
    });
    const story = await api.story.create({ spaceId, body: "보리와 산책하던 길", petId: pet.id });
    await expect(api.pet.delete({ spaceId, petId: pet.id, confirmName: "보리야" })).rejects.toThrow(
      /CONFIRM_MISMATCH/,
    );
    expect(await api.pet.delete({ spaceId, petId: pet.id, confirmName: "보리" })).toEqual({
      ok: true,
      purgingFiles: 2,
    });
    expect(await prisma.pet.count()).toBe(0);
    expect(await prisma.moment.count()).toBe(0);
    expect(await statuses([cover, walk])).toEqual(["purging", "purging"]);
    const kept = await prisma.storyEntry.findUniqueOrThrow({ where: { id: story.id } });
    expect(kept.petId).toBeNull();
  });
});

describe("정리 Cron의 purging 처리(G-05)", () => {
  it("purging 파일의 R2 객체를 지우고 deleted로, 한 번에 정해진 수까지만", async () => {
    const { api, storage, spaceId, bom, photo } = await family();
    const count = CLEANUP_POLICY.r2DeletesPerRun + 2;
    const ids: string[] = [];
    for (let i = 0; i < count; i += 10) {
      const batch = [];
      for (let j = i; j < Math.min(i + 10, count); j++) batch.push(await photo());
      await api.moment.create({
        spaceId,
        subject: { type: "child", childId: bom.id },
        media: batch.map((assetId) => ({ assetId })),
      });
      ids.push(...batch);
    }
    await api.child.delete({ spaceId, childId: bom.id, confirmName: "김봄" });

    const first = await runCleanup(prisma, storage);
    expect(first.purged).toBe(CLEANUP_POLICY.r2DeletesPerRun);
    expect(first.abandonedCleaned).toBe(0); // 이번 실행의 삭제 몫을 다 썼다
    const second = await runCleanup(prisma, storage);
    expect(second.purged).toBe(2);
    expect(new Set(await statuses(ids))).toEqual(new Set(["deleted"]));
    for (const id of ids) {
      expect(await storage.head(`spaces/${spaceId}/${id}`)).toBeNull();
    }
  });

  it("객체 삭제가 실패한 파일은 purging으로 남아 다음에 다시 시도한다", async () => {
    const { api, storage, spaceId, bom, photo } = await family();
    const asset = await photo();
    await api.moment.create({
      spaceId,
      subject: { type: "child", childId: bom.id },
      media: [{ assetId: asset }],
    });
    await api.child.delete({ spaceId, childId: bom.id, confirmName: "김봄" });
    const original = storage.delete.bind(storage);
    storage.delete = async () => {
      throw new Error("R2 down");
    };
    expect((await runCleanup(prisma, storage)).purged).toBe(0);
    expect(await statuses([asset])).toEqual(["purging"]);
    storage.delete = original;
    expect((await runCleanup(prisma, storage)).purged).toBe(1);
    expect(await statuses([asset])).toEqual(["deleted"]);
  });
});
