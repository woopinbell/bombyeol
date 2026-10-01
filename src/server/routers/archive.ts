import { z } from "zod";
import { DELETION_POLICY, MEDIA_POLICY, RATE_LIMITS } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { hitRateLimit } from "@/server/rate-limit";
import { mediaKeys } from "@/server/storage/types";
import { parentProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

const cursorInput = z.object({ createdAt: z.date(), id: entityId }).optional();
type Cursor = z.infer<typeof cursorInput>;

/** (createdAt, id) 오름차순 커서 — 내보내는 동안 새 기록이 생겨도 빠지거나 겹치지 않는다 */
function after(cursor: Cursor) {
  return cursor
    ? {
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      }
    : {};
}

const order = [{ createdAt: "asc" as const }, { id: "asc" as const }];

function page<T extends { createdAt: Date; id: string }>(rows: T[], size: number) {
  const items = rows.slice(0, size);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > size && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

const author = { select: { name: true } } as const;

const recordKinds = [
  "children",
  "pets",
  "moments",
  "milestones",
  "stories",
  "events",
  "pregnancy",
] as const;

/**
 * 데이터 내보내기(PRIVACY §2.5, Space 삭제 유예 중에도). parent만 — 임신 기록 열람 규칙과 같다.
 * 서버는 목록과 짧은 TTL 읽기 URL만 주고 ZIP은 브라우저가 만든다(Worker CPU·메모리 보호, S-7과 같은 원칙).
 * 페이지 요청은 사용자당 리밋(G-07).
 */
export const archiveRouter = router({
  /** 원본 파일 목록(썸네일 제외)과 각 파일이 어디에 붙어 있는지 */
  media: parentProcedure.input(z.object({ cursor: cursorInput })).query(async ({ ctx, input }) => {
    await limit(ctx);
    const spaceId = ctx.member.spaceId;
    const rows = await ctx.prisma.mediaAsset.findMany({
      where: { spaceId, status: "confirmed", momentThumb: { is: null }, ...after(input.cursor) },
      orderBy: order,
      take: DELETION_POLICY.archiveMediaPageSize + 1,
      select: {
        id: true,
        kind: true,
        contentType: true,
        bytes: true,
        createdAt: true,
        momentMedia: { select: { momentId: true, position: true } },
        storyPhoto: { select: { id: true } },
        petCover: { select: { id: true } },
        pregnancy: { select: { id: true } },
      },
    });
    const result = page(rows, DELETION_POLICY.archiveMediaPageSize);
    const items = await Promise.all(
      result.items.map(async (a) => ({
        id: a.id,
        kind: a.kind,
        contentType: a.contentType,
        bytes: a.bytes,
        createdAt: a.createdAt,
        attachedTo: a.momentMedia
          ? {
              type: "moment" as const,
              id: a.momentMedia.momentId,
              position: a.momentMedia.position,
            }
          : a.storyPhoto
            ? { type: "story" as const, id: a.storyPhoto.id }
            : a.petCover
              ? { type: "pet" as const, id: a.petCover.id }
              : a.pregnancy
                ? { type: "pregnancy" as const, id: a.pregnancy.id }
                : null,
        url: await ctx.storage.presignGet(
          mediaKeys.final(spaceId, a.id),
          MEDIA_POLICY.readUrlTtlSec,
        ),
      })),
    );
    return { items, nextCursor: result.nextCursor };
  }),

  /** 글 기록(종류별 페이지): 아이·반려동물 프로필, 사진 설명·일기, 마일스톤, 이야기, 일정, 임신 기록 */
  records: parentProcedure
    .input(z.object({ kind: z.enum(recordKinds), cursor: cursorInput }))
    .query(async ({ ctx, input }) => {
      await limit(ctx);
      const where = { spaceId: ctx.member.spaceId, ...after(input.cursor) };
      const take = DELETION_POLICY.archiveRecordPageSize + 1;
      const size = DELETION_POLICY.archiveRecordPageSize;
      const db = ctx.prisma;
      switch (input.kind) {
        case "children":
          return page(await db.child.findMany({ where, orderBy: order, take }), size);
        case "pets":
          return page(await db.pet.findMany({ where, orderBy: order, take }), size);
        case "moments":
          return page(
            await db.moment.findMany({
              where,
              orderBy: order,
              take,
              include: { createdBy: author, media: { select: { assetId: true, position: true } } },
            }),
            size,
          );
        case "milestones":
          return page(
            await db.milestone.findMany({
              where,
              orderBy: order,
              take,
              include: { createdBy: author },
            }),
            size,
          );
        case "stories":
          return page(
            await db.storyEntry.findMany({
              where,
              orderBy: order,
              take,
              include: { createdBy: author, ask: { select: { promptKey: true, question: true } } },
            }),
            size,
          );
        case "events":
          return page(
            await db.familyEvent.findMany({
              where,
              orderBy: order,
              take,
              include: { createdBy: author },
            }),
            size,
          );
        case "pregnancy":
          return page(
            await db.pregnancyRecord.findMany({
              where,
              orderBy: order,
              take,
              include: { createdBy: author },
            }),
            size,
          );
      }
    }),
});

async function limit(ctx: { prisma: Parameters<typeof hitRateLimit>[0]; userId: string }) {
  const ok = await hitRateLimit(
    ctx.prisma,
    `archive:${ctx.userId}`,
    RATE_LIMITS.archivePagePerUser,
  );
  if (!ok) throw limitError("RATE_LIMITED");
}
