import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateUser } from "@/server/auth/users";
import { runCleanup } from "@/server/jobs/cleanup";
import { assertLocalDatabaseUrl } from "../scripts/with-local-db.mjs";
import { createTestPrisma, resetDb } from "./helpers/db";
import { uploadConfirmed } from "./helpers/media";
import { FakeSender, testPush } from "./helpers/push";
import { leftovers } from "./helpers/residual";
import { MemoryStorage } from "./helpers/storage";
import { callerFor } from "./helpers/trpc";

// 핵심 플로우 e2e(서버): 가족 생성 → 초대 → 사진 → 이야기 → 삭제를 tRPC 호출만으로 한 번에 따라간다.
// 화면에 기대는 부분은 여기서 다루지 않는다 — 브라우저 조작·카카오 로그인 리다이렉트·카카오톡 공유,
// PWA 설치·오프라인, 기기의 푸시 수신(여기서는 서버가 FCM으로 보낸 메시지까지만 본다), 실제 R2 PUT(메모리 저장소).
// 이 파일은 DB를 통째로 비우고 지우므로 로컬 DB에서만 돈다: globalSetup의 가드에 더해 파일 단위로도 다시 막는다.
assertLocalDatabaseUrl(process.env.DATABASE_URL ?? "");

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const DAY = 24 * 60 * 60 * 1000;

