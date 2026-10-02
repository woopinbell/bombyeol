import type { PrismaClient } from "@/generated/prisma/client";
import { DELETION_POLICY } from "@/lib/plan";

/**
 * 유예가 끝난 Space 삭제 요청을 진행한다(G-06, PRIVACY §5). 실행마다 조금씩:
 * 1. Space를 숨기고(deletedAt - 멤버에게 NOT_FOUND) 남은 파일을 모두 purging으로 넘긴다.
 * 2. 파일이 다 지워진(purging이 없는) Space는 행을 지워 DB 연쇄 삭제하고 요청을 완료로 남긴다.
 * R2 객체 삭제 자체는 같은 실행의 purgeAssets가 몫만큼 한다 - 파일이 많으면 여러 번에 걸쳐 끝난다.
 */
export async function purgeDueSpaces(prisma: PrismaClient, now = new Date()) {
  const due = await prisma.deletionRequest.findMany({
    where: { kind: "space", canceledAt: null, completedAt: null, purgeAfter: { lte: now } },
    orderBy: { purgeAfter: "asc" },
    take: DELETION_POLICY.spacesPerRun,
    select: { id: true, spaceId: true },
  });
  let started = 0;
  let completed = 0;
  for (const request of due) {
    const spaceId = request.spaceId as string;
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { deletedAt: true },
    });
    if (space && !space.deletedAt) {
      await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: now } });
      started += 1;
    }
    if (space) {
      await prisma.mediaAsset.updateMany({
        where: { spaceId, status: { in: ["pending", "confirmed"] } },
        data: { status: "purging" },
      });
      const remaining = await prisma.mediaAsset.count({ where: { spaceId, status: "purging" } });
      if (remaining > 0) continue;
    }
    await prisma.$transaction(async (tx) => {
      if (space) {
        // MomentMedia → MediaAsset은 RESTRICT라 연쇄 순서에 기대지 않고 먼저 지운다
        await tx.momentMedia.deleteMany({ where: { moment: { spaceId } } });
        await tx.space.delete({ where: { id: spaceId } });
      }
      await tx.deletionRequest.update({ where: { id: request.id }, data: { completedAt: now } });
    });
    completed += 1;
  }
  return { spacesStarted: started, spacesCompleted: completed };
}
