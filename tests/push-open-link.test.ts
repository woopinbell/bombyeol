import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

/** 부모, 할머니, 아이 하나(예정일)와 종류별 기록 하나씩 */
async function family() {
  const setup = await mediaSetup(prisma);
  const { api, spaceId } = setup;
  const grandma = await addMember(prisma, spaceId, "grandparent");
  const grandmaMember = await prisma.member.findFirstOrThrow({
    where: { spaceId, role: "grandparent" },
  });
  const child = await api.child.create({
    spaceId,
    child: { name: "김봄", birthDate: "2026-01-01" },
  });
  const subject = { type: "child", childId: child.id } as const;
  const moment = await api.moment.createDiary({ spaceId, subject, body: "첫 뒤집기" });
  const milestone = await api.milestone.create({
    spaceId,
    subject,
    kind: "height",
    value: { value: 68.5 },
    recordedAt: "2026-07-01",
  });
  const story = await grandma.story.create({ spaceId, body: "고무줄놀이" });
  const ask = await api.story.ask({
    spaceId,
    toMemberId: grandmaMember.id,
    promptKey: "grandchildren_birth",
  });
  await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: CONSENT_VERSIONS.pregnancy });
  const baby = await api.child.create({
    spaceId,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  const hidden = await api.pregnancy.create({
    spaceId,
    childId: baby.id,
    kind: "kick",
    date: "2026-09-28",
  });
  const shared = await api.pregnancy.create({
    spaceId,
    childId: baby.id,
    kind: "checkup",
    date: "2026-09-20",
    visibility: "family",
  });
  return { ...setup, grandma, moment, milestone, story, ask, baby, hidden, shared };
}

describe("push.openLink 알림 링크 해석", () => {
  it("종류마다 그 기록이 있는 화면으로 보낸다", async () => {
    const f = await family();
    const open = (type: "moment" | "milestone" | "story" | "ask" | "pregnancy", id: string) =>
      f.api.push.openLink({ type, id }).then((r) => r.path);
    // 화면이 그 기록을 바로 펼치도록 ?open={id}
    await expect(open("moment", f.moment.id)).resolves.toBe(`/s/${f.spaceId}?open=${f.moment.id}`);
    await expect(open("milestone", f.milestone.id)).resolves.toBe(
      `/s/${f.spaceId}?open=${f.milestone.id}`,
    );
    await expect(open("story", f.story.id)).resolves.toBe(
      `/s/${f.spaceId}/story?open=${f.story.id}`,
    );
    await expect(open("ask", f.ask.id)).resolves.toBe(`/s/${f.spaceId}/story?open=${f.ask.id}`);
    await expect(open("pregnancy", f.hidden.id)).resolves.toBe(
      `/s/${f.spaceId}/us/pregnancy/${f.baby.id}?open=${f.hidden.id}`,
    );
    // 종류와 id가 맞지 않으면 없는 것
    await expect(open("story", f.moment.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("임신 기록은 지금의 공개 범위로: 어르신은 가족 공개만 열린다", async () => {
    const f = await family();
    await expect(f.grandma.push.openLink({ type: "pregnancy", id: f.shared.id })).resolves.toEqual({
      path: `/s/${f.spaceId}/us/pregnancy/${f.baby.id}?open=${f.shared.id}`,
    });
    await expect(
      f.grandma.push.openLink({ type: "pregnancy", id: f.hidden.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    // 나중에 엄마 아빠만으로 좁히면 이미 받은 알림도 열리지 않는다
    await f.api.pregnancy.update({
      spaceId: f.spaceId,
      recordId: f.shared.id,
      visibility: "parents_only",
    });
    await expect(
      f.grandma.push.openLink({ type: "pregnancy", id: f.shared.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("멤버가 아니거나 지운 기록, 지운 Space, 비로그인은 열리지 않는다", async () => {
    const f = await family();
    const stranger = await mediaSetup(prisma);
    await expect(
      stranger.api.push.openLink({ type: "moment", id: f.moment.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await prisma.storyEntry.delete({ where: { id: f.story.id } });
    await expect(f.api.push.openLink({ type: "story", id: f.story.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await prisma.space.update({ where: { id: f.spaceId }, data: { deletedAt: new Date() } });
    await expect(f.api.push.openLink({ type: "moment", id: f.moment.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      callerFor(prisma, null).push.openLink({ type: "moment", id: f.moment.id }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
