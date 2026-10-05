import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MOMENT_POLICY, RATE_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";
import { CHILD_CONSENT } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const child = await setup.api.child.create({
    spaceId: setup.spaceId,
    childDataConsent: CHILD_CONSENT,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  return { ...setup, subject: { type: "child", childId: child.id } as const };
}

describe("moment 부모 일기", () => {
  it("글만으로도, 사진과 묶어서도 쓰고 피드에 함께 나온다", async () => {
    const { api, spaceId, storage, subject } = await family();
    const textOnly = await api.moment.createDiary({
      spaceId,
      subject,
      body: "오늘 처음 태동을 느꼈다",
    });
    expect(textOnly).toMatchObject({ kind: "diary", media: [] });

    const photo = await uploadConfirmed(api, storage, spaceId);
    const withPhoto = await api.moment.createDiary({
      spaceId,
      subject,
      body: "산책길",
      media: [{ assetId: photo }],
    });
    expect(withPhoto.media).toEqual([expect.objectContaining({ assetId: photo })]);

    const feed = await api.moment.list({ spaceId, subject });
    expect(feed.items.map((m) => m.kind)).toEqual(["diary", "diary"]);
    // 사진 기록은 첨부가 필수
    await expect(api.moment.create({ spaceId, subject, media: [] })).rejects.toMatchObject({
      message: "MEDIA_REQUIRED",
    });
  });

  it("parent만 쓰고, 글은 비울 수 없고 길이 상한이 있다", async () => {
    const { api, spaceId, storage, subject } = await family();
    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    await expect(
      grandparent.moment.createDiary({ spaceId, subject: { type: "family" }, body: "안녕" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.moment.createDiary({ spaceId, subject, body: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      api.moment.createDiary({
        spaceId,
        subject,
        body: "가".repeat(MOMENT_POLICY.bodyMaxChars + 1),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("글 수정은 작성자만, 일기 글은 지울 수 없다", async () => {
    const { api, spaceId, storage, subject } = await family();
    const otherParent = await addMember(prisma, spaceId, "parent", storage);
    const diary = await api.moment.createDiary({ spaceId, subject, body: "처음 쓴 글" });

    await expect(
      otherParent.moment.update({ spaceId, momentId: diary.id, body: "남이 고친 글" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.moment.update({ spaceId, momentId: diary.id, body: null }),
    ).rejects.toMatchObject({ message: "BODY_REQUIRED" });
    await expect(
      api.moment.update({
        spaceId,
        momentId: diary.id,
        body: "고친 글",
        takenAt: new Date("2026-09-01T00:00:00Z"),
      }),
    ).resolves.toMatchObject({ body: "고친 글", takenAt: new Date("2026-09-01T00:00:00Z") });

    // 사진 기록의 설명은 지울 수 있다
    const photo = await uploadConfirmed(api, storage, spaceId);
    const moment = await api.moment.create({
      spaceId,
      subject,
      body: "설명",
      media: [{ assetId: photo }],
    });
    await expect(
      api.moment.update({ spaceId, momentId: moment.id, body: null }),
    ).resolves.toMatchObject({ body: null });
  });

  it("G-07: 일기 작성은 사용자당 글 기록 리밋에 걸린다", async () => {
    const { api, parent, spaceId, subject } = await family();
    await exhaustRateLimit(prisma, `record-write:${parent.id}`, RATE_LIMITS.recordWritePerUser);
    await expect(api.moment.createDiary({ spaceId, subject, body: "글" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
