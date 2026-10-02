import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { MomentKind, Prisma } from "@/generated/prisma/client";
import { MEDIA_POLICY, MOMENT_POLICY, RATE_LIMITS } from "@/lib/plan";
import { inputError, limitError, mediaError, notFound } from "@/server/errors";
import { notify } from "@/server/push/events";
import { removeAsset, requireAttachableAssets, withAttachConflict } from "@/server/media/assets";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";
import { hitRateLimit } from "@/server/rate-limit";
import { reactionSummaries } from "@/server/reactions";
import { canRecordFor, resolveSubject, subjectInput, type SubjectInput } from "@/server/subjects";
import type { Context } from "@/server/trpc/context";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture } from "./inputs";

const body = z.string().trim().min(1).max(MOMENT_POLICY.bodyMaxChars);
const takenAt = z.date().refine((d) => d.getUTCFullYear() >= 1900, { message: "DATE_TOO_OLD" });

const mediaItems = z
  .array(z.object({ assetId: entityId, thumbnailAssetId: entityId.optional() }))
  .max(MOMENT_POLICY.maxMediaPerMoment);

/** 첨부 검증(G-02): 원본은 사진, 영상, 썸네일은 사진. 같은 자산을 두 번 쓸 수 없다 */
async function checkMedia(
  prisma: Parameters<typeof requireAttachableAssets>[0],
  spaceId: string,
  items: z.infer<typeof mediaItems>,
) {
  const originals = items.map((m) => m.assetId);
  const thumbnails = items.flatMap((m) => (m.thumbnailAssetId ? [m.thumbnailAssetId] : []));
  const all = [...originals, ...thumbnails];
  if (new Set(all).size !== all.length) throw mediaError("ASSET_INVALID");
  await requireAttachableAssets(prisma, spaceId, originals);
  await requireAttachableAssets(prisma, spaceId, thumbnails, ["image"]);
}

