import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSIONS } from "@/lib/consents";
import { hasValidConsent } from "@/server/consents";
import { createTestPrisma, resetDb } from "./helpers/db";
import { mediaSetup } from "./helpers/media";
import { addMember } from "./helpers/members";
import { callerFor } from "./helpers/trpc";

const prisma = createTestPrisma();
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const v = CONSENT_VERSIONS;

describe("consent 동의 기록", () => {
  it("가입 동의는 현재 버전으로만 기록되고, 같은 동의를 다시 하면 기존 기록을 돌려준다", async () => {
    const user = await prisma.user.create({ data: { name: "부모" } });
    const api = callerFor(prisma, user.id);
    const before = await api.consent.status({});
    expect(before.account.map((c) => [c.kind, c.granted])).toEqual([
      ["terms", false],
      ["privacy", false],
    ]);

    await expect(
      api.consent.grantAccount({ kind: "terms", version: "1999-01-01" }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "CONSENT_VERSION_STALE" });
    const first = await api.consent.grantAccount({ kind: "terms", version: v.terms });
    const again = await api.consent.grantAccount({ kind: "terms", version: v.terms });
    expect(again.grantedAt).toEqual(first.grantedAt);
    expect(await prisma.consent.count()).toBe(1);

    const after = await api.consent.status({});
    expect(after).toMatchObject({
      account: [
        { kind: "terms", version: v.terms, granted: true },
        { kind: "privacy", granted: false, grantedAt: null },
      ],
      space: null,
    });
    await expect(callerFor(prisma, null).consent.status({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("문구 버전이 바뀌면 옛 동의는 유효하지 않다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    await prisma.consent.create({
      data: { userId: parent.id, spaceId, kind: "pregnancy", version: "2000-01-01" },
    });
    expect(await hasValidConsent(prisma, parent.id, "pregnancy", spaceId)).toBe(false);
    const { space } = await api.consent.status({ spaceId });
    expect(space).toContainEqual(expect.objectContaining({ kind: "pregnancy", granted: false }));
    await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: v.pregnancy });
    expect(await hasValidConsent(prisma, parent.id, "pregnancy", spaceId)).toBe(true);
  });

  it("Space 단위 동의는 parent만, 그 Space 안에서만 유효하다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    const grandma = await addMember(prisma, spaceId, "grandparent");
    await expect(
      grandma.consent.grantSpace({ spaceId, kind: "pregnancy", version: v.pregnancy }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await api.consent.grantSpace({ spaceId, kind: "child_data", version: v.child_data });
    await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: v.pregnancy });
    const { space } = await api.consent.status({ spaceId });
    expect(space?.every((c) => c.granted)).toBe(true);

    const other = await mediaSetup(prisma);
    expect(await hasValidConsent(prisma, parent.id, "pregnancy", other.spaceId)).toBe(false);
    // 멤버가 아닌 Space의 현황은 존재를 드러내지 않는다
    await expect(api.consent.status({ spaceId: other.spaceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("임신 동의는 본인이 철회할 수 있고, 철회 후 다시 동의하면 새 기록이 남는다", async () => {
    const { api, parent, spaceId } = await mediaSetup(prisma);
    await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: v.pregnancy });
    await expect(api.consent.withdraw({ spaceId, kind: "pregnancy" })).resolves.toEqual({
      withdrawn: true,
    });
    expect(await hasValidConsent(prisma, parent.id, "pregnancy", spaceId)).toBe(false);
    await expect(api.consent.withdraw({ spaceId, kind: "pregnancy" })).resolves.toEqual({
      withdrawn: false,
    });
    await api.consent.grantSpace({ spaceId, kind: "pregnancy", version: v.pregnancy });
    // 철회 기록은 남는다(추가 전용)
    expect(await prisma.consent.count({ where: { withdrawnAt: { not: null } } })).toBe(1);
    expect(await hasValidConsent(prisma, parent.id, "pregnancy", spaceId)).toBe(true);
  });
});
