import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const user = await prisma.user.create({ data: { name: "부모" } });
  const space = await prisma.space.create({ data: { name: "가족", createdById: user.id } });
  await prisma.member.create({ data: { spaceId: space.id, userId: user.id, role: "parent" } });
  const child = await prisma.child.create({
    data: {
      spaceId: space.id,
      nickname: "콩이",
      dueDate: new Date("2027-03-01T00:00:00Z"),
      status: "expecting",
      createdById: user.id,
    },
  });
  const asset = await prisma.mediaAsset.create({
    data: {
      spaceId: space.id,
      uploadedById: user.id,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 100,
      status: "confirmed",
    },
  });
  return { user, space, child, asset };
}

const day = new Date("2026-09-20T00:00:00Z");

describe("우리·임신 스키마 체크 제약", () => {
  it("약관·처리방침 동의는 Space 없이, 아이 정보·임신 동의는 Space와 함께", async () => {
    const { user, space } = await family();
    const base = { userId: user.id, version: "v1" };
    await expect(prisma.consent.create({ data: { ...base, kind: "terms" } })).resolves.toBeTruthy();
    await expect(
      prisma.consent.create({ data: { ...base, kind: "privacy", spaceId: space.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.consent.create({ data: { ...base, kind: "pregnancy", spaceId: space.id } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.consent.create({ data: { ...base, kind: "child_data" } }),
    ).rejects.toThrow();
  });

  it("초음파 기록에만 사진이 붙고, 메모 기록은 글이 있어야 한다", async () => {
    const { user, space, child, asset } = await family();
    const base = { spaceId: space.id, childId: child.id, date: day, createdById: user.id };
    await expect(
      prisma.pregnancyRecord.create({ data: { ...base, kind: "ultrasound" } }),
    ).rejects.toThrow();
    await expect(
      prisma.pregnancyRecord.create({ data: { ...base, kind: "kick", photoAssetId: asset.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.pregnancyRecord.create({ data: { ...base, kind: "note" } }),
    ).rejects.toThrow();
    const record = await prisma.pregnancyRecord.create({
      data: { ...base, kind: "ultrasound", photoAssetId: asset.id },
    });
    expect(record.visibility).toBe("parents_only");
    // 아이를 지우면 임신 기록도 지워진다
    await prisma.child.delete({ where: { id: child.id } });
    expect(await prisma.pregnancyRecord.count()).toBe(0);
  });

  it("일정의 끝은 시작보다 앞설 수 없다", async () => {
    const { user, space } = await family();
    const base = {
      spaceId: space.id,
      title: "가족 모임",
      kind: "gathering",
      createdById: user.id,
    } as const;
    await expect(
      prisma.familyEvent.create({
        data: { ...base, startsAt: day, endsAt: new Date(day.getTime() - 1) },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.familyEvent.create({ data: { ...base, startsAt: day, endsAt: day } }),
    ).resolves.toMatchObject({ allDay: false, recurrence: "none" });
  });
});