const momentSelect = {
  id: true,
  kind: true,
  body: true,
  takenAt: true,
  childId: true,
  petId: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
  media: {
    // 삭제 도중 실패한 기록에서 지워진 파일은 보여주지 않는다(재시도로 마저 지움)
    where: { asset: { status: "confirmed" } },
    orderBy: { position: "asc" },
    select: {
      asset: { select: { id: true, kind: true, contentType: true } },
      thumbnail: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.MomentSelect;

type SpaceCtx = Context & { userId: string; member: { spaceId: string } };

type MomentRow = Prisma.MomentGetPayload<{ select: typeof momentSelect }>;

/** 응답용: 파일 키 대신 짧은 TTL 읽기 URL(영구 public URL 금지, ARCHITECTURE §4) */
async function withReadUrls(storage: MediaStorage, spaceId: string, moment: MomentRow) {
  const sign = (assetId: string) =>
    storage.presignGet(mediaKeys.final(spaceId, assetId), MEDIA_POLICY.readUrlTtlSec);
  const media = await Promise.all(
    moment.media.map(async ({ asset, thumbnail }) => ({
      assetId: asset.id,
      kind: asset.kind,
      contentType: asset.contentType,
      url: await sign(asset.id),
      thumbnailUrl: thumbnail?.status === "confirmed" ? await sign(thumbnail.id) : null,
    })),
  );
  return { ...moment, media };
}

type CreateInput = {
  subject: SubjectInput;
  body?: string;
  takenAt?: Date;
  media: z.infer<typeof mediaItems>;
};

/** 사진, 영상 기록과 일기가 함께 쓰는 생성 경로(대상 확인 → 첨부 검증 G-02 → 저장) */
async function createMoment(ctx: SpaceCtx, kind: MomentKind, input: CreateInput) {
  const spaceId = ctx.member.spaceId;
  const when = input.takenAt ?? new Date();
  if (!isNotFuture(when)) throw inputError("DATE_IN_FUTURE");
  const subject = await resolveSubject(ctx.prisma, spaceId, input.subject);
  await checkMedia(ctx.prisma, spaceId, input.media);

  const moment = await withAttachConflict(() =>
    ctx.prisma.moment.create({
      data: {
        spaceId,
        ...subject,
        kind,
        body: input.body,
        takenAt: when,
        createdById: ctx.userId,
        media: {
          create: input.media.map((m, position) => ({
            position,
            assetId: m.assetId,
            thumbnailAssetId: m.thumbnailAssetId,
          })),
        },
      },
      select: momentSelect,
    }),
  );
  notify(ctx.push, { type: "moment", spaceId, actorId: ctx.userId, momentId: moment.id });
  return withReadUrls(ctx.storage, spaceId, moment);
}

export const momentRouter = router({
  /**
   * 사진, 영상 기록. 대상(아이, 반려동물, 가족 전체)에 따라 기록 권한이 다르다.
   * 첨부는 자기 Space의 confirmed 자산 ID만 받는다(G-01~04는 업로드 단계에서 이미 통과).
   */
  create: spaceProcedure
    .input(
      z.object({
        subject: subjectInput,
        body: body.optional(),
        takenAt: takenAt.optional(),
        media: mediaItems,
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!canRecordFor(ctx.member.role, input.subject.type)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (input.media.length === 0) throw inputError("MEDIA_REQUIRED");
      return createMoment(ctx, "media", input);
    }),

  /**
   * 부모 일기(PRD §4.2): 짧은 글이 필수, 사진, 영상은 선택으로 묶는다. parent만 쓴다.
   * 파일이 없을 수 있으므로 글 쓰기 리밋을 건다(G-07).
   */
  createDiary: parentProcedure
    .input(
      z.object({
        subject: subjectInput,
        body,
        takenAt: takenAt.optional(),
        media: mediaItems.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ok = await hitRateLimit(
        ctx.prisma,
        `record-write:${ctx.userId}`,
        RATE_LIMITS.recordWritePerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");
      return createMoment(ctx, "diary", input);
    }),

  /**
   * 글, 날짜 수정: 작성자만(다른 사람의 글을 대신 고치지 않는다). 일기는 글을 비울 수 없다.
   */
  update: spaceProcedure
    .input(
      z.object({
        momentId: entityId,
        body: body.nullable().optional(),
        takenAt: takenAt.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const moment = await ctx.prisma.moment.findFirst({
        where: { id: input.momentId, spaceId },
        select: { id: true, kind: true, createdById: true },
      });
      if (!moment) throw notFound("ITEM_NOT_FOUND");
      if (moment.createdById !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (moment.kind === "diary" && input.body === null) throw inputError("BODY_REQUIRED");
      if (input.takenAt && !isNotFuture(input.takenAt)) throw inputError("DATE_IN_FUTURE");
      const updated = await ctx.prisma.moment.update({
        where: { id: moment.id },
        data: { body: input.body, takenAt: input.takenAt },
        select: momentSelect,
      });
      return withReadUrls(ctx.storage, spaceId, updated);
    }),

  /** 피드: 촬영일 최신순, 대상 필터(아이, 반려동물, 가족 전체만). 커서는 (takenAt, id) */
  list: spaceProcedure
    .input(
      z.object({
        subject: subjectInput.optional(),
        cursor: z.object({ takenAt: z.date(), id: entityId }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const where: Prisma.MomentWhereInput = { spaceId };
      if (input.subject)
        Object.assign(where, await resolveSubject(ctx.prisma, spaceId, input.subject));
      if (input.cursor) {
        where.OR = [
          { takenAt: { lt: input.cursor.takenAt } },
          { takenAt: input.cursor.takenAt, id: { lt: input.cursor.id } },
        ];
      }
      const rows = await ctx.prisma.moment.findMany({
        where,
        orderBy: [{ takenAt: "desc" }, { id: "desc" }],
        take: MOMENT_POLICY.pageSize + 1,
        select: momentSelect,
      });
      const page = rows.slice(0, MOMENT_POLICY.pageSize);
      const last = page.at(-1);
      const reactions = await reactionSummaries(
        ctx.prisma,
        ctx.userId,
        "momentId",
        page.map((m) => m.id),
      );
      return {
        items: await Promise.all(
          page.map(async (m) => ({
            ...(await withReadUrls(ctx.storage, spaceId, m)),
            reactions: reactions.get(m.id)!,
          })),
        ),
        nextCursor:
          rows.length > MOMENT_POLICY.pageSize && last
            ? { takenAt: last.takenAt, id: last.id }
            : null,
      };
    }),

  /**
   * 기록 삭제(작성자 또는 parent). 붙은 파일을 R2에서 먼저 지우고(G-05) 기록을 지운다.
   * 중간에 실패하면 기록이 남아 다시 시도할 수 있다(이미 지운 파일은 건너뜀).
   */
  delete: spaceProcedure
    .input(z.object({ momentId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const moment = await ctx.prisma.moment.findFirst({
        where: { id: input.momentId, spaceId },
        select: {
          id: true,
          createdById: true,
          media: {
            select: {
              asset: { select: { id: true, bytes: true, status: true } },
              thumbnail: { select: { id: true, bytes: true, status: true } },
            },
          },
        },
      });
      if (!moment) throw notFound("ITEM_NOT_FOUND");
      if (moment.createdById !== ctx.userId && ctx.member.role !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const assets = moment.media.flatMap((m) =>
        m.thumbnail ? [m.asset, m.thumbnail] : [m.asset],
      );
      for (const asset of assets) {
        await removeAsset(ctx.prisma, ctx.storage, spaceId, asset);
      }
      await ctx.prisma.moment.deleteMany({ where: { id: moment.id } });
      return { ok: true };
    }),
});
