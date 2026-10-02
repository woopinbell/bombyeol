import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { MEDIA_POLICY, TIER_LIMITS, tierOf } from "@/lib/plan";
import { inputError, limitError, notFound } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { removeAsset, requireAttachableAssets, withAttachConflict } from "@/server/media/assets";
import { momentAssetIds } from "@/server/media/attached";
import { markPurging } from "@/server/media/purge";
import { mediaKeys } from "@/server/storage/types";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture, isoDate, personName } from "./inputs";

const shortLabel = z.string().trim().min(1).max(30);

const petFields = {
  name: personName,
  species: z.enum(["dog", "cat", "other"]),
  /** other일 때 자유 입력(토끼, 햄스터 등) */
  speciesLabel: shortLabel.nullable().optional(),
  breed: shortLabel.nullable().optional(),
  /** 모르면 추정일 + birthDateEstimated */
  birthDate: isoDate.nullable().optional(),
  birthDateEstimated: z.boolean().optional(),
  /** 우리 가족이 된 날 */
  adoptedAt: isoDate.nullable().optional(),
  /** 커버 사진: 자기 Space의 confirmed 이미지 자산(G-02) */
  coverAssetId: entityId.nullable().optional(),
};

function checkDates(input: { birthDate?: Date | null; adoptedAt?: Date | null }) {
  for (const date of [input.birthDate, input.adoptedAt]) {
    if (date && !isNotFuture(date)) throw inputError("DATE_IN_FUTURE");
  }
}

const petSelect = {
  id: true,
  name: true,
  species: true,
  speciesLabel: true,
  breed: true,
  birthDate: true,
  birthDateEstimated: true,
  adoptedAt: true,
  passedAt: true,
  status: true,
  coverAssetId: true,
} satisfies Prisma.PetSelect;

export const petRouter = router({
  /** 반려동물 등록(parent). Space당 수 상한(G-11) */
  create: parentProcedure.input(z.object(petFields)).mutation(async ({ ctx, input }) => {
    checkDates(input);
    const spaceId = ctx.member.spaceId;
    if (input.coverAssetId) {
      await requireAttachableAssets(ctx.prisma, spaceId, [input.coverAssetId], ["image"]);
    }
    return withAttachConflict(() =>
      ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-pets:${spaceId}`);
        const count = await tx.pet.count({ where: { spaceId } });
        if (count >= TIER_LIMITS[tierOf()].pets) throw limitError("PET_LIMIT");
        return tx.pet.create({
          data: { ...input, spaceId, createdById: ctx.userId },
          select: petSelect,
        });
      }),
    );
  }),

  /** 프로필 수정(parent). 커버를 바꾸거나 지우면 이전 커버 파일도 지운다(G-05) */
  update: parentProcedure
    .input(z.object({ petId: entityId, ...z.object(petFields).partial().shape }))
    .mutation(async ({ ctx, input }) => {
      checkDates(input);
      const spaceId = ctx.member.spaceId;
      const { petId, ...data } = input;
      const current = await ctx.prisma.pet.findFirst({
        where: { id: petId, spaceId },
        select: { id: true, cover: { select: { id: true, bytes: true, status: true } } },
      });
      if (!current) throw notFound("SUBJECT_NOT_FOUND");
      const coverChanged =
        data.coverAssetId !== undefined && data.coverAssetId !== (current.cover?.id ?? null);
      if (coverChanged && data.coverAssetId) {
        await requireAttachableAssets(ctx.prisma, spaceId, [data.coverAssetId], ["image"]);
      }
      const pet = await withAttachConflict(() =>
        ctx.prisma.pet.update({ where: { id: current.id }, data, select: petSelect }),
      );
      if (coverChanged && current.cover) {
        await removeAsset(ctx.prisma, ctx.storage, spaceId, current.cover);
      }
      return pet;
    }),

  /**
   * 반려동물 삭제(parent, 되돌릴 수 없음). 이름을 다시 입력해야 한다. 그 반려동물의 사진, 일기,
   * 마일스톤, 기념 정보와 커버를 함께 지운다(파일은 purging → 정리 Cron, G-05).
   * 반려동물에 붙인 이야기는 가족의 기억이라 남긴다(petId만 비워짐). 별이 된 반려동물은 기념 상태로 두는 것을 권한다(화면).
   */
  delete: parentProcedure
    .input(z.object({ petId: entityId, confirmName: personName }))
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const pet = await ctx.prisma.pet.findFirst({
        where: { id: input.petId, spaceId },
        select: { id: true, name: true, coverAssetId: true },
      });
      if (!pet) throw notFound("SUBJECT_NOT_FOUND");
      if (input.confirmName !== pet.name) throw inputError("CONFIRM_MISMATCH");
      return ctx.prisma.$transaction(async (tx) => {
        const moments = await momentAssetIds(tx, { petId: pet.id });
        const assetIds = pet.coverAssetId ? [...moments, pet.coverAssetId] : moments;
        const purging = await markPurging(tx, spaceId, assetIds);
        await tx.pet.deleteMany({ where: { id: pet.id, spaceId } });
        return { ok: true, purgingFiles: purging };
      });
    }),

  /** 반려동물 목록(모든 멤버). 커버는 짧은 TTL 읽기 URL로 준다 */
  list: spaceProcedure.query(async ({ ctx }) => {
    const pets = await ctx.prisma.pet.findMany({
      where: { spaceId: ctx.member.spaceId },
      orderBy: { createdAt: "asc" },
      select: petSelect,
    });
    return Promise.all(
      pets.map(async (pet) => ({
        ...pet,
        coverUrl: pet.coverAssetId
          ? await ctx.storage.presignGet(
              mediaKeys.final(ctx.member.spaceId, pet.coverAssetId),
              MEDIA_POLICY.readUrlTtlSec,
            )
          : null,
      })),
    );
  }),
});
