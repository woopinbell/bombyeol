import type { PrismaClient } from "@/generated/prisma/client";
import { inputError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { markPurging } from "@/server/media/purge";
import { openSpaceDeletion } from "@/server/trpc/procedures";

/**
 * 계정 삭제(G-06, PRIVACY §2.5·§5). 콘텐츠는 Space(가족) 소유라 남기고, 그 사람을 알아볼 수 있는 정보를 지운다.
 * - 지움: 로그인 연결(Account)·푸시 토큰·동의 기록·모든 멤버십·내가 낸 미사용 초대, 내가 쓴 임신 기록(건강 정보)
 *   — 초음파 파일은 purging으로 넘겨 정리 Cron이 R2에서 지운다(G-05).
 * - 남김: User 행은 비식별 묘비(이름 없음, deletedAt)로 — 가족 기록의 작성자 FK가 가리킨다. 이야기는 작성 시점 스냅샷.
 * - 혼자 남은 Space(다른 활동 멤버 없음)는 유예 없이 파기 대상으로 올린다(취소·내보내기할 사람이 없음).
 * - 다른 멤버가 있는 Space의 유일한 parent면 막는다(LAST_PARENT) — 먼저 다른 parent를 세우거나 Space를 삭제.
 * 구독 해지 연쇄는 Phase 8(결제)에서 이 경로에 붙인다 — TODO(G-06).
 */
export async function deleteAccount(prisma: PrismaClient, userId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await lockKey(tx, `user-delete:${userId}`);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });
    if (!user || user.deletedAt) return { ok: true, spacesPurged: 0 };

    const memberships = await tx.member.findMany({
      where: { userId, space: { deletedAt: null } },
      select: { spaceId: true, role: true, space: { select: { createdById: true } } },
    });
    const solo: { spaceId: string; createdById: string }[] = [];
    for (const m of memberships) {
      // 기념 상태인 분은 활동하는 멤버로 세지 않는다
      const others = await tx.member.groupBy({
        by: ["role"],
        where: { spaceId: m.spaceId, userId: { not: userId }, memorial: { is: null } },
        _count: true,
      });
      const total = others.reduce((sum, g) => sum + g._count, 0);
      const parents = others.find((g) => g.role === "parent")?._count ?? 0;
      if (total === 0) {
        solo.push({ spaceId: m.spaceId, createdById: m.space.createdById });
        continue;
      }
      if (m.role === "parent" && parents === 0) {
        const deleting = await tx.deletionRequest.findFirst({
          where: openSpaceDeletion(m.spaceId),
          select: { id: true },
        });
        if (!deleting) throw inputError("LAST_PARENT");
      }
    }

    for (const space of solo) {
      const open = await tx.deletionRequest.findFirst({
        where: openSpaceDeletion(space.spaceId),
        select: { id: true },
      });
      if (open) {
        await tx.deletionRequest.update({ where: { id: open.id }, data: { purgeAfter: now } });
      } else {
        await tx.deletionRequest.create({
          data: {
            kind: "space",
            spaceId: space.spaceId,
            userId,
            spaceCreatedById: space.createdById,
            requestedAt: now,
            purgeAfter: now,
          },
        });
      }
    }

    // 내가 쓴 임신 기록(건강 정보)과 초음파 파일
    const records = await tx.pregnancyRecord.findMany({
      where: { createdById: userId },
      select: { id: true, spaceId: true, photoAssetId: true },
    });
    const bySpace = new Map<string, string[]>();
    for (const r of records) {
      if (r.photoAssetId)
        bySpace.set(r.spaceId, [...(bySpace.get(r.spaceId) ?? []), r.photoAssetId]);
    }
    for (const [spaceId, assetIds] of bySpace) await markPurging(tx, spaceId, assetIds, now);
    await tx.pregnancyRecord.deleteMany({ where: { createdById: userId } });

    await tx.invite.deleteMany({ where: { createdById: userId, usedAt: null } });
    await tx.member.deleteMany({ where: { userId } });
    await tx.consent.deleteMany({ where: { userId } });
    await tx.pushToken.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { name: null, deletedAt: now } });
    await tx.deletionRequest.create({
      data: { kind: "account", userId, requestedAt: now, purgeAfter: now, completedAt: now },
    });
    return { ok: true, spacesPurged: solo.length };
  });
}
