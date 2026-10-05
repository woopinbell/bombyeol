import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runDayReminders } from "@/server/jobs/day-reminders";
import ko from "../messages/ko.json";
import { createTestPrisma, resetDb } from "./helpers/db";
import { FakeSender, giveToken, TEST_ORIGIN } from "./helpers/push";
import { createUser } from "./helpers/users";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

// 한국 시간 2026-10-05 09:17(= UTC 00:17), Cron이 도는 시각
const morning = new Date("2026-10-05T00:17:00Z");

async function family(childBirth: string | null) {
  const mom = await createUser(prisma, "엄마");
  const grandma = await createUser(prisma, "할머니");
  const space = await prisma.space.create({ data: { name: "가족", createdById: mom.id } });
  await prisma.member.create({ data: { spaceId: space.id, userId: mom.id, role: "parent" } });
  const gm = await prisma.member.create({
    data: { spaceId: space.id, userId: grandma.id, role: "grandparent" },
  });
  if (childBirth) {
    await prisma.child.create({
      data: {
        spaceId: space.id,
        name: "봄이",
        status: "born",
        createdById: mom.id,
        birthDate: new Date(`${childBirth}T00:00:00Z`),
      },
    });
  }
  const tokens = [await giveToken(prisma, mom.id), await giveToken(prisma, grandma.id)];
  return { space, gm, tokens };
}

describe("가족의 날 아침 알림(Q-SCHED)", () => {
  it("오늘이 아이 생일이면 가족 모두에게 고정 문구로 한 번만 알린다", async () => {
    const { space, tokens } = await family("2025-10-05");
    const sender = new FakeSender();
    expect(await runDayReminders(prisma, sender, TEST_ORIGIN, morning)).toMatchObject({
      notified: 1,
      sent: 2,
    });
    expect(sender.tokens()).toEqual([...tokens].sort());
    const message = sender.sent[0].message;
    expect(message.body).toBe(ko.push.body.day);
    // 이름이나 무슨 날인지는 싣지 않는다(PRIVACY §3)
    expect(JSON.stringify(message)).not.toContain("봄이");
    expect(message.link).toBe(`${TEST_ORIGIN}/s/${space.id}/us`);

    // 같은 날 다음 회차(10시)는 다시 보내지 않는다
    const again = new FakeSender();
    await runDayReminders(prisma, again, TEST_ORIGIN, new Date("2026-10-05T01:17:00Z"));
    expect(again.sent).toEqual([]);
  });

  it("오늘이 아니면 보내지 않고, 9~11시 밖이면 아무것도 보지 않는다", async () => {
    await family("2025-10-06");
    const sender = new FakeSender();
    expect(await runDayReminders(prisma, sender, TEST_ORIGIN, morning)).toMatchObject({
      checked: 1,
      notified: 0,
    });
    expect(
      await runDayReminders(prisma, sender, TEST_ORIGIN, new Date("2026-10-05T05:17:00Z")),
    ).toEqual({ skipped: "hour" });
    expect(sender.sent).toEqual([]);
  });

  it("가족 모임이 오늘 시작하면 알리고, 이 알림을 끈 사람은 뺀다", async () => {
    const { space, gm, tokens } = await family(null);
    await prisma.familyEvent.create({
      data: {
        spaceId: space.id,
        title: "모임",
        kind: "gathering",
        allDay: true,
        startsAt: new Date("2026-10-05T00:00:00Z"),
        createdById: (
          await prisma.member.findFirstOrThrow({ where: { spaceId: space.id, role: "parent" } })
        ).userId,
      },
    });
    await prisma.member.update({ where: { id: gm.id }, data: { pushMuted: ["day"] } });
    const sender = new FakeSender();
    await runDayReminders(prisma, sender, TEST_ORIGIN, morning);
    expect(sender.tokens()).toEqual([tokens[0]]);
  });
});
