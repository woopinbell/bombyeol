import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS } from "@/lib/plan";
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
  const pet = await setup.api.pet.create({ spaceId: setup.spaceId, name: "보리", species: "dog" });
  return {
    ...setup,
    child: { type: "child", childId: child.id } as const,
    pet: { type: "pet", petId: pet.id } as const,
  };
}

describe("milestone 기록", () => {
  it("아이 키, 첫 걸음을 기록하고 기록일 최신순으로 본다", async () => {
    const { api, spaceId, child } = await family();
    await api.milestone.create({
      spaceId,
      subject: child,
      kind: "height",
      value: { value: 68.5 },
      recordedAt: "2026-07-01",
    });
    const step = await api.milestone.create({
      spaceId,
      subject: child,
      kind: "step",
      value: { note: "거실에서 세 걸음" },
      recordedAt: "2026-09-20",
    });
    expect(step).toMatchObject({ kind: "step", value: { note: "거실에서 세 걸음" } });
    const list = await api.milestone.list({ spaceId, subject: child });
    expect(list.map((m) => m.kind)).toEqual(["step", "height"]);
  });

  it("같은 순간은 여러 번 남기고, '처음' 표시는 대상, 종류마다 하나(동시 요청 포함)", async () => {
    const { api, spaceId, child, pet } = await family();
    const word = { spaceId, subject: child, kind: "word", value: {}, recordedAt: "2026-09-01" };
    await api.milestone.create(word);
    await api.milestone.create(word);
    const results = await Promise.allSettled(
      [1, 2, 3].map(() => api.milestone.create({ ...word, first: true })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT", message: "MILESTONE_FIRST_EXISTS" },
    });
    const words = await api.milestone.list({ spaceId, subject: child });
    expect(words.map((m) => m.isFirst).sort()).toEqual([false, false, true]);

    // 다른 종류의 처음은 따로, 측정과 한 번뿐인 기록에는 처음을 붙이지 않는다
    await api.milestone.create({ ...word, kind: "step", first: true });
    await expect(
      api.milestone.create({ ...word, kind: "height", value: { value: 70 }, first: true }),
    ).rejects.toMatchObject({ message: "MILESTONE_FIRST_INVALID" });
    // 직접 쓰기는 제목이 달라 처음을 여러 번 붙일 수 있다
    for (const title of ["첫 바다", "첫 눈"]) {
      await api.milestone.create({ ...word, kind: "custom", value: { title }, first: true });
    }
    // 입양일은 대상당 하나
    const adoption = {
      spaceId,
      subject: pet,
      kind: "adoption",
      value: {},
      recordedAt: "2026-01-01",
    };
    await api.milestone.create(adoption);
    await expect(api.milestone.create(adoption)).rejects.toMatchObject({
      message: "MILESTONE_EXISTS",
    });
    await expect(api.milestone.create({ ...adoption, first: true })).rejects.toMatchObject({
      message: "MILESTONE_EXISTS",
    });

    // 처음 표시는 고치기로 옮길 수 있다(먼저 끄고 다른 기록에 켠다)
    const [firstWord, plainWord] = [words.find((m) => m.isFirst)!, words.find((m) => !m.isFirst)!];
    await expect(
      api.milestone.update({ spaceId, milestoneId: plainWord.id, first: true }),
    ).rejects.toMatchObject({ message: "MILESTONE_FIRST_EXISTS" });
    await api.milestone.update({ spaceId, milestoneId: firstWord.id, first: false });
    await expect(
      api.milestone.update({ spaceId, milestoneId: plainWord.id, first: true }),
    ).resolves.toMatchObject({ isFirst: true });
    for (const day of ["2026-08-01", "2026-09-01"]) {
      await api.milestone.create({
        spaceId,
        subject: pet,
        kind: "weight",
        value: { value: 12.3 },
        recordedAt: day,
      });
    }
    expect(await api.milestone.list({ spaceId, subject: pet })).toHaveLength(3); // 입양일 + 몸무게 2
  });

  it("가족 전체 마일스톤을 한 번에(대상 거르기 가능), 기록일 최신순", async () => {
    const { api, spaceId, child, pet } = await family();
    await api.milestone.create({
      spaceId,
      subject: child,
      kind: "step",
      value: {},
      recordedAt: "2026-09-02",
    });
    await api.milestone.create({
      spaceId,
      subject: pet,
      kind: "walk",
      value: {},
      recordedAt: "2026-09-03",
    });
    const all = await api.milestone.listAll({ spaceId });
    expect(all.map((m) => m.kind)).toEqual(["walk", "step"]);
    expect(all[0].reactions).toEqual({ likes: 0, comments: 0, likedByMe: false });
    const onlyChild = await api.milestone.listAll({ spaceId, subject: child });
    expect(onlyChild.map((m) => m.kind)).toEqual(["step"]);
  });

  it("대상에 맞지 않는 kind, 범위 밖 값, 모르는 필드를 거부한다", async () => {
    const { api, spaceId, child, pet } = await family();
    const base = { spaceId, recordedAt: "2026-09-01" };
    await expect(
      api.milestone.create({ ...base, subject: child, kind: "adoption", value: {} }),
    ).rejects.toMatchObject({ message: "MILESTONE_KIND_INVALID" });
    await expect(
      api.milestone.create({ ...base, subject: child, kind: "height", value: { value: 500 } }),
    ).rejects.toMatchObject({ message: "MILESTONE_VALUE_INVALID" });
    await expect(
      api.milestone.create({
        ...base,
        subject: pet,
        kind: "vaccination",
        value: { note: "종합백신", medication: "x" },
      }),
    ).rejects.toMatchObject({ message: "MILESTONE_VALUE_INVALID" });
    await expect(
      api.milestone.create({ ...base, subject: pet, kind: "custom", value: { note: "제목 없음" } }),
    ).rejects.toMatchObject({ message: "MILESTONE_VALUE_INVALID" });
    await expect(
      api.milestone.create({
        ...base,
        subject: child,
        kind: "step",
        value: {},
        recordedAt: "2099-01-01",
      }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
  });

  it("권한: 아이는 parent만, 반려동물은 grandparent도, 수정, 삭제는 작성자 또는 parent", async () => {
    const { api, spaceId, storage, child, pet } = await family();
    const grandparent = await addMember(prisma, spaceId, "grandparent", storage);
    const relative = await addMember(prisma, spaceId, "relative", storage);
    const base = { spaceId, kind: "walk", value: {}, recordedAt: "2026-09-01" };
    await expect(
      grandparent.milestone.create({ ...base, subject: child, kind: "step" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(relative.milestone.create({ ...base, subject: pet })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const walk = await grandparent.milestone.create({ ...base, subject: pet });

    const height = await api.milestone.create({
      spaceId,
      subject: child,
      kind: "height",
      value: { value: 70 },
      recordedAt: "2026-09-01",
    });
    await expect(
      grandparent.milestone.update({ spaceId, milestoneId: height.id, value: { value: 71 } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.milestone.update({ spaceId, milestoneId: height.id, value: { value: 999 } }),
    ).rejects.toMatchObject({ message: "MILESTONE_VALUE_INVALID" });
    await expect(
      api.milestone.update({ spaceId, milestoneId: height.id, value: { value: 71 } }),
    ).resolves.toMatchObject({ value: { value: 71 } });

    await expect(relative.milestone.list({ spaceId, subject: pet })).resolves.toHaveLength(1);
    await grandparent.milestone.delete({ spaceId, milestoneId: walk.id });
    await api.milestone.delete({ spaceId, milestoneId: height.id });
    expect(await prisma.milestone.count()).toBe(0);
  });

  it("다른 Space의 대상, 기록에는 접근할 수 없다", async () => {
    const a = await family();
    const b = await family();
    await expect(
      b.api.milestone.create({
        spaceId: b.spaceId,
        subject: a.child,
        kind: "step",
        value: {},
        recordedAt: "2026-09-01",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "SUBJECT_NOT_FOUND" });
    const m = await a.api.milestone.create({
      spaceId: a.spaceId,
      subject: a.child,
      kind: "step",
      value: {},
      recordedAt: "2026-09-01",
    });
    await expect(
      b.api.milestone.delete({ spaceId: b.spaceId, milestoneId: m.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      b.api.milestone.suggestions({ spaceId: b.spaceId, childId: a.child.childId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("나이 기반 제안은 이미 기록한 '처음'을 빼고 준다", async () => {
    const { api, spaceId } = await family();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    sixMonthsAgo.setUTCDate(1);
    const { id: childId } = await api.child.create({
      spaceId,
      child: { name: "둘째", birthDate: sixMonthsAgo.toISOString().slice(0, 10) },
    });
    const before = await api.milestone.suggestions({ spaceId, childId });
    expect(before).toEqual(["roll", "sit", "tooth", "crawl", "height", "weight"]);
    const roll = {
      spaceId,
      subject: { type: "child" as const, childId },
      kind: "roll",
      value: {},
      recordedAt: new Date().toISOString().slice(0, 10),
    };
    // 처음 표시 없는 기록은 제안을 지우지 않는다
    await api.milestone.create(roll);
    expect(await api.milestone.suggestions({ spaceId, childId })).toEqual(before);
    await api.milestone.create({ ...roll, first: true });
    const after = await api.milestone.suggestions({ spaceId, childId });
    expect(after).toEqual(["sit", "tooth", "crawl", "height", "weight"]);
  });

  it("G-07: 글 기록 작성은 사용자당 리밋에 걸린다", async () => {
    const { api, parent, spaceId, pet } = await family();
    await exhaustRateLimit(prisma, `record-write:${parent.id}`, RATE_LIMITS.recordWritePerUser);
    await expect(
      api.milestone.create({
        spaceId,
        subject: pet,
        kind: "weight",
        value: { value: 10 },
        recordedAt: "2026-09-01",
      }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
