import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PushNotice } from "@/generated/prisma/client";
import { RATE_LIMITS } from "@/lib/plan";
import { deliverPush } from "@/server/push/deliver";
import { NOTICE_KINDS } from "@/server/push/types";
import { createTestPrisma, resetDb } from "./helpers/db";
import { FakeSender, giveToken, TEST_ORIGIN } from "./helpers/push";
import { exhaustRateLimit } from "./helpers/rate";
import { callerFor } from "./helpers/trpc";
import { createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 두 가족에 함께 있는 할머니 */
async function setup() {
  const mom = await createUser(prisma, "엄마");
  const grandma = await createUser(prisma, "할머니");
  const spaces = [];
  for (const name of ["친가", "외가"]) {
    const space = await prisma.space.create({ data: { name, createdById: mom.id } });
    await prisma.member.create({ data: { spaceId: space.id, userId: mom.id, role: "parent" } });
    await prisma.member.create({
      data: { spaceId: space.id, userId: grandma.id, role: "grandparent" },
    });
    spaces.push(space.id);
  }
  const token = await giveToken(prisma, grandma.id);
  return { mom, grandma, spaces, token, api: callerFor(prisma, grandma.id) };
}

const send = (spaceId: string, actorId: string, userId: string, notice: "moment" | "heart") =>
  deliverPush(prisma, sender, TEST_ORIGIN, {
    spaceId,
    actorId,
    userIds: [userId],
    notice,
    path: "/open/moment/m1",
    data: { type: "moment", id: "m1" },
  });
let sender = new FakeSender();
beforeEach(() => {
  sender = new FakeSender();
});

describe("가족별 알림 종류 끄기", () => {
  it("DB enum과 발송 종류가 같다", () => {
    expect(Object.values(PushNotice).sort()).toEqual([...NOTICE_KINDS].sort());
  });

  it("처음에는 모두 받고, 끈 종류는 그 가족에서만 빠진다", async () => {
    const { mom, grandma, spaces, token, api } = await setup();
    expect(await api.push.mutes({ spaceId: spaces[0] })).toEqual({ muted: [] });
    expect(await api.push.setMute({ spaceId: spaces[0], notice: "moment", muted: true })).toEqual({
      muted: ["moment"],
    });

    await send(spaces[0], mom.id, grandma.id, "moment");
    expect(sender.tokens()).toEqual([]);
    await send(spaces[0], mom.id, grandma.id, "heart");
    await send(spaces[1], mom.id, grandma.id, "moment");
    expect(sender.tokens()).toEqual([token, token]);
  });

  it("켜면 다시 받고, 여러 종류는 정해진 순서로 남는다(같은 값을 두 번 보내도 한 번)", async () => {
    const { spaces, api } = await setup();
    const spaceId = spaces[0];
    await api.push.setMute({ spaceId, notice: "heart", muted: true });
    await api.push.setMute({ spaceId, notice: "moment", muted: true });
    await api.push.setMute({ spaceId, notice: "moment", muted: true });
    expect(await api.push.mutes({ spaceId })).toEqual({ muted: ["moment", "heart"] });
    expect(await api.push.setMute({ spaceId, notice: "moment", muted: false })).toEqual({
      muted: ["heart"],
    });
  });

  it("다른 사람 설정은 바뀌지 않고, 멤버가 아닌 가족은 볼 수 없다", async () => {
    const { mom, spaces, api } = await setup();
    await api.push.setMute({ spaceId: spaces[0], notice: "story", muted: true });
    expect(await callerFor(prisma, mom.id).push.mutes({ spaceId: spaces[0] })).toEqual({
      muted: [],
    });
    const stranger = await createUser(prisma, "x");
    await expect(callerFor(prisma, stranger.id).push.mutes({ spaceId: spaces[0] })).rejects.toThrow(
      /NOT_FOUND/,
    );
  });

  it("삭제 유예 중에도 끌 수 있다", async () => {
    const { mom, spaces, api } = await setup();
    const space = await prisma.space.findUniqueOrThrow({ where: { id: spaces[0] } });
    await callerFor(prisma, mom.id).space.requestDeletion({
      spaceId: space.id,
      confirmName: space.name,
    });
    await expect(
      api.push.setMute({ spaceId: space.id, notice: "comment", muted: true }),
    ).resolves.toEqual({ muted: ["comment"] });
  });

  it("G-07: 사용자당 하루 리밋", async () => {
    const { grandma, spaces, api } = await setup();
    await exhaustRateLimit(prisma, `push-mute:${grandma.id}`, RATE_LIMITS.pushMutePerUser);
    await expect(
      api.push.setMute({ spaceId: spaces[0], notice: "ask", muted: true }),
    ).rejects.toThrow(/RATE_LIMITED/);
  });
});
