import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberRole } from "@/generated/prisma/client";
import { PUSH_POLICY } from "@/lib/plan";
import { deliverPush, type DeliverRequest } from "@/server/push/deliver";
import { createPushDispatcher } from "@/server/push/dispatch";
import ko from "../messages/ko.json";
import { createTestPrisma, resetDb } from "./helpers/db";
import { FakeSender, giveToken, TEST_ORIGIN } from "./helpers/push";
import { exhaustRateLimit } from "./helpers/rate";
import { createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function family() {
  const actor = await createUser(prisma, "엄마");
  const space = await prisma.space.create({ data: { name: "가족", createdById: actor.id } });
  await prisma.member.create({ data: { spaceId: space.id, userId: actor.id, role: "parent" } });
  await giveToken(prisma, actor.id);
  const join = async (role: MemberRole, name: string = role) => {
    const user = await createUser(prisma, name);
    const member = await prisma.member.create({
      data: { spaceId: space.id, userId: user.id, role, relationLabel: "할머니" },
    });
    const token = await giveToken(prisma, user.id);
    return { userId: user.id, memberId: member.id, token };
  };
  return { actor, space, join };
}

function request(spaceId: string, actorId: string, userIds: string[]): DeliverRequest {
  return {
    spaceId,
    actorId,
    userIds,
    notice: "moment",
    path: "/open/moment/m1",
    data: { type: "moment", id: "m1" },
  };
}

describe("deliverPush - 발송 시점 수신자 재확인", () => {
  it("지금 멤버인 사람에게만, 보낸 사람 본인은 빼고 보낸다", async () => {
    const { actor, space, join } = await family();
    const grandma = await join("grandparent");
    const outsider = await createUser(prisma, "남");
    await giveToken(prisma, outsider.id);
    const sender = new FakeSender();
    const result = await deliverPush(
      prisma,
      sender,
      TEST_ORIGIN,
      request(space.id, actor.id, [actor.id, grandma.userId, outsider.id]),
    );
    expect(sender.tokens()).toEqual([grandma.token]);
    expect(result).toMatchObject({ recipients: 1, sent: 1 });
  });

  it("내보내진 멤버, 기념 상태 멤버, 탈퇴 계정, 삭제된 Space에는 보내지 않는다", async () => {
    const { actor, space, join } = await family();
    const removed = await join("relative");
    const memorial = await join("grandparent");
    const gone = await join("grandparent");
    await prisma.member.delete({ where: { id: removed.memberId } });
    await prisma.memorialProfile.create({
      data: { spaceId: space.id, memberId: memorial.memberId, createdById: actor.id },
    });
    await prisma.user.update({ where: { id: gone.userId }, data: { deletedAt: new Date() } });
    const sender = new FakeSender();
    await deliverPush(
      prisma,
      sender,
      TEST_ORIGIN,
      request(space.id, actor.id, [removed.userId, memorial.userId, gone.userId]),
    );
    expect(sender.sent).toEqual([]);

    const alive = await join("grandparent");
    await prisma.space.update({ where: { id: space.id }, data: { deletedAt: new Date() } });
    await deliverPush(prisma, sender, TEST_ORIGIN, request(space.id, actor.id, [alive.userId]));
    expect(sender.sent).toEqual([]);
  });

  it("역할 제한이 있으면 그 역할에게만 보낸다", async () => {
    const { actor, space, join } = await family();
    const dad = await join("parent");
    const grandma = await join("grandparent");
    const sender = new FakeSender();
    await deliverPush(prisma, sender, TEST_ORIGIN, {
      ...request(space.id, actor.id, [dad.userId, grandma.userId]),
      roles: ["parent"],
    });
    expect(sender.tokens()).toEqual([dad.token]);
  });

  it("PRIVACY §3: 문구는 고정 문구뿐 - 이름, 관계 표시명이 들어가지 않는다", async () => {
    const { actor, space, join } = await family();
    const grandma = await join("grandparent", "김순자");
    const sender = new FakeSender();
    await deliverPush(prisma, sender, TEST_ORIGIN, {
      ...request(space.id, actor.id, [grandma.userId]),
      notice: "news",
    });
    const [{ message }] = sender.sent;
    expect(message.title).toBe(ko.push.title);
    expect(message.body).toBe(ko.push.body.news);
    const all = JSON.stringify(message);
    for (const word of ["김순자", "엄마", "할머니"]) expect(all).not.toContain(word);
    expect(message.link).toBe(`${TEST_ORIGIN}/open/moment/m1`);
  });

  it("수신자당 최근 기기 몇 개, 이벤트당 발송 수에 상한이 있다(하위 요청 한도)", async () => {
    const { actor, space, join } = await family();
    const one = await join("grandparent");
    for (let i = 0; i < PUSH_POLICY.tokensPerRecipient + 2; i++) {
      await prisma.pushToken.create({
        data: { userId: one.userId, token: `old-${i}`, lastSeenAt: new Date(Date.now() - 1e9) },
      });
    }
    const sender = new FakeSender();
    await deliverPush(prisma, sender, TEST_ORIGIN, request(space.id, actor.id, [one.userId]));
    expect(sender.sent).toHaveLength(PUSH_POLICY.tokensPerRecipient);
    expect(sender.tokens()).toContain(one.token); // 최근 기기가 먼저

    const many = [];
    const need = Math.ceil(PUSH_POLICY.maxSendsPerEvent / PUSH_POLICY.tokensPerRecipient) + 2;
    for (let i = 0; i < need; i++) {
      const m = await join("relative");
      for (let j = 0; j < PUSH_POLICY.tokensPerRecipient - 1; j++) {
        await giveToken(prisma, m.userId, `${m.token}-${j}`);
      }
      many.push(m.userId);
    }
    const wide = new FakeSender();
    await deliverPush(prisma, wide, TEST_ORIGIN, request(space.id, actor.id, many));
    expect(wide.sent).toHaveLength(PUSH_POLICY.maxSendsPerEvent);
  });

  it("수신자 한 명당 시간당 상한을 넘으면 그 사람은 건너뛴다", async () => {
    const { actor, space, join } = await family();
    const grandma = await join("grandparent");
    const dad = await join("parent");
    await exhaustRateLimit(prisma, `push-recv:${grandma.userId}`, {
      limit: PUSH_POLICY.perRecipientPerHour,
      windowSec: 60 * 60,
    });
    const sender = new FakeSender();
    await deliverPush(
      prisma,
      sender,
      TEST_ORIGIN,
      request(space.id, actor.id, [grandma.userId, dad.userId]),
    );
    expect(sender.tokens()).toEqual([dad.token]);
  });

  it("FCM이 무효라고 답한 토큰만 지운다(일시 오류는 남긴다)", async () => {
    const { actor, space, join } = await family();
    const a = await join("grandparent");
    const b = await join("parent");
    const sender = new FakeSender();
    sender.outcomes.set(a.token, "invalid_token");
    sender.outcomes.set(b.token, "error");
    const result = await deliverPush(
      prisma,
      sender,
      TEST_ORIGIN,
      request(space.id, actor.id, [a.userId, b.userId]),
    );
    expect(result).toMatchObject({ sent: 0, failed: 1, pruned: 1 });
    const left = (await prisma.pushToken.findMany()).map((t) => t.token);
    expect(left).not.toContain(a.token);
    expect(left).toContain(b.token);
  });
});

describe("createPushDispatcher", () => {
  it("발송 설정이 없으면 작업을 실행하지 않는다", async () => {
    const task = vi.fn(async () => undefined);
    const scheduled: Promise<unknown>[] = [];
    createPushDispatcher({ prisma, sender: null, origin: TEST_ORIGIN }, (w) =>
      scheduled.push(w),
    ).defer(task);
    expect(task).not.toHaveBeenCalled();
    expect(scheduled).toEqual([]);
  });

  it("작업 실패는 삼키고 개인정보 없이 오류 이름만 남긴다", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scheduled: Promise<unknown>[] = [];
    createPushDispatcher({ prisma, sender: new FakeSender(), origin: TEST_ORIGIN }, (w) =>
      scheduled.push(w),
    ).defer(async () => {
      throw new Error("token=secret 김순자");
    });
    await expect(Promise.all(scheduled)).resolves.toBeTruthy();
    expect(JSON.stringify(error.mock.calls)).not.toContain("김순자");
    error.mockRestore();
  });
});
