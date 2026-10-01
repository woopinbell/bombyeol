import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  MEDIA_CONTENT_TYPES,
  MEDIA_POLICY,
  RATE_LIMITS,
  TIER_LIMITS,
  tierOf,
  type MediaKindName,
} from "@/lib/plan";
import { limitError, mediaError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { hitRateLimit } from "@/server/rate-limit";
import { removeAsset, unattachedAssetWhere } from "@/server/media/assets";
import { fitsStorage, openPendingWhere, periodKey, spaceUsage } from "@/server/media/usage";
import { mediaKeys } from "@/server/storage/types";
import { spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";

const allContentTypes = [...MEDIA_CONTENT_TYPES.image, ...MEDIA_CONTENT_TYPES.video] as const;

export const mediaRouter = router({
  /**
   * 업로드 요청: 형식·크기(G-01), Space 총량(G-03), 발급 횟수·미확정 수(G-04)를 검사하고
   * Content-Length·Content-Type을 서명한 업로드 URL을 발급한다.
   */
  /** Space 저장 사용량과 한도(화면의 "저장 공간" 표시용) */
  usage: spaceProcedure.query(({ ctx }) => spaceUsage(ctx.prisma, ctx.member.spaceId)),

  requestUpload: spaceProcedure
    .input(
      z.object({
        kind: z.enum(["image", "video"]),
        contentType: z.enum(allContentTypes),
        bytes: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const kind: MediaKindName = input.kind;
      if (!(MEDIA_CONTENT_TYPES[kind] as readonly string[]).includes(input.contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "UNSUPPORTED_TYPE" });
      }
      const limits = TIER_LIMITS[tierOf()];
      if (input.bytes > limits.maxUploadBytes[kind]) throw limitError("FILE_TOO_LARGE");

      const [userOk, spaceOk] = await Promise.all([
        hitRateLimit(ctx.prisma, `upload-user:${ctx.userId}`, RATE_LIMITS.uploadIssuePerUser),
        hitRateLimit(ctx.prisma, `upload-space:${spaceId}`, RATE_LIMITS.uploadIssuePerSpace),
      ]);
      if (!userOk || !spaceOk) throw limitError("RATE_LIMITED");

      const now = new Date();
      const asset = await ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-media:${spaceId}`);
        const usage = await spaceUsage(tx, spaceId, now);
        if (usage.pendingCount >= MEDIA_POLICY.pendingPerSpace) throw limitError("PENDING_LIMIT");
        if (!fitsStorage(usage, input.bytes)) throw limitError("STORAGE_LIMIT");
        const created = await tx.mediaAsset.create({
          data: {
            spaceId,
            uploadedById: ctx.userId,
            kind,
            contentType: input.contentType,
            bytes: input.bytes,
          },
          select: { id: true },
        });
        await tx.usageCounter.upsert({
          where: { spaceId_periodKey: { spaceId, periodKey: periodKey(now) } },
          create: { spaceId, periodKey: periodKey(now), uploadUrlsIssued: 1 },
          update: { uploadUrlsIssued: { increment: 1 } },
        });
        return created;
      });

      const uploadUrl = await ctx.storage.presignPut(mediaKeys.pending(spaceId, asset.id), {
        bytes: input.bytes,
        contentType: input.contentType,
        expiresSec: MEDIA_POLICY.uploadUrlTtlSec,
      });
      return {
        assetId: asset.id,
        uploadUrl,
        /** 클라이언트는 이 헤더 그대로 PUT해야 한다(Content-Length는 브라우저가 본문으로 설정) */
        headers: { "content-type": input.contentType },
        expiresAt: new Date(now.getTime() + MEDIA_POLICY.uploadUrlTtlSec * 1000),
      };
    }),

  /**
   * 업로드 확인(G-02): 올린 사람이 자기 Space의 미확정 자산만 확정할 수 있다.
   * 저장소의 실제 크기·타입이 발급 때 선언과 같아야 하고, 다르면 객체를 지우고 거부한다.
   * 통과하면 서버 측 복사로 spaces/ 키에 옮기고 pending 객체를 지운다.
   */
  confirm: spaceProcedure
    .input(z.object({ assetId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const now = new Date();
      const asset = await ctx.prisma.mediaAsset.findFirst({
        where: { ...openPendingWhere(spaceId, now), id: input.assetId, uploadedById: ctx.userId },
        select: { id: true, bytes: true, contentType: true },
      });
      if (!asset) throw mediaError("ASSET_INVALID");

      const pendingKey = mediaKeys.pending(spaceId, asset.id);
      const head = await ctx.storage.head(pendingKey);
      if (!head) throw mediaError("UPLOAD_NOT_FOUND");
      if (head.bytes !== asset.bytes || head.contentType !== asset.contentType) {
        await ctx.storage.delete(pendingKey);
        await ctx.prisma.mediaAsset.updateMany({
          where: { id: asset.id, status: "pending" },
          data: { status: "deleted", deletedAt: now },
        });
        throw mediaError("UPLOAD_MISMATCH");
      }

      await ctx.storage.copy(pendingKey, mediaKeys.final(spaceId, asset.id));
      const { count } = await ctx.prisma.mediaAsset.updateMany({
        where: { id: asset.id, status: "pending" },
        data: { status: "confirmed", confirmedAt: now },
      });
      await ctx.storage.delete(pendingKey);
      // 동시에 두 번 확인된 경우: 한쪽만 상태를 바꾸고 사용량도 한 번만 센다.
      if (count === 1) {
        await ctx.prisma.usageCounter.upsert({
          where: { spaceId_periodKey: { spaceId, periodKey: periodKey(now) } },
          create: { spaceId, periodKey: periodKey(now), bytesConfirmed: asset.bytes },
          update: { bytesConfirmed: { increment: asset.bytes } },
        });
      }
      return { assetId: asset.id, status: "confirmed" as const };
    }),

  /**
   * 자산 삭제(G-05): 올린 사람 또는 parent만. 순서 보장은 removeAsset.
   */
  delete: spaceProcedure
    .input(z.object({ assetId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const asset = await ctx.prisma.mediaAsset.findFirst({
        where: { id: input.assetId, spaceId, status: { in: ["pending", "confirmed"] } },
        select: { id: true, bytes: true, status: true, uploadedById: true },
      });
      if (!asset) throw mediaError("ASSET_INVALID");
      if (asset.uploadedById !== ctx.userId && ctx.member.role !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // 기록에 붙은 자산은 그 기록을 지울 때 함께 지운다(기록에 깨진 파일이 남지 않게).
      const attached = await ctx.prisma.mediaAsset.count({
        where: { id: asset.id, NOT: unattachedAssetWhere },
      });
      if (attached) throw mediaError("ASSET_IN_USE");

      await removeAsset(ctx.prisma, ctx.storage, spaceId, asset);
      return { ok: true };
    }),
});
