import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, REACTION_POLICY } from "@/lib/plan";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";
import { exhaustRateLimit } from "./helpers/rate";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const setup = await mediaSetup(prisma);
  const child = await setup.api.child.create({
    spaceId: setup.spaceId,
    child: { name: "김봄", birthDate: "2026-01-01" },
  });
  const diary = await setup.api.moment.createDiary({
    spaceId: setup.spaceId,
    subject: { type: "child", childId: child.id },
    body: "첫 이유식",
  });
  const milestone = await setup.api.milestone.create({
    spaceId: setup.spaceId,
    subject: { type: "child", childId: child.id },
    kind: "first_tooth",
    value: {},
    recordedAt: "2026-09-01",
  });
  const relative = await addMember(prisma, setup.spaceId, "relative", setup.storage);
  return {
    ...setup,
    childId: child.id,
    relative,
    moment: { type: "moment", momentId: diary.id } as const,
    milestone: { type: "milestone", milestoneId: milestone.id } as const,
  };
}

describe("reaction 좋아요, 댓글", () => {
  it("좋아요는 토글이고 피드, 마일스톤 목록에 요약이 나온다", async () => {
    const { api, relative, spaceId, childId, moment, milestone } = await family();
    await expect(relative.reaction.toggleLike({ spaceId, target: moment })).resolves.toEqual({
      liked: true,
      likes: 1,
    });
    await expect(api.reaction.toggleLike({ spaceId, target: moment })).resolves.toEqual({
      liked: true,
      likes: 2,
    });
    await expect(api.reaction.toggleLike({ spaceId, target: moment })).resolves.toEqual({
      liked: false,
      likes: 1,
    });
    await relative.reaction.addComment({ spaceId, target: moment, body: "잘 먹네!" });
    await relative.reaction.toggleLike({ spaceId, target: milestone });

    const feed = await api.moment.list({ spaceId });
    expect(feed.items[0].reactions).toEqual({ likes: 1, comments: 1, likedByMe: false });
    const relFeed = await relative.moment.list({ spaceId });
    expect(relFeed.items[0].reactions).toMatchObject({ likedByMe: true });
    const milestones = await relative.milestone.list({
      spaceId,
      subject: { type: "child", childId },
    });
    expect(milestones[0].reactions).toEqual({ likes: 1, comments: 0, likedByMe: true });
  });

  it("피드에 가장 최근 댓글 하나가 쓴 사람과 함께 나온다", async () => {
    const { api, relative, spaceId, moment } = await family();
    expect((await api.moment.list({ spaceId })).items[0].latestComment).toBeNull();
    await api.reaction.addComment({ spaceId, target: moment, body: "첫 댓글" });
    const last = await relative.reaction.addComment({ spaceId, target: moment, body: "다 컸네" });
    const [item] = (await api.moment.list({ spaceId })).items;
    expect(item.latestComment).toEqual({
      id: last.id,
      body: "다 컸네",
      createdAt: last.createdAt,
      createdBy: last.createdBy,
    });
    expect(item.reactions.comments).toBe(2);
    expect(item).not.toHaveProperty("reactions.0");
  });

  it("동시에 여러 번 눌러도 좋아요 행은 최대 하나다", async () => {
    const { api, spaceId, moment } = await family();
    await Promise.all(
      Array.from({ length: 5 }, () => api.reaction.toggleLike({ spaceId, target: moment })),
    );
    // 홀수 번 토글 → 좋아요 1개
    expect(await prisma.reaction.count({ where: { kind: "like" } })).toBe(1);
  });

  it("댓글은 오래된 순으로 페이지를 넘기고, 삭제는 작성자 또는 parent만", async () => {
    const { api, relative, spaceId, storage, moment } = await family();
    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    const total = REACTION_POLICY.pageSize + 3;
    for (let i = 0; i < total; i++) {
      await relative.reaction.addComment({ spaceId, target: moment, body: `댓글 ${i}` });
    }
    const first = await api.reaction.listComments({ spaceId, target: moment });
    expect(first.items).toHaveLength(REACTION_POLICY.pageSize);
    expect(first.items[0]).toMatchObject({ body: "댓글 0", createdBy: { name: "relative" } });
    const second = await api.reaction.listComments({
      spaceId,
      target: moment,
      cursor: first.nextCursor!,
    });
    expect(second.items.map((c) => c.body)).toEqual([
      `댓글 ${total - 3}`,
      `댓글 ${total - 2}`,
      `댓글 ${total - 1}`,
    ]);
    expect(second.nextCursor).toBeNull();

    const target = first.items[0].id;
    await expect(
      grandparent.reaction.deleteComment({ spaceId, commentId: target }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await relative.reaction.deleteComment({ spaceId, commentId: target });
    await api.reaction.deleteComment({ spaceId, commentId: first.items[1].id });
    expect(await prisma.reaction.count({ where: { kind: "comment" } })).toBe(total - 2);
  });

  it("빈 댓글, 너무 긴 댓글, 다른 Space의 대상은 거부한다", async () => {
    const a = await family();
    const b = await family();
    await expect(
      a.api.reaction.addComment({ spaceId: a.spaceId, target: a.moment, body: "  " }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      a.api.reaction.addComment({
        spaceId: a.spaceId,
        target: a.moment,
        body: "가".repeat(REACTION_POLICY.commentMaxChars + 1),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      b.api.reaction.toggleLike({ spaceId: b.spaceId, target: a.moment }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "ITEM_NOT_FOUND" });
    await expect(
      b.api.reaction.addComment({ spaceId: b.spaceId, target: a.milestone, body: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const comment = await a.api.reaction.addComment({
      spaceId: a.spaceId,
      target: a.moment,
      body: "안녕",
    });
    await expect(
      b.api.reaction.deleteComment({ spaceId: b.spaceId, commentId: comment.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("기록을 지우면 반응도 함께 지워진다", async () => {
    const { api, relative, spaceId, moment } = await family();
    await relative.reaction.toggleLike({ spaceId, target: moment });
    await relative.reaction.addComment({ spaceId, target: moment, body: "좋아요" });
    await api.moment.delete({ spaceId, momentId: moment.momentId });
    expect(await prisma.reaction.count({ where: { momentId: moment.momentId } })).toBe(0);
  });

  it("G-07: 좋아요, 댓글은 사용자당 리밋에 걸린다", async () => {
    const { parent, api, spaceId, moment } = await family();
    await exhaustRateLimit(prisma, `like:${parent.id}`, RATE_LIMITS.likePerUser);
    await exhaustRateLimit(prisma, `comment:${parent.id}`, RATE_LIMITS.commentPerUser);
    await expect(api.reaction.toggleLike({ spaceId, target: moment })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    await expect(
      api.reaction.addComment({ spaceId, target: moment, body: "x" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
