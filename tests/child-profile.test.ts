import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function withExpectingChild() {
  const setup = await mediaSetup(prisma);
  const child = await setup.api.child.create({
    spaceId: setup.spaceId,
    child: { nickname: "콩이", dueDate: "2027-03-01" },
  });
  return { ...setup, childId: child.id };
}

describe("child 프로필 관리", () => {
  it("태명 시절 아이를 출생으로 전환하면 태명·예정일은 남는다", async () => {
    const { api, spaceId, childId } = await withExpectingChild();
    const born = await api.child.markBorn({
      spaceId,
      childId,
      birthDate: "2026-09-28",
      name: "김봄",
    });
    expect(born).toMatchObject({
      status: "born",
      name: "김봄",
      nickname: "콩이",
      dueDate: new Date("2027-03-01T00:00:00Z"),
      birthDate: new Date("2026-09-28T00:00:00Z"),
    });
    await expect(
      api.child.markBorn({ spaceId, childId, birthDate: "2026-09-28" }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "CHILD_ALREADY_BORN" });
  });

  it("미래 생일·출생 전 생일 직접 수정·이름 모두 지우기는 거부한다", async () => {
    const { api, spaceId, childId } = await withExpectingChild();
    await expect(
      api.child.markBorn({ spaceId, childId, birthDate: "2099-01-01" }),
    ).rejects.toMatchObject({ message: "DATE_IN_FUTURE" });
    await expect(
      api.child.update({ spaceId, childId, birthDate: "2026-01-01" }),
    ).rejects.toMatchObject({ message: "USE_MARK_BORN" });
    await expect(api.child.update({ spaceId, childId, nickname: null })).rejects.toMatchObject({
      message: "NAME_REQUIRED",
    });
    await expect(
      api.child.update({ spaceId, childId, name: "김봄", nickname: null, dueDate: "2027-03-05" }),
    ).resolves.toMatchObject({ name: "김봄", nickname: null, status: "expecting" });
  });

  it("parent만 수정할 수 있고, 다른 Space의 아이는 찾을 수 없다", async () => {
    const a = await withExpectingChild();
    const grandparent = await addMember(prisma, a.spaceId, "grandparent");
    await expect(
      grandparent.child.update({ spaceId: a.spaceId, childId: a.childId, name: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const b = await mediaSetup(prisma);
    await expect(
      b.api.child.update({ spaceId: b.spaceId, childId: a.childId, name: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "SUBJECT_NOT_FOUND" });
    await expect(
      b.api.child.markBorn({ spaceId: b.spaceId, childId: a.childId, birthDate: "2026-09-01" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("동시에 출생 전환해도 한 번만 성공한다", async () => {
    const { api, spaceId, childId } = await withExpectingChild();
    const results = await Promise.allSettled(
      [1, 2, 3].map(() => api.child.markBorn({ spaceId, childId, birthDate: "2026-09-28" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
