import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type {
  MemberRole,
  Prisma,
  PregnancyRecordKind,
  PrismaClient,
} from "@/generated/prisma/client";
import { MEDIA_POLICY, PREGNANCY_POLICY, RATE_LIMITS } from "@/lib/plan";
import { gestationalAge } from "@/lib/pregnancy";
import { requireConsent } from "@/server/consents";
import { inputError, limitError, notFound } from "@/server/errors";
import { removeAsset, requireAttachableAssets, withAttachConflict } from "@/server/media/assets";
import { hitRateLimit } from "@/server/rate-limit";
import { mediaKeys, type MediaStorage } from "@/server/storage/types";
import type { Context } from "@/server/trpc/context";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId, isNotFuture, isoDate } from "./inputs";

const DAY_MS = 24 * 60 * 60 * 1000;

const kindInput = z.enum(["ultrasound", "checkup", "kick", "note"]);
const visibilityInput = z.enum(["parents_only", "family"]);
const note = z.string().trim().min(1).max(PREGNANCY_POLICY.noteMaxChars);

/**
 * visibility 서버 강제(PRIVACY §3): parent가 아니면 가족 공개 기록만 보인다.
 * 임신 기록을 읽는 모든 쿼리는 이 조건을 거친다(클라이언트 필터 금지).
 */
export function visibleRecordWhere(role: MemberRole): Prisma.PregnancyRecordWhereInput {
  return role === "parent" ? {} : { visibility: "family" };
}

const recordSelect = {
  id: true,
  childId: true,
  kind: true,
  date: true,
  note: true,
  visibility: true,
  photo: { select: { id: true, status: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.PregnancyRecordSelect;

type RecordRow = Prisma.PregnancyRecordGetPayload<{ select: typeof recordSelect }>;

type SpaceCtx = Context & {
  userId: string;
  member: { id: string; role: MemberRole; spaceId: string };
};

/** 응답: 주차는 아이의 현재 예정일로 계산, 사진은 짧은 TTL 읽기 URL(삭제 도중 실패한 사진은 숨김) */
async function toRecord(
  storage: MediaStorage,
  spaceId: string,
  dueDate: Date | null,
  row: RecordRow,
) {
  const { photo, ...rest } = row;
  const shown = photo?.status === "confirmed" ? photo : null;
  return {
    ...rest,
    gestationalAge: gestationalAge(dueDate, row.date),
    photo: shown && {
      assetId: shown.id,
      url: await storage.presignGet(mediaKeys.final(spaceId, shown.id), MEDIA_POLICY.readUrlTtlSec),
    },
  };
}

async function findChild(prisma: PrismaClient, spaceId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, spaceId },
    select: { id: true, status: true, dueDate: true, birthDate: true },
  });
  if (!child) throw notFound("SUBJECT_NOT_FOUND");
  return child;
}

type Child = Awaited<ReturnType<typeof findChild>>;

/**
 * 날짜 규칙: 검진은 앞으로의 일정도 받는다(예정일 — 없으면 오늘 — 뒤 checkupMaxDaysAhead일까지).
 * 나머지는 미래 불가. 태어난 아이에게는 생일 이전 날짜로만 남긴다(출생 후 소급 정리).
 */
function checkDate(child: Child, kind: PregnancyRecordKind, date: Date) {
  if (kind === "checkup") {
    const base = Math.max(child.dueDate?.getTime() ?? 0, Date.now());
    if (date.getTime() > base + PREGNANCY_POLICY.checkupMaxDaysAhead * DAY_MS) {
      throw inputError("DATE_IN_FUTURE");
    }
  } else if (!isNotFuture(date)) {
    throw inputError("DATE_IN_FUTURE");
  }
  if (child.status === "born" && child.birthDate && date.getTime() >= child.birthDate.getTime()) {
    throw inputError("CHILD_ALREADY_BORN");
  }
}

/** 초음파 사진: 자기 Space의 confirmed 이미지이고 아직 다른 곳에 붙지 않은 자산(G-02) */
async function checkPhoto(ctx: SpaceCtx, assetId: string) {
  await requireAttachableAssets(ctx.prisma, ctx.member.spaceId, [assetId], ["image"]);
}

