import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { RATE_LIMITS } from "@/lib/plan";
import { gestationalAge } from "@/lib/pregnancy";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";
import { CHILD_CONSENT } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** 동의한 부모 + 태명 시절 아이(예정일 2027-03-01) */
async function expecting() {
  const setup = await mediaSetup(prisma);
  const { api, spaceId } = setup;
  await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  const child = await api.child.create({
    spaceId,
    childDataConsent: CHILD_CONSENT,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  return { ...setup, childId: child.id };
}

describe("임신 주차 계산", () => {
  it("예정일 기준 280일로 주, 일을 계산한다", () => {
    expect(gestationalAge(d("2027-03-01"), d("2026-09-20"))).toEqual({ weeks: 16, days: 6 });
    expect(gestationalAge(d("2027-03-01"), d("2027-03-01"))).toEqual({ weeks: 40, days: 0 });
    expect(gestationalAge(d("2027-03-01"), d("2027-03-05"))).toEqual({ weeks: 40, days: 4 });
    expect(gestationalAge(d("2027-03-01"), d("2026-05-01"))).toBeNull();
    expect(gestationalAge(null, d("2026-09-20"))).toBeNull();
  });
});

describe("pregnancy 임신 기록", () => {
  it("기본은 parents_only, 주차, 사진 읽기 URL을 함께 돌려준다", async () => {
    const { api, storage, spaceId, childId } = await expecting();
    const photo = await uploadConfirmed(api, storage, spaceId);
    const record = await api.pregnancy.create({
      spaceId,
      childId,
      kind: "ultrasound",
      date: "2026-09-20",
      note: "심장 소리를 들었다",
      photoAssetId: photo,
    });
    expect(record).toMatchObject({
      kind: "ultrasound",
      visibility: "parents_only",
      gestationalAge: { weeks: 16, days: 6 },
      photo: { assetId: photo, url: `memory://get/spaces/${spaceId}/${photo}` },
    });
    // 예정일이 바뀌면 주차도 따라 바뀐다(저장하지 않고 조회 시점 계산)
    await api.child.update({ spaceId, childId, dueDate: "2027-03-08" });
    const [shown] = (await api.pregnancy.list({ spaceId, childId })).items;
    expect(shown.gestationalAge).toEqual({ weeks: 15, days: 6 });
  });

  it("임신 동의가 있는 parent만 쓴다", async () => {
    const { api, storage, spaceId } = await mediaSetup(prisma);
    const { id: childId } = await api.child.create({
      spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "콩이", dueDate: "2027-03-01" },
    });
    const input = { spaceId, childId, kind: "kick", date: "2026-09-30" } as const;
    await expect(api.pregnancy.create(input)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "CONSENT_REQUIRED",
    });
    const grandma = await addMember(prisma, spaceId, "grandparent", storage);
    await expect(grandma.pregnancy.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await api.consent.grantSpace({
      spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    await expect(api.pregnancy.create(input)).resolves.toMatchObject({ kind: "kick" });
  });

  it("종류별 규칙: 초음파는 사진 필수, 사진은 초음파에만, 메모는 글 필수", async () => {
    const { api, storage, spaceId, childId } = await expecting();
    const base = { spaceId, childId, date: "2026-09-20" } as const;
    await expect(api.pregnancy.create({ ...base, kind: "ultrasound" })).rejects.toMatchObject({
      message: "MEDIA_REQUIRED",
    });
    const photo = await uploadConfirmed(api, storage, spaceId);
    await expect(
      api.pregnancy.create({ ...base, kind: "kick", photoAssetId: photo }),
    ).rejects.toMatchObject({ message: "PHOTO_NOT_ALLOWED" });
    await expect(api.pregnancy.create({ ...base, kind: "note" })).rejects.toMatchObject({
      message: "BODY_REQUIRED",
    });
    const video = await uploadConfirmed(api, storage, spaceId, "video");
    await expect(
      api.pregnancy.create({ ...base, kind: "ultrasound", photoAssetId: video }),
    ).rejects.toMatchObject({ message: "ASSET_INVALID" });
    const other = await mediaSetup(prisma);
    const foreignChild = await other.api.child.create({
      spaceId: other.spaceId,
      childDataConsent: CHILD_CONSENT,
      child: { nickname: "다른 아이", dueDate: "2027-01-01" },
    });
    await expect(
      api.pregnancy.create({ ...base, childId: foreignChild.id, kind: "kick" }),
    ).rejects.toMatchObject({ message: "SUBJECT_NOT_FOUND" });
  });

  it("날짜 규칙: 검진만 앞으로의 일정을 받고, 태어난 뒤 날짜는 받지 않는다", async () => {
    const { api, spaceId, childId } = await expecting();
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "kick", date: "2026-12-01" }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "checkup", date: "2026-12-01" }),
    ).resolves.toMatchObject({ kind: "checkup" });
    // 예정일 + 60일을 넘는 검진은 받지 않는다
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "checkup", date: "2027-06-01" }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });

    await api.child.markBorn({ spaceId, childId, birthDate: "2026-09-25" });
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "kick", date: "2026-09-26" }),
    ).rejects.toMatchObject({ message: "CHILD_ALREADY_BORN" });
    // 출생 전 날짜로는 소급해 남길 수 있고, 기존 기록은 그대로 남는다
    await api.pregnancy.create({ spaceId, childId, kind: "note", date: "2026-09-01", note: "x" });
    expect((await api.pregnancy.list({ spaceId, childId })).items).toHaveLength(2);
    expect(await api.pregnancy.progress({ spaceId, childId })).toMatchObject({
      status: "born",
      gestationalAge: null,
    });
  });

  it("고치기는 쓴 사람만 - 다른 parent는 parents_only로 좁히기만 할 수 있다", async () => {
    const { api, storage, spaceId, childId } = await expecting();
    const partner = await addMember(prisma, spaceId, "parent", storage);
    const record = await api.pregnancy.create({
      spaceId,
      childId,
      kind: "checkup",
      date: "2026-09-25",
      note: "정기 검진",
      visibility: "family",
    });
    const recordId = record.id;
    await expect(
      partner.pregnancy.update({ spaceId, recordId, note: "고침" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      partner.pregnancy.update({ spaceId, recordId, visibility: "parents_only", note: "고침" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      partner.pregnancy.update({ spaceId, recordId, visibility: "parents_only" }),
    ).resolves.toMatchObject({ visibility: "parents_only", note: "정기 검진" });
    // 가족 공개로 넓히는 것은 쓴 사람만
    await expect(
      partner.pregnancy.update({ spaceId, recordId, visibility: "family" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.pregnancy.update({ spaceId, recordId, visibility: "family", note: "검진 잘 받음" }),
    ).resolves.toMatchObject({ visibility: "family", note: "검진 잘 받음" });
  });

  it("초음파 사진을 바꾸거나 기록을 지우면 파일도 지운다(G-05), 붙은 사진은 따로 지우거나 옮길 수 없다", async () => {
    const { api, storage, spaceId, childId } = await expecting();
    const first = await uploadConfirmed(api, storage, spaceId);
    const record = await api.pregnancy.create({
      spaceId,
      childId,
      kind: "ultrasound",
      date: "2026-09-20",
      photoAssetId: first,
    });
    await expect(api.media.delete({ spaceId, assetId: first })).rejects.toMatchObject({
      message: "ASSET_IN_USE",
    });
    await expect(
      api.moment.create({
        spaceId,
        subject: { type: "child", childId },
        media: [{ assetId: first }],
      }),
    ).rejects.toMatchObject({ message: "ASSET_IN_USE" });

    const second = await uploadConfirmed(api, storage, spaceId);
    await api.pregnancy.update({ spaceId, recordId: record.id, photoAssetId: second });
    expect(storage.deleted).toContain(`spaces/${spaceId}/${first}`);
    expect((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: first } })).status).toBe(
      "deleted",
    );

    const partner = await addMember(prisma, spaceId, "parent", storage);
    await partner.pregnancy.delete({ spaceId, recordId: record.id });
    expect(storage.deleted).toContain(`spaces/${spaceId}/${second}`);
    expect(await prisma.pregnancyRecord.count()).toBe(0);
  });

  it("동의를 철회하면 새 기록, 수정이 막히고, 내 기록은 지우거나 가족 공개를 거둔다", async () => {
    const { api, storage, spaceId, childId } = await expecting();
    const partner = await addMember(prisma, spaceId, "parent", storage);
    await partner.consent.grantSpace({
      spaceId,
      kind: "pregnancy",
      version: CONSENT_VERSIONS.pregnancy,
    });
    const photo = await uploadConfirmed(api, storage, spaceId);
    const mine = await api.pregnancy.create({
      spaceId,
      childId,
      kind: "ultrasound",
      date: "2026-09-20",
      photoAssetId: photo,
      visibility: "family",
    });
    const theirs = await partner.pregnancy.create({
      spaceId,
      childId,
      kind: "kick",
      date: "2026-09-21",
      visibility: "family",
    });

    await api.consent.withdraw({ spaceId, kind: "pregnancy" });
    const kept = await api.pregnancy.get({ spaceId, recordId: mine.id });
    expect(kept.visibility).toBe("parents_only");
    expect((await api.pregnancy.get({ spaceId, recordId: theirs.id })).visibility).toBe("family");
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "kick", date: "2026-09-22" }),
    ).rejects.toMatchObject({ message: "CONSENT_REQUIRED" });
    await expect(
      api.pregnancy.update({ spaceId, recordId: mine.id, visibility: "family" }),
    ).rejects.toMatchObject({ message: "CONSENT_REQUIRED" });

    await api.consent.withdraw({ spaceId, kind: "pregnancy", deleteRecords: true });
    expect(await prisma.pregnancyRecord.findMany({ select: { id: true } })).toEqual([
      { id: theirs.id },
    ]);
    expect(storage.deleted).toContain(`spaces/${spaceId}/${photo}`);
  });

  it("오늘의 주차와 예정일까지 남은 날", async () => {
    const { spaceId, childId, storage } = await expecting();
    const uncle = await addMember(prisma, spaceId, "relative", storage);
    await expect(
      uncle.pregnancy.progress({ spaceId, childId, today: "2026-10-01" }),
    ).resolves.toEqual({
      status: "expecting",
      dueDate: d("2027-03-01"),
      gestationalAge: { weeks: 18, days: 3 },
      daysUntilDue: 151,
    });
  });

  it("G-07: 글 기록 리밋을 마일스톤, 일기와 함께 쓴다", async () => {
    const { api, parent, spaceId, childId } = await expecting();
    await exhaustRateLimit(prisma, `record-write:${parent.id}`, RATE_LIMITS.recordWritePerUser);
    await expect(
      api.pregnancy.create({ spaceId, childId, kind: "kick", date: "2026-09-20" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
