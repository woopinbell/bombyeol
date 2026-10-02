import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("story 사진에 얽힌 이야기", () => {
  it("사진을 붙이면 짧은 TTL 읽기 URL로 돌려주고 목록에도 나온다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const photo = await uploadConfirmed(api, storage, spaceId);
    const story = await api.story.create({
      spaceId,
      body: "1978년 여름, 바닷가에서",
      storyYear: 1978,
      photoAssetId: photo,
    });
    expect(story.photo).toEqual({
      assetId: photo,
      url: `memory://get/spaces/${spaceId}/${photo}`,
    });
    const list = await api.story.list({ spaceId });
    expect(list.items[0].photo?.assetId).toBe(photo);
  });

  it("G-02: 영상, 미확정, 다른 Space의 자산은 붙일 수 없다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const video = await uploadConfirmed(api, storage, spaceId, "video");
    const { assetId: pending } = await api.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 100,
    });
    const other = await mediaSetup(prisma);
    const foreign = await uploadConfirmed(other.api, other.storage, other.spaceId);
    for (const photoAssetId of [video, pending, foreign]) {
      await expect(api.story.create({ spaceId, body: "x", photoAssetId })).rejects.toMatchObject({
        message: "ASSET_INVALID",
      });
    }
  });

  it("사진 하나는 한 곳에만 붙고, 붙은 사진은 media.delete로 지울 수 없다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const photo = await uploadConfirmed(api, storage, spaceId);
    await api.story.create({ spaceId, body: "첫 이야기", photoAssetId: photo });
    await expect(
      api.story.create({ spaceId, body: "둘째 이야기", photoAssetId: photo }),
    ).rejects.toMatchObject({ message: "ASSET_IN_USE" });
    await expect(
      api.pet.create({ spaceId, name: "보리", species: "dog", coverAssetId: photo }),
    ).rejects.toMatchObject({ message: "ASSET_IN_USE" });
    await expect(api.media.delete({ spaceId, assetId: photo })).rejects.toMatchObject({
      message: "ASSET_IN_USE",
    });
  });

  it("G-05: 사진을 바꾸거나 빼면 이전 사진 파일을 지운다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const first = await uploadConfirmed(api, storage, spaceId);
    const second = await uploadConfirmed(api, storage, spaceId);
    const story = await api.story.create({ spaceId, body: "x", photoAssetId: first });

    const swapped = await api.story.update({ spaceId, storyId: story.id, photoAssetId: second });
    expect(swapped.photo?.assetId).toBe(second);
    expect(storage.objects.has(`spaces/${spaceId}/${first}`)).toBe(false);
    await expect(
      prisma.mediaAsset.findUniqueOrThrow({ where: { id: first } }),
    ).resolves.toMatchObject({ status: "deleted" });

    // 같은 사진으로 "바꾸기"는 아무것도 지우지 않는다
    await api.story.update({ spaceId, storyId: story.id, photoAssetId: second, body: "y" });
    expect(storage.objects.has(`spaces/${spaceId}/${second}`)).toBe(true);

    const removed = await api.story.update({ spaceId, storyId: story.id, photoAssetId: null });
    expect(removed.photo).toBeNull();
    expect(storage.objects.has(`spaces/${spaceId}/${second}`)).toBe(false);
  });

  it("G-05: 이야기를 지우면 사진 파일도 지운다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const photo = await uploadConfirmed(api, storage, spaceId);
    const story = await api.story.create({ spaceId, body: "x", photoAssetId: photo });
    await api.story.delete({ spaceId, storyId: story.id });
    expect(storage.objects.has(`spaces/${spaceId}/${photo}`)).toBe(false);
    await expect(
      prisma.mediaAsset.findUniqueOrThrow({ where: { id: photo } }),
    ).resolves.toMatchObject({ status: "deleted" });
    expect(await prisma.storyEntry.count()).toBe(0);
  });

  it("G-05: 파일 삭제가 실패하면 이야기가 남아 다시 지울 수 있다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const photo = await uploadConfirmed(api, storage, spaceId);
    const story = await api.story.create({ spaceId, body: "x", photoAssetId: photo });
    const realDelete = storage.delete.bind(storage);
    storage.delete = async () => {
      throw new Error("R2 down");
    };
    await expect(api.story.delete({ spaceId, storyId: story.id })).rejects.toThrow();
    expect(await prisma.storyEntry.count()).toBe(1);
    storage.delete = realDelete;
    await api.story.delete({ spaceId, storyId: story.id });
    expect(await prisma.storyEntry.count()).toBe(0);
  });
});