/** 보이는 기록만 찾는다 — 숨은 기록은 없는 것처럼 NOT_FOUND */
async function findVisible(ctx: SpaceCtx, recordId: string) {
  const found = await ctx.prisma.pregnancyRecord.findFirst({
    where: { id: recordId, spaceId: ctx.member.spaceId, ...visibleRecordWhere(ctx.member.role) },
    select: {
      ...recordSelect,
      createdById: true,
      photo: { select: { id: true, bytes: true, status: true } },
      child: { select: { id: true, status: true, dueDate: true, birthDate: true } },
    },
  });
  if (!found) throw notFound("ITEM_NOT_FOUND");
  const { createdById, child, photo, ...rest } = found;
  return {
    row: { ...rest, photo: photo && { id: photo.id, status: photo.status } },
    createdById,
    child,
    photo,
  };
}

/**
 * 임신 동의 철회 시 내가 쓴 기록 처리(PRIVACY §3): 지우기를 고르면 사진을 R2에서 먼저 지우고(G-05) 기록을 지운다.
 * 남기기를 고르면 가족 공개를 거둬 parents_only로 되돌린다(동의를 거뒀으니 공개도 거둔다).
 */
export async function retractPregnancyRecords(
  prisma: PrismaClient,
  storage: MediaStorage,
  spaceId: string,
  userId: string,
  deleteRecords: boolean,
) {
  const mine = { spaceId, createdById: userId };
  if (!deleteRecords) {
    await prisma.pregnancyRecord.updateMany({
      where: { ...mine, visibility: "family" },
      data: { visibility: "parents_only" },
    });
    return;
  }
  const records = await prisma.pregnancyRecord.findMany({
    where: mine,
    select: { id: true, photo: { select: { id: true, bytes: true, status: true } } },
  });
  for (const record of records) {
    if (record.photo) await removeAsset(prisma, storage, spaceId, record.photo);
    await prisma.pregnancyRecord.deleteMany({ where: { id: record.id } });
  }
}

/**
 * 임신 기록(태명 시절, PRD §4.2) — 건강 정보(PRIVACY §3).
 * 쓰기는 임신 정보에 동의한 parent. 기본은 parents_only, 가족 공개는 쓴 사람이 항목마다 고른다.
 * 반응(좋아요·댓글)은 붙이지 않는다(노출면 최소화). 알림 문구 규칙은 Phase 6.
 */
