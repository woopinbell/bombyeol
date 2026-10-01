import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { TIER_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("pet 프로필 관리", () => {
  it("커버 사진과 함께 등록하고 가족 모두가 목록을 본다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const cover = await uploadConfirmed(api, storage, spaceId);
    const pet = await api.pet.create({
      spaceId,
      name: "보리",
      species: "dog",
      breed: "진돗개",
      birthDate: "2020-05-01",
      birthDateEstimated: true,
      adoptedAt: "2020-08-15",
      coverAssetId: cover,
    });
    expect(pet).toMatchObject({ status: "living", birthDateEstimated: true, coverAssetId: cover });

    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    await expect(grandparent.pet.list({ spaceId })).resolves.toEqual([
      expect.objectContaining({
        name: "보리",
        coverUrl: `memory://get/spaces/${spaceId}/${cover}`,
      }),
    ]);
    await expect(grandparent.space.get({ spaceId })).resolves.toMatchObject({
      pets: [{ id: pet.id, name: "보리", species: "dog", status: "living" }],
    });
    await expect(
      grandparent.pet.create({ spaceId, name: "나비", species: "cat" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("G-11: Space당 반려동물 수 상한을 동시 요청에서도 지킨다", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    const limit = TIER_LIMITS.free.pets;
    const results = await Promise.allSettled(
      Array.from({ length: limit + 2 }, (_, i) =>
        api.pet.create({ spaceId, name: `동물${i}`, species: "other", speciesLabel: "토끼" }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(limit);
    await expect(
      api.pet.create({ spaceId, name: "하나 더", species: "cat" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: "PET_LIMIT" });
  });

  it("G-02: 다른 Space·영상·이미 쓰인 자산은 커버로 쓸 수 없다", async () => {
    const a = await mediaSetup(prisma);
    const b = await mediaSetup(prisma);
    const foreign = await uploadConfirmed(b.api, b.storage, b.spaceId);
    await expect(
      a.api.pet.create({ spaceId: a.spaceId, name: "보리", species: "dog", coverAssetId: foreign }),
    ).rejects.toMatchObject({ message: "ASSET_INVALID" });

    const video = await uploadConfirmed(a.api, a.storage, a.spaceId, "video");
    await expect(
      a.api.pet.create({ spaceId: a.spaceId, name: "보리", species: "dog", coverAssetId: video }),
    ).rejects.toMatchObject({ message: "ASSET_INVALID" });

    const image = await uploadConfirmed(a.api, a.storage, a.spaceId);
    await a.api.pet.create({
      spaceId: a.spaceId,
      name: "보리",
      species: "dog",
      coverAssetId: image,
    });
    await expect(
      a.api.pet.create({ spaceId: a.spaceId, name: "나비", species: "cat", coverAssetId: image }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "ASSET_IN_USE" });
    // 붙어 있는 커버는 media.delete로 지울 수 없다
    await expect(a.api.media.delete({ spaceId: a.spaceId, assetId: image })).rejects.toMatchObject({
      message: "ASSET_IN_USE",
    });
  });

  it("G-05: 커버를 바꾸거나 지우면 이전 커버 파일을 지운다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const first = await uploadConfirmed(api, storage, spaceId);
    const second = await uploadConfirmed(api, storage, spaceId);
    const pet = await api.pet.create({
      spaceId,
      name: "보리",
      species: "dog",
      coverAssetId: first,
    });

    await api.pet.update({ spaceId, petId: pet.id, coverAssetId: second, name: "보리보리" });
    expect(storage.objects.has(`spaces/${spaceId}/${first}`)).toBe(false);
    await expect(prisma.mediaAsset.findUnique({ where: { id: first } })).resolves.toMatchObject({
      status: "deleted",
    });

    // 같은 커버로 다시 저장하면 아무것도 지우지 않는다
    await api.pet.update({ spaceId, petId: pet.id, coverAssetId: second });
    expect(storage.objects.has(`spaces/${spaceId}/${second}`)).toBe(true);

    await api.pet.update({ spaceId, petId: pet.id, coverAssetId: null });
    expect(storage.objects.has(`spaces/${spaceId}/${second}`)).toBe(false);
    await expect(api.media.usage({ spaceId })).resolves.toMatchObject({ confirmedBytes: 0 });
  });

  it("동시에 같은 자산을 두 반려동물 커버로 붙여도 한 곳에만 붙는다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const image = await uploadConfirmed(api, storage, spaceId);
    const results = await Promise.allSettled(
      ["보리", "나비", "콩"].map((name) =>
        api.pet.create({ spaceId, name, species: "dog", coverAssetId: image }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toMatchObject({ message: "ASSET_IN_USE" });
    }
  });

  it("미래 날짜·다른 Space의 반려동물 수정은 거부한다", async () => {
    const a = await mediaSetup(prisma);
    const b = await mediaSetup(prisma);
    await expect(
      a.api.pet.create({
        spaceId: a.spaceId,
        name: "보리",
        species: "dog",
        adoptedAt: "2099-01-01",
      }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
    const pet = await a.api.pet.create({ spaceId: a.spaceId, name: "보리", species: "dog" });
    await expect(
      b.api.pet.update({ spaceId: b.spaceId, petId: pet.id, name: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "SUBJECT_NOT_FOUND" });
  });
});
