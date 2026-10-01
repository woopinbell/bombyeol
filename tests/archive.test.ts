import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DELETION_POLICY, RATE_LIMITS } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup, uploadConfirmed } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("archive(데이터 내보내기)", () => {
  it("parent만 — 어르신·친척은 FORBIDDEN", async () => {
    const { storage, spaceId } = await mediaSetup(prisma);
    const grandma = await addMember(prisma, spaceId, "grandparent", storage);
    await expect(grandma.archive.media({ spaceId })).rejects.toThrow(/FORBIDDEN/);
    await expect(grandma.archive.records({ spaceId, kind: "stories" })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it("원본 목록은 썸네일을 빼고, 붙은 곳과 짧은 TTL 읽기 URL을 준다(페이지 끝까지)", async () => {
    const { api, storage, spaceId, parent } = await mediaSetup(prisma);
    const original = await uploadConfirmed(api, storage, spaceId);
    const thumb = await uploadConfirmed(api, storage, spaceId);
    const moment = await api.moment.create({
      spaceId,
      subject: { type: "family" },
      media: [{ assetId: original, thumbnailAssetId: thumb }],
    });
    const loose = Array.from({ length: DELETION_POLICY.archiveMediaPageSize }, (_, i) => ({
      id: `loose-${String(i).padStart(3, "0")}`,
      spaceId,
      uploadedById: parent.id,
      kind: "image" as const,
      contentType: "image/jpeg",
      bytes: 10,
      status: "confirmed" as const,
    }));
    await prisma.mediaAsset.createMany({ data: loose });
    await prisma.mediaAsset.create({
      data: { ...loose[0], id: "gone", status: "deleted" },
    });

    const seen: string[] = [];
    let cursor: { createdAt: Date; id: string } | undefined;
    let pages = 0;
    do {
      const result = await api.archive.media({ spaceId, cursor });
      seen.push(...result.items.map((i) => i.id));
      const first = result.items.find((i) => i.id === original);
      if (first) {
        expect(first.attachedTo).toEqual({ type: "moment", id: moment.id, position: 0 });
        expect(first.url).toBe(`memory://get/spaces/${spaceId}/${original}`);
      }
      cursor = result.nextCursor ?? undefined;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(2);
    expect(seen).toHaveLength(DELETION_POLICY.archiveMediaPageSize + 1);
    expect(seen).not.toContain(thumb);
    expect(seen).not.toContain("gone");
  });

  it("글 기록을 종류별로 작성자 이름과 함께 준다 — 삭제 유예 중에도", async () => {
    const { api, spaceId } = await mediaSetup(prisma);
    await api.story.create({ spaceId, title: "시집오던 날", body: "그날은 눈이 왔지" });
    await api.moment.createDiary({ spaceId, subject: { type: "family" }, body: "첫 가족 일기" });
    await api.space.requestDeletion({ spaceId, confirmName: "가족" });

    const stories = await api.archive.records({ spaceId, kind: "stories" });
    expect(stories.items).toHaveLength(1);
    expect(stories.items[0]).toMatchObject({ title: "시집오던 날", createdBy: { name: "부모" } });
    const moments = await api.archive.records({ spaceId, kind: "moments" });
    expect(moments.items[0]).toMatchObject({ kind: "diary", body: "첫 가족 일기" });
    expect(moments.nextCursor).toBeNull();
  });

  it("G-07: 페이지 요청 리밋을 넘으면 429", async () => {
    const { api, spaceId, parent } = await mediaSetup(prisma);
    await exhaustRateLimit(prisma, `archive:${parent.id}`, RATE_LIMITS.archivePagePerUser);
    await expect(api.archive.media({ spaceId })).rejects.toThrow(/RATE_LIMITED/);
  });
});