describe("핵심 플로우 e2e(가족 생성→초대→사진→이야기→삭제)", () => {
  it("엄마가 만든 가족에 할머니가 합류해 사진·이야기를 주고받고, 계정·Space 삭제 뒤 아무것도 남지 않는다", async () => {
    const storage = new MemoryStorage();
    const sender = new FakeSender();
    const push = testPush(prisma, sender);
    /** 응답 뒤 발송을 끝내고 이번에 보낸 것만 (토큰, 알림 종류)로 돌려준다 */
    const sent = async () => {
      await push.flush();
      return sender.sent.splice(0).map((s) => [s.token, s.message.data.type]);
    };

    // 1. 로그인(카카오) — 엄마가 가족을 만들고 아이를 등록한다
    const mom = await findOrCreateUser(prisma, {
      provider: "kakao",
      providerAccountId: "e2e-mom",
      name: "엄마",
    });
    const momApi = callerFor(prisma, mom.id, "203.0.113.1", storage, push.dispatcher);
    const momToken = "fcm-token-mom-0001:APA91b";
    await momApi.push.register({ token: momToken });
    const { id: spaceId } = await momApi.space.create({ name: "봄이네", relationLabel: "엄마" });
    const child = await momApi.child.create({
      spaceId,
      child: { name: "김봄", birthDate: "2026-03-01" },
    });
    expect(child).toMatchObject({ status: "born" });

    // 2. 초대 — 할머니가 코드로 합류한다
    const invite = await momApi.invite.create({
      spaceId,
      role: "grandparent",
      relationLabel: "할머니",
    });
    const grandma = await findOrCreateUser(prisma, {
      provider: "kakao",
      providerAccountId: "e2e-grandma",
      name: "할머니",
    });
    const grandmaApi = callerFor(prisma, grandma.id, "203.0.113.9", storage, push.dispatcher);
    const grandmaToken = "fcm-token-grandma-0001:APA91b";
    await grandmaApi.push.register({ token: grandmaToken });
    await grandmaApi.invite.accept({ code: invite.code });
    const family = await grandmaApi.space.get({ spaceId });
    expect(family.members.map((m) => `${m.role}:${m.relationLabel}`)).toEqual([
      "parent:엄마",
      "grandparent:할머니",
    ]);
    expect(family.children.map((c) => c.name)).toEqual(["김봄"]);
    const grandmaMemberId = family.members[1]!.id;
    expect(await momApi.invite.list({ spaceId })).toEqual([]);

    // 3. 사진 — 업로드 URL 발급 → (R2 PUT 흉내) → 확정 → 오늘 기록
    const upload = await momApi.media.requestUpload({
      spaceId,
      kind: "image",
      contentType: "image/jpeg",
      bytes: 2048,
    });
    expect(upload.headers).toEqual({ "content-type": "image/jpeg" });
    expect(storage.upload(`pending/${spaceId}/${upload.assetId}`, 2048, "image/jpeg")).toBe(true);
    await momApi.media.confirm({ spaceId, assetId: upload.assetId });
    const thumbnail = await uploadConfirmed(momApi, storage, spaceId);
    const moment = await momApi.moment.create({
      spaceId,
      subject: { type: "child", childId: child.id },
      body: "첫 뒤집기",
      media: [{ assetId: upload.assetId, thumbnailAssetId: thumbnail }],
    });
    expect(await sent()).toEqual([[grandmaToken, "moment"]]);

    // 할머니가 피드에서 보고 좋아요·댓글을 남긴다 → 엄마에게 알림
    const feed = await grandmaApi.moment.list({ spaceId });
    expect(feed.items.map((m) => m.id)).toEqual([moment.id]);
    expect(feed.items[0]!.media).toEqual([
      expect.objectContaining({
        assetId: upload.assetId,
        url: `memory://get/spaces/${spaceId}/${upload.assetId}`,
        thumbnailUrl: `memory://get/spaces/${spaceId}/${thumbnail}`,
      }),
    ]);
    const momentTarget = { type: "moment" as const, momentId: moment.id };
    await grandmaApi.reaction.toggleLike({ spaceId, target: momentTarget });
    await grandmaApi.reaction.addComment({ spaceId, target: momentTarget, body: "우리 봄이 최고" });
    expect(await sent()).toEqual([
      [momToken, "moment"],
      [momToken, "moment"],
    ]);
    const momFeed = await momApi.moment.list({ spaceId });
    expect(momFeed.items[0]!.reactions).toEqual({ likes: 1, comments: 1, likedByMe: false });

    // 4. 이야기 — 할머니가 질문 카드에 답하고, 엄마가 별 하나를 보낸다
    const prompts = await grandmaApi.story.prompts({ spaceId, category: "food" });
    expect(prompts.map((p) => p.key)).toContain("food_signature");
    const story = await grandmaApi.story.create({
      spaceId,
      promptKey: "food_signature",
      body: "된장찌개는 멸치 육수부터",
    });
    expect(story).toMatchObject({
      category: "food",
      narrator: { memberId: grandmaMemberId, name: "할머니", label: "할머니" },
      scribe: null,
    });
    expect(await sent()).toEqual([[momToken, "story"]]);
    await momApi.reaction.toggleStar({
      spaceId,
      target: { type: "story", storyEntryId: story.id },
    });
    expect(await sent()).toEqual([[grandmaToken, "story"]]);

    // 엄마가 물어보기 → 할머니가 답하면 물어보기가 닫힌다
    const ask = await momApi.story.ask({
      spaceId,
      toMemberId: grandmaMemberId,
      promptKey: "love_wedding",
    });
    expect(await sent()).toEqual([[grandmaToken, "ask"]]);
    expect(
      (await grandmaApi.story.asks({ spaceId, toMemberId: grandmaMemberId })).map((a) => a.id),
    ).toEqual([ask.id]);
    const answer = await grandmaApi.story.create({
      spaceId,
      askId: ask.id,
      body: "가을에 혼례를 올렸지",
    });
    expect(answer).toMatchObject({
      promptKey: "love_wedding",
      category: "love",
      ask: { id: ask.id },
    });
    expect(await sent()).toEqual([[momToken, "story"]]);
    expect(await grandmaApi.story.asks({ spaceId })).toEqual([]);

    const stories = await momApi.story.list({ spaceId, narratorMemberId: grandmaMemberId });
    expect(stories.items.map((s) => [s.id, s.reactions])).toEqual([
      [answer.id, { stars: 0, comments: 0, starredByMe: false }],
      [story.id, { stars: 1, comments: 0, starredByMe: true }],
    ]);
    const answered = await momApi.story.prompts({ spaceId, narratorMemberId: grandmaMemberId });
    expect(
      answered
        .filter((p) => p.answered)
        .map((p) => p.key)
        .sort(),
    ).toEqual(["food_signature", "love_wedding"]);

    // 5. 할머니 계정 삭제 — 그 사람의 행은 어디에도 없고, 이야기는 작성 시점 스냅샷으로 가족에게 남는다
    await grandmaApi.user.deleteAccount({ confirm: true });
    expect(await leftovers(prisma, "userId", grandma.id)).toEqual({});
    const kept = await momApi.story.get({ spaceId, storyId: story.id });
    expect(kept.narrator).toMatchObject({ memberId: null, name: "할머니", label: "할머니" });
    expect((await momApi.space.get({ spaceId })).members).toHaveLength(1);

    // 6. Space 삭제 — 요청 → 유예 종료 → 정리 Cron이 R2부터 지우고 Space를 파기한다
    const request = await momApi.space.requestDeletion({ spaceId, confirmName: "봄이네" });
    expect(request.purgeAfter.getTime() - request.requestedAt.getTime()).toBeGreaterThan(DAY);
    await expect(
      momApi.moment.createDiary({ spaceId, subject: { type: "family" }, body: "일기" }),
    ).rejects.toThrow(/SPACE_DELETING/);
    await prisma.deletionRequest.updateMany({
      where: { spaceId },
      data: { purgeAfter: new Date(Date.now() - 1000) },
    });
    for (let i = 0; i < 5; i++) await runCleanup(prisma, storage);

    expect(await prisma.space.count({ where: { id: spaceId } })).toBe(0);
    expect(await leftovers(prisma, "spaceId", spaceId)).toEqual({});
    expect([...storage.objects.keys()]).toEqual([]);
    expect(storage.deleted).toEqual(
      expect.arrayContaining([
        `spaces/${spaceId}/${upload.assetId}`,
        `spaces/${spaceId}/${thumbnail}`,
      ]),
    );
    expect(await momApi.space.list()).toEqual([]);

    // 마지막으로 엄마도 계정을 지우면 두 사람 모두 비식별 묘비만 남는다
    await momApi.user.deleteAccount({ confirm: true });
    expect(await leftovers(prisma, "userId", mom.id)).toEqual({});
    const tombs = await prisma.user.findMany({ where: { id: { in: [mom.id, grandma.id] } } });
    expect(tombs.map((u) => [u.name, u.deletedAt !== null])).toEqual([
      [null, true],
      [null, true],
    ]);
    expect(await sent()).toEqual([]);
  });
});