export const pregnancyRouter = router({
  /** 기록 남기기(parent, 임신 동의 필요). 초음파는 사진 한 장 필수, 메모는 글 필수. 글 기록 리밋(G-07) */
  create: parentProcedure
    .input(
      z.object({
        childId: entityId,
        kind: kindInput,
        date: isoDate,
        note: note.optional(),
        photoAssetId: entityId.optional(),
        visibility: visibilityInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      await requireConsent(ctx.prisma, ctx.userId, "pregnancy", spaceId);
      const child = await findChild(ctx.prisma, spaceId, input.childId);
      checkDate(child, input.kind, input.date);
      if (input.kind === "ultrasound") {
        if (!input.photoAssetId) throw inputError("MEDIA_REQUIRED");
        await checkPhoto(ctx, input.photoAssetId);
      } else if (input.photoAssetId) {
        throw inputError("PHOTO_NOT_ALLOWED");
      }
      if (input.kind === "note" && !input.note) throw inputError("BODY_REQUIRED");
      const ok = await hitRateLimit(
        ctx.prisma,
        `record-write:${ctx.userId}`,
        RATE_LIMITS.recordWritePerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");

      const row = await withAttachConflict(() =>
        ctx.prisma.pregnancyRecord.create({
          data: {
            spaceId,
            childId: child.id,
            kind: input.kind,
            date: input.date,
            note: input.note,
            photoAssetId: input.photoAssetId,
            visibility: input.visibility,
            createdById: ctx.userId,
          },
          select: recordSelect,
        }),
      );
      return toRecord(ctx.storage, spaceId, child.dueDate, row);
    }),

  /**
   * 고치기: 내용·공개 범위는 쓴 사람만(임신 동의 필요 — 가족 공개는 쓴 사람의 결정).
   * 다른 parent는 parents_only로 좁히기만 할 수 있다(안전 방향, 동의 불필요).
   * 초음파 사진을 바꾸면 이전 파일을 지운다(G-05).
   */
  update: parentProcedure
    .input(
      z.object({
        recordId: entityId,
        date: isoDate.optional(),
        note: note.nullable().optional(),
        photoAssetId: entityId.optional(),
        visibility: visibilityInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const record = await findVisible(ctx, input.recordId);
      const narrowingOnly =
        input.visibility === "parents_only" &&
        input.date === undefined &&
        input.note === undefined &&
        input.photoAssetId === undefined;
      if (record.createdById !== ctx.userId && !narrowingOnly) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!narrowingOnly) await requireConsent(ctx.prisma, ctx.userId, "pregnancy", spaceId);
      const kind = record.row.kind;
      if (input.date) checkDate(record.child, kind, input.date);
      if (kind === "note" && input.note === null) throw inputError("BODY_REQUIRED");
      const photoChanged =
        input.photoAssetId !== undefined && input.photoAssetId !== record.photo?.id;
      if (photoChanged) {
        if (kind !== "ultrasound") throw inputError("PHOTO_NOT_ALLOWED");
        await checkPhoto(ctx, input.photoAssetId!);
      }

      const row = await withAttachConflict(() =>
        ctx.prisma.pregnancyRecord.update({
          where: { id: record.row.id },
          data: {
            date: input.date,
            note: input.note,
            visibility: input.visibility,
            photoAssetId: photoChanged ? input.photoAssetId : undefined,
          },
          select: recordSelect,
        }),
      );
      if (photoChanged && record.photo) {
        await removeAsset(ctx.prisma, ctx.storage, spaceId, record.photo);
      }
      return toRecord(ctx.storage, spaceId, record.child.dueDate, row);
    }),

  /**
   * 지우기(parent — 쓴 사람이든 아니든). 사진을 R2에서 먼저 지우고(G-05) 기록을 지운다.
   * 중간에 실패하면 기록이 남아 다시 시도할 수 있다.
   */
  delete: parentProcedure
    .input(z.object({ recordId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const record = await findVisible(ctx, input.recordId);
      if (record.photo) {
        await removeAsset(ctx.prisma, ctx.storage, ctx.member.spaceId, record.photo);
      }
      await ctx.prisma.pregnancyRecord.deleteMany({ where: { id: record.row.id } });
      return { ok: true };
    }),

  /**
   * 아이 하나의 임신 기록(날짜 최신순). parent는 전부, 그 외 멤버는 가족 공개 기록만.
   * 숨은 기록의 수는 어디에도 드러내지 않는다. 커서는 (date, id)
   */
  list: spaceProcedure
    .input(
      z.object({
        childId: entityId,
        cursor: z.object({ date: z.date(), id: entityId }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      const child = await findChild(ctx.prisma, spaceId, input.childId);
      const where: Prisma.PregnancyRecordWhereInput = {
        spaceId,
        childId: child.id,
        ...visibleRecordWhere(ctx.member.role),
      };
      if (input.cursor) {
        where.OR = [
          { date: { lt: input.cursor.date } },
          { date: input.cursor.date, id: { lt: input.cursor.id } },
        ];
      }
      const rows = await ctx.prisma.pregnancyRecord.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: PREGNANCY_POLICY.pageSize + 1,
        select: recordSelect,
      });
      const page = rows.slice(0, PREGNANCY_POLICY.pageSize);
      const last = page.at(-1);
      return {
        items: await Promise.all(
          page.map((row) => toRecord(ctx.storage, spaceId, child.dueDate, row)),
        ),
        nextCursor:
          rows.length > PREGNANCY_POLICY.pageSize && last ? { date: last.date, id: last.id } : null,
      };
    }),

  /** 기록 하나(보이는 것만) */
  get: spaceProcedure.input(z.object({ recordId: entityId })).query(async ({ ctx, input }) => {
    const { row, child } = await findVisible(ctx, input.recordId);
    return toRecord(ctx.storage, ctx.member.spaceId, child.dueDate, row);
  }),

  /**
   * 오늘의 주차와 출생 예정일까지 남은 날(모든 멤버 — 예정일은 아이 프로필에 이미 보인다).
   * today는 클라이언트 현지 날짜(YYYY-MM-DD), 없으면 UTC 오늘.
   */
  progress: spaceProcedure
    .input(z.object({ childId: entityId, today: isoDate.optional() }))
    .query(async ({ ctx, input }) => {
      const child = await findChild(ctx.prisma, ctx.member.spaceId, input.childId);
      const now = new Date();
      const today =
        input.today ??
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      if (child.status !== "expecting" || !child.dueDate) {
        return {
          status: child.status,
          dueDate: child.dueDate,
          gestationalAge: null,
          daysUntilDue: null,
        };
      }
      return {
        status: child.status,
        dueDate: child.dueDate,
        gestationalAge: gestationalAge(child.dueDate, today),
        daysUntilDue: Math.round((child.dueDate.getTime() - today.getTime()) / DAY_MS),
      };
    }),
});
