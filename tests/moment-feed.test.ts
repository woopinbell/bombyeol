import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MOMENT_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const child = await setup.api.child.create({
    spaceId: setup.spaceId,
    child: { name: "김봄", birthDate: "2026-01-01" },
  });
  const pet = await setup.api.pet.create({ spaceId: setup.spaceId, name: "보리", species: "dog" });
  const upload = (kind: "image" | "video" = "image") =>
    uploadConfirmed(setup.api, setup.storage, setup.spaceId, kind);
  return { ...setup, childId: child.id, petId: pet.id, upload };
}

describe("moment 사진, 영상 피드", () => {
  it("아이 대상 기록: 원본, 썸네일 읽기 URL이 순서대로 나오고 대상별로 걸러진다", async () => {
    const { api, spaceId, childId, petId, upload } = await family();
    const photo = await upload();
    const video = await upload("video");
    const thumb = await upload();
    const created = await api.moment.create({
      spaceId,
      subject: { type: "child", childId },
      body: "첫 미소",
      takenAt: new Date("2026-09-30T03:00:00Z"),
      media: [{ assetId: photo }, { assetId: video, thumbnailAssetId: thumb }],
    });
    expect(created).toMatchObject({ kind: "media", body: "첫 미소", childId, petId: null });
    expect(created.media).toEqual([
      expect.objectContaining({ assetId: photo, kind: "image", thumbnailUrl: null }),
      expect.objectContaining({
        assetId: video,
        kind: "video",
        url: `memory://get/spaces/${spaceId}/${video}`,
        thumbnailUrl: `memory://get/spaces/${spaceId}/${thumb}`,
      }),
    ]);

    await api.moment.create({
      spaceId,
      subject: { type: "pet", petId },
      media: [{ assetId: await upload() }],
    });
    await api.moment.create({
      spaceId,
      subject: { type: "family" },
      media: [{ assetId: await upload() }],
    });

    const all = await api.moment.list({ spaceId });
    expect(all.items).toHaveLength(3);
    const byChild = await api.moment.list({ spaceId, subject: { type: "child", childId } });
    expect(byChild.items.map((m) => m.id)).toEqual([created.id]);
    const byPet = await api.moment.list({ spaceId, subject: { type: "pet", petId } });
    expect(byPet.items).toEqual([expect.objectContaining({ petId })]);
    const familyOnly = await api.moment.list({ spaceId, subject: { type: "family" } });
    expect(familyOnly.items).toEqual([expect.objectContaining({ childId: null, petId: null })]);
  });

  it("권한: 아이 기록은 parent만, 반려동물, 가족은 grandparent도, relative는 열람만", async () => {
    const { spaceId, storage, childId, petId } = await family();
    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    const relative = await addMember(prisma, spaceId, "relative", storage);
    const gpPhoto = await uploadConfirmed(grandparent, storage, spaceId);

    await expect(
      grandparent.moment.create({
        spaceId,
        subject: { type: "child", childId },
        media: [{ assetId: gpPhoto }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      grandparent.moment.create({
        spaceId,
        subject: { type: "pet", petId },
        media: [{ assetId: gpPhoto }],
      }),
    ).resolves.toMatchObject({ petId });

    const relPhoto = await uploadConfirmed(relative, storage, spaceId);
    await expect(
      relative.moment.create({
        spaceId,
        subject: { type: "family" },
        media: [{ assetId: relPhoto }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(relative.moment.list({ spaceId })).resolves.toMatchObject({
      items: [expect.objectContaining({ petId })],
    });
  });

  it("G-02: 다른 Space, 미확정, 이미 붙은, 중복, 영상 썸네일 자산을 거부한다", async () => {
    const a = await family();
    const b = await mediaSetup(prisma);
    const subject = { type: "family" } as const;
    const create = (media: { assetId: string; thumbnailAssetId?: string }[]) =>
      a.api.moment.create({ spaceId: a.spaceId, subject, media });

    const foreign = await uploadConfirmed(b.api, b.storage, b.spaceId);
    await expect(create([{ assetId: foreign }])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });

    const { assetId: pending } = await a.api.media.requestUpload({
      spaceId: a.spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 10,
    });
    await expect(create([{ assetId: pending }])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });

    const photo = await a.upload();
    await expect(create([{ assetId: photo }, { assetId: photo }])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });
    const video = await a.upload("video");
    const otherVideo = await a.upload("video");
    await expect(create([{ assetId: video, thumbnailAssetId: otherVideo }])).rejects.toMatchObject({
      message: "ASSET_INVALID",
    });

    await create([{ assetId: photo }]);
    await expect(create([{ assetId: photo }])).rejects.toMatchObject({ message: "ASSET_IN_USE" });
    await expect(create([{ assetId: video, thumbnailAssetId: photo }])).rejects.toMatchObject({
      message: "ASSET_IN_USE",
    });
    await expect(a.api.media.delete({ spaceId: a.spaceId, assetId: photo })).rejects.toMatchObject({
      message: "ASSET_IN_USE",
    });
  });

  it("대상, 날짜, 개수 검증", async () => {
    const a = await family();
    const b = await family();
    const photo = await a.upload();
    await expect(
      a.api.moment.create({
        spaceId: a.spaceId,
        subject: { type: "child", childId: b.childId },
        media: [{ assetId: photo }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "SUBJECT_NOT_FOUND" });
    await expect(
      a.api.moment.create({
        spaceId: a.spaceId,
        subject: { type: "family" },
        takenAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        media: [{ assetId: photo }],
      }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
    await expect(
      a.api.moment.create({
        spaceId: a.spaceId,
        subject: { type: "family" },
        media: Array.from({ length: MOMENT_POLICY.maxMediaPerMoment + 1 }, (_, i) => ({
          assetId: `asset${i}`,
        })),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      a.api.moment.create({ spaceId: a.spaceId, subject: { type: "family" }, media: [] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // 다른 Space의 피드는 볼 수 없다
    await expect(b.api.moment.list({ spaceId: a.spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("커서로 촬영일 최신순 전체를 빠짐없이 넘긴다(같은 시각 포함)", async () => {
    const { api, spaceId, upload } = await family();
    const total = MOMENT_POLICY.pageSize + 5;
    const sameTime = new Date("2026-09-01T00:00:00Z");
    const ids: string[] = [];
    for (let i = 0; i < total; i++) {
      const m = await api.moment.create({
        spaceId,
        subject: { type: "family" },
        takenAt: i % 2 ? sameTime : new Date(sameTime.getTime() + i * 60_000),
        media: [{ assetId: await upload() }],
      });
      ids.push(m.id);
    }
    const first = await api.moment.list({ spaceId });
    expect(first.items).toHaveLength(MOMENT_POLICY.pageSize);
    expect(first.nextCursor).not.toBeNull();
    const second = await api.moment.list({ spaceId, cursor: first.nextCursor! });
    expect(second.nextCursor).toBeNull();
    const seen = [...first.items, ...second.items];
    expect(new Set(seen.map((m) => m.id))).toEqual(new Set(ids));
    const times = seen.map((m) => m.takenAt.getTime());
    expect(times).toEqual([...times].sort((x, y) => y - x));
  });

  it("G-05: 삭제는 작성자 또는 parent만, 붙은 파일까지 지운다", async () => {
    const { api, spaceId, storage, upload } = await family();
    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    const video = await upload("video");
    const thumb = await upload();
    const moment = await api.moment.create({
      spaceId,
      subject: { type: "family" },
      media: [{ assetId: video, thumbnailAssetId: thumb }],
    });
    await expect(grandparent.moment.delete({ spaceId, momentId: moment.id })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      },
    );

    const gpMoment = await grandparent.moment.create({
      spaceId,
      subject: { type: "family" },
      media: [{ assetId: await uploadConfirmed(grandparent, storage, spaceId) }],
    });
    await grandparent.moment.delete({ spaceId, momentId: gpMoment.id });

    await api.moment.delete({ spaceId, momentId: moment.id });
    expect(storage.objects.size).toBe(0);
    await expect(api.moment.list({ spaceId })).resolves.toMatchObject({ items: [] });
    await expect(api.media.usage({ spaceId })).resolves.toMatchObject({ confirmedBytes: 0 });
    await expect(
      prisma.mediaAsset.count({ where: { id: { in: [video, thumb] }, status: "deleted" } }),
    ).resolves.toBe(2);
    await expect(api.moment.delete({ spaceId, momentId: moment.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("G-05: 파일 삭제가 중간에 실패하면 기록이 남고, 다시 시도하면 마저 지운다", async () => {
    const { api, spaceId, storage, upload } = await family();
    const first = await upload();
    const second = await upload();
    const moment = await api.moment.create({
      spaceId,
      subject: { type: "family" },
      media: [{ assetId: first }, { assetId: second }],
    });
    const realDelete = storage.delete.bind(storage);
    let calls = 0;
    storage.delete = async (key) => {
      if (++calls === 3) throw new Error("R2 일시 오류");
      return realDelete(key);
    };
    await expect(api.moment.delete({ spaceId, momentId: moment.id })).rejects.toThrow();
    const partial = await api.moment.list({ spaceId });
    expect(partial.items[0].media.map((m) => m.assetId)).toEqual([second]);

    await api.moment.delete({ spaceId, momentId: moment.id });
    expect(storage.objects.size).toBe(0);
    await expect(api.media.usage({ spaceId })).resolves.toMatchObject({ confirmedBytes: 0 });
  });
});
