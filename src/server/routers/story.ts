import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { MEDIA_POLICY, RATE_LIMITS, STORY_POLICY } from "@/lib/plan";
import {
  STORY_CATEGORIES,
  STORY_PROMPTS,
  isStoryPromptKey,
  type StoryPromptKey,
} from "@/lib/story-prompts";
import { inputError, limitError, notFound } from "@/server/errors";
import { notify } from "@/server/push/events";
import { lockKey } from "@/server/locks";
import { removeAsset, requireAttachableAssets, withAttachConflict } from "@/server/media/assets";
import { hitRateLimit } from "@/server/rate-limit";
import { storyReactionSummaries } from "@/server/reactions";
import { mediaKeys } from "@/server/storage/types";
import type { Context } from "@/server/trpc/context";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

const categoryInput = z.enum(STORY_CATEGORIES);
const body = z.string().trim().min(1).max(STORY_POLICY.bodyMaxChars);
const title = z.string().trim().min(1).max(STORY_POLICY.titleMaxChars);
const storyYear = z
  .number()
  .int()
  .min(STORY_POLICY.minYear)
  .refine((y) => y <= new Date().getUTCFullYear(), { message: "DATE_IN_FUTURE" });

const question = z.string().trim().min(1).max(STORY_POLICY.questionMaxChars);

const askSelect = {
  id: true,
  promptKey: true,
  question: true,
  entryId: true,
  createdAt: true,
  askedBy: { select: { id: true, name: true } },
  toMember: { select: { id: true, relationLabel: true, user: { select: { name: true } } } },
} satisfies Prisma.StoryAskSelect;

function toAsk(row: Prisma.StoryAskGetPayload<{ select: typeof askSelect }>) {
  const { toMember, ...rest } = row;
  return {
    ...rest,
    to: { memberId: toMember.id, label: toMember.relationLabel, name: toMember.user.name },
  };
}

const storySelect = {
  id: true,
  title: true,
  body: true,
  promptKey: true,
  category: true,
  storyYear: true,
  petId: true,
  photo: { select: { id: true, status: true } },
  ask: { select: { id: true, promptKey: true, question: true } },
  narratorMemberId: true,
  narrator: { select: { memorial: { select: { id: true } } } },
  narratorName: true,
  narratorLabel: true,
  scribeMemberId: true,
  scribeName: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.StoryEntrySelect;

type StoryRow = Prisma.StoryEntryGetPayload<{ select: typeof storySelect }>;

type SpaceCtx = Context & {
  userId: string;
  member: { id: string; role: string; spaceId: string };
};

/**
 * 응답 모양: 화자, 대필자는 작성 시점 스냅샷(멤버가 사라져도 표시된다, PRIVACY §5).
 * 사진은 파일 키 대신 짧은 TTL 읽기 URL(ARCHITECTURE §4). 삭제 도중 실패한 사진은 숨긴다.
 */
async function toStory(ctx: SpaceCtx, row: StoryRow) {
  const {
    narratorMemberId,
    narrator,
    narratorName,
    narratorLabel,
    scribeMemberId,
    scribeName,
    photo,
    ...rest
  } = row;
  const shown = photo?.status === "confirmed" ? photo : null;
  return {
    ...rest,
    narrator: {
      memberId: narratorMemberId,
      name: narratorName,
      label: narratorLabel,
      memorial: Boolean(narrator?.memorial),
    },
    scribe: scribeMemberId || scribeName ? { memberId: scribeMemberId, name: scribeName } : null,
    photo: shown && {
      assetId: shown.id,
      url: await ctx.storage.presignGet(
        mediaKeys.final(ctx.member.spaceId, shown.id),
        MEDIA_POLICY.readUrlTtlSec,
      ),
    },
  };
}

/** 목록, 상세용: 응답 모양 + 별 하나, 댓글 요약 */
async function withReactions(ctx: SpaceCtx, rows: StoryRow[]) {
  const reactions = await storyReactionSummaries(
    ctx.prisma,
    ctx.userId,
    rows.map((r) => r.id),
  );
  return Promise.all(
    rows.map(async (row) => ({ ...(await toStory(ctx, row)), reactions: reactions.get(row.id)! })),
  );
}

/** 사진에 얽힌 이야기: 자기 Space의 confirmed 이미지이고 아직 다른 곳에 붙지 않은 자산(G-02) */
async function checkPhoto(ctx: SpaceCtx, assetId: string | null | undefined) {
  if (assetId) await requireAttachableAssets(ctx.prisma, ctx.member.spaceId, [assetId], ["image"]);
}

/**
 * 누가 누구의 이야기를 쓸 수 있나(PRD §4.3):
 * 자기 이야기는 parent, grandparent, 대필은 parent, grandparent가 어르신(grandparent)의 이야기를.
 * relative는 열람, 반응만.
 */
async function resolveNarrator(ctx: SpaceCtx, narratorMemberId: string | undefined) {
  if (ctx.member.role === "relative") throw new TRPCError({ code: "FORBIDDEN" });
  const narrator = await ctx.prisma.member.findFirst({
    where: { id: narratorMemberId ?? ctx.member.id, spaceId: ctx.member.spaceId },
    select: {
      id: true,
      role: true,
      relationLabel: true,
      user: { select: { name: true } },
      memorial: { select: { id: true } },
    },
  });
  if (!narrator) throw notFound("SUBJECT_NOT_FOUND");
  // 별이 되신 분의 이야기에는 새 이야기를 더하지 않는다(PRD §4.5)
  if (narrator.memorial) throw inputError("MEMORIAL_READ_ONLY");
  const scribing = narrator.id !== ctx.member.id;
  if (scribing && narrator.role !== "grandparent") throw inputError("NARRATOR_INVALID");
  return { narrator, scribing };
}

async function resolvePet(ctx: SpaceCtx, petId: string | null | undefined) {
  if (!petId) return petId;
  const pet = await ctx.prisma.pet.findFirst({
    where: { id: petId, spaceId: ctx.member.spaceId },
    select: { id: true },
  });
  if (!pet) throw notFound("SUBJECT_NOT_FOUND");
  return pet.id;
}

/** 답할 물어보기: 같은 Space이고 아직 답이 없어야 한다 */
async function findOpenAsk(ctx: SpaceCtx, askId: string) {
  const ask = await ctx.prisma.storyAsk.findFirst({
    where: { id: askId, spaceId: ctx.member.spaceId },
    select: { id: true, toMemberId: true, promptKey: true, entryId: true },
  });
  if (!ask) throw notFound("ITEM_NOT_FOUND");
  if (ask.entryId) throw inputError("ASK_ANSWERED");
  return ask;
}

/** 수정: 쓴 사람 또는 화자 본인. 삭제는 여기에 parent를 더한다. 기념 상태인 분의 이야기는 둘 다 막는다 */
async function findStory(ctx: SpaceCtx, storyId: string) {
  const story = await ctx.prisma.storyEntry.findFirst({
    where: { id: storyId, spaceId: ctx.member.spaceId },
    select: {
      id: true,
      createdById: true,
      narratorMemberId: true,
      narrator: { select: { memorial: { select: { id: true } } } },
      promptKey: true,
      photo: { select: { id: true, bytes: true, status: true } },
    },
  });
  if (!story) throw notFound("ITEM_NOT_FOUND");
  // 기념 상태인 분의 이야기는 영구 보존 - 고치거나 지우려면 parent가 기념을 먼저 되돌린다
  if (story.narrator?.memorial) throw inputError("MEMORIAL_READ_ONLY");
  const owner = story.createdById === ctx.userId || story.narratorMemberId === ctx.member.id;
  return { story, owner };
}

export const storyRouter = router({
  /**
   * 질문 카드 목록(모든 멤버). 문구는 클라이언트가 story.prompts.<key>로 찾는다.
   * narratorMemberId를 주면 그 어르신이 이미 답한 카드에 answered 표시를 한다.
   */
  prompts: spaceProcedure
    .input(z.object({ category: categoryInput.optional(), narratorMemberId: entityId.optional() }))
    .query(async ({ ctx, input }) => {
      const answered = new Set<string>();
      if (input.narratorMemberId) {
        const narrator = await ctx.prisma.member.findFirst({
          where: { id: input.narratorMemberId, spaceId: ctx.member.spaceId },
          select: { id: true },
        });
        if (!narrator) throw notFound("SUBJECT_NOT_FOUND");
        const rows = await ctx.prisma.storyEntry.findMany({
          where: { narratorMemberId: narrator.id, promptKey: { not: null } },
          select: { promptKey: true },
          distinct: ["promptKey"],
        });
        for (const row of rows) if (row.promptKey) answered.add(row.promptKey);
      }
      return (Object.entries(STORY_PROMPTS) as [StoryPromptKey, string][])
        .filter(([, category]) => !input.category || category === input.category)
        .map(([key, category]) => ({ key, category, answered: answered.has(key) }));
    }),

  /**
   * 이야기 쓰기. 질문 카드에 답하거나(promptKey → 카테고리는 카드를 따른다) 자유롭게 쓴다.
   * narratorMemberId가 내가 아니면 대필 - 작성자(화자), 대필자를 함께 기록한다. 글 쓰기 리밋(G-07).
   * askId를 주면 그 물어보기에 대한 답 - 화자는 질문받은 어르신, 카드는 물어보기를 따르고 물어보기가 닫힌다.
   */
  create: spaceProcedure
    .input(
      z.object({
        narratorMemberId: entityId.optional(),
        askId: entityId.optional(),
        promptKey: z.string().min(1).max(64).optional(),
        category: categoryInput.optional(),
        title: title.optional(),
        body,
        storyYear: storyYear.optional(),
        petId: entityId.optional(),
        /** 사진에 얽힌 이야기(옛날 사진 한 장) */
        photoAssetId: entityId.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ask = input.askId ? await findOpenAsk(ctx, input.askId) : null;
      const { narrator, scribing } = await resolveNarrator(
        ctx,
        input.narratorMemberId ?? ask?.toMemberId,
      );
      if (ask && narrator.id !== ask.toMemberId) throw inputError("NARRATOR_INVALID");
      const promptKey = ask ? ask.promptKey : (input.promptKey ?? null);
      if (promptKey && !isStoryPromptKey(promptKey)) throw inputError("PROMPT_INVALID");
      const petId = await resolvePet(ctx, input.petId);
      await checkPhoto(ctx, input.photoAssetId);
      const ok = await hitRateLimit(
        ctx.prisma,
        `story-write:${ctx.userId}`,
        RATE_LIMITS.storyWritePerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");

      const scribe = scribing
        ? await ctx.prisma.user.findUniqueOrThrow({
            where: { id: ctx.userId },
            select: { name: true },
          })
        : null;
      const row = await withAttachConflict(() =>
        ctx.prisma.$transaction(async (tx) => {
          const created = await tx.storyEntry.create({
            data: {
              spaceId: ctx.member.spaceId,
              narratorMemberId: narrator.id,
              narratorName: narrator.user.name,
              narratorLabel: narrator.relationLabel,
              scribeMemberId: scribing ? ctx.member.id : null,
              scribeName: scribe?.name ?? null,
              promptKey,
              category: promptKey
                ? STORY_PROMPTS[promptKey as StoryPromptKey]
                : (input.category ?? null),
              title: input.title,
              body: input.body,
              storyYear: input.storyYear,
              petId,
              photoAssetId: input.photoAssetId,
              createdById: ctx.userId,
            },
            select: { id: true },
          });
          if (ask) {
            // 같은 물어보기에 동시에 답하면 하나만 이긴다
            const { count } = await tx.storyAsk.updateMany({
              where: { id: ask.id, entryId: null },
              data: { entryId: created.id },
            });
            if (count === 0) throw inputError("ASK_ANSWERED");
          }
          return tx.storyEntry.findUniqueOrThrow({
            where: { id: created.id },
            select: storySelect,
          });
        }),
      );
      notify(ctx.push, {
        type: "story",
        spaceId: ctx.member.spaceId,
        actorId: ctx.userId,
        storyId: row.id,
      });
      return toStory(ctx, row);
    }),

  /** 고치기: 쓴 사람(대필자 포함) 또는 화자 본인. 카드에 답한 이야기의 카테고리는 카드를 따른다 */
  update: spaceProcedure
    .input(
      z.object({
        storyId: entityId,
        title: title.nullable().optional(),
        body: body.optional(),
        storyYear: storyYear.nullable().optional(),
        category: categoryInput.nullable().optional(),
        petId: entityId.nullable().optional(),
        /** 사진 바꾸기, 빼기 - 이전 사진 파일은 지운다(G-05) */
        photoAssetId: entityId.nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { story, owner } = await findStory(ctx, input.storyId);
      if (!owner) throw new TRPCError({ code: "FORBIDDEN" });
      if (story.promptKey && input.category !== undefined) throw inputError("PROMPT_INVALID");
      const photoChanged =
        input.photoAssetId !== undefined && input.photoAssetId !== (story.photo?.id ?? null);
      if (photoChanged) await checkPhoto(ctx, input.photoAssetId);
      const petId = await resolvePet(ctx, input.petId);
      const row = await withAttachConflict(() =>
        ctx.prisma.storyEntry.update({
          where: { id: story.id },
          data: {
            title: input.title,
            body: input.body,
            storyYear: input.storyYear,
            category: input.category,
            petId,
            photoAssetId: photoChanged ? input.photoAssetId : undefined,
          },
          select: storySelect,
        }),
      );
      if (photoChanged && story.photo) {
        await removeAsset(ctx.prisma, ctx.storage, ctx.member.spaceId, story.photo);
      }
      return toStory(ctx, row);
    }),

  /**
   * 지우기: 쓴 사람, 화자 본인 또는 parent. 사진을 R2에서 먼저 지우고(G-05) 이야기를 지운다.
   * 중간에 실패하면 이야기가 남아 다시 시도할 수 있다.
   */
  delete: spaceProcedure.input(z.object({ storyId: entityId })).mutation(async ({ ctx, input }) => {
    const { story, owner } = await findStory(ctx, input.storyId);
    if (!owner && ctx.member.role !== "parent") throw new TRPCError({ code: "FORBIDDEN" });
    if (story.photo) await removeAsset(ctx.prisma, ctx.storage, ctx.member.spaceId, story.photo);
    await ctx.prisma.storyEntry.deleteMany({ where: { id: story.id } });
    return { ok: true };
  }),

  /** 이야기 모음(모든 멤버): 최신순, 화자, 카테고리, 반려동물로 거른다. 커서는 (createdAt, id) */
  list: spaceProcedure
    .input(
      z.object({
        narratorMemberId: entityId.optional(),
        category: categoryInput.optional(),
        petId: entityId.optional(),
        cursor: z.object({ createdAt: z.date(), id: entityId }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.StoryEntryWhereInput = {
        spaceId: ctx.member.spaceId,
        narratorMemberId: input.narratorMemberId,
        category: input.category,
        petId: input.petId,
      };
      if (input.cursor) {
        where.OR = [
          { createdAt: { lt: input.cursor.createdAt } },
          { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } },
        ];
      }
      const rows = await ctx.prisma.storyEntry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: STORY_POLICY.pageSize + 1,
        select: storySelect,
      });
      const page = rows.slice(0, STORY_POLICY.pageSize);
      const last = page.at(-1);
      return {
        items: await withReactions(ctx, page),
        nextCursor:
          rows.length > STORY_POLICY.pageSize && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    }),

  /**
   * 물어보기(PRD §4.3): parent가 어르신(grandparent)께 질문 카드나 직접 쓴 질문을 보낸다.
   * 같은 카드를 이미 보내 답을 기다리는 중이면 그 물어보기를 돌려준다. 새 물어보기는 어르신께 알림,
   * 카카오톡 공유는 클라이언트가 링크로 보낸다(서버 비용 0). 리밋, 열린 물어보기 상한(G-07).
   */
  ask: parentProcedure
    .input(
      z.object({
        toMemberId: entityId,
        promptKey: z.string().min(1).max(64).optional(),
        question: question.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const spaceId = ctx.member.spaceId;
      if (!input.promptKey === !input.question) throw inputError("QUESTION_REQUIRED");
      if (input.promptKey && !isStoryPromptKey(input.promptKey)) {
        throw inputError("PROMPT_INVALID");
      }
      const to = await ctx.prisma.member.findFirst({
        where: { id: input.toMemberId, spaceId },
        select: { id: true, role: true, memorial: { select: { id: true } } },
      });
      if (!to) throw notFound("SUBJECT_NOT_FOUND");
      if (to.role !== "grandparent") throw inputError("NARRATOR_INVALID");
      if (to.memorial) throw inputError("MEMORIAL_READ_ONLY");
      const ok = await hitRateLimit(
        ctx.prisma,
        `story-ask:${ctx.userId}`,
        RATE_LIMITS.storyAskPerUser,
      );
      if (!ok) throw limitError("RATE_LIMITED");

      const { row, created } = await ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `story-ask:${to.id}`);
        if (input.promptKey) {
          const existing = await tx.storyAsk.findFirst({
            where: { toMemberId: to.id, promptKey: input.promptKey, entryId: null },
            select: askSelect,
          });
          if (existing) return { row: existing, created: false };
        }
        const open = await tx.storyAsk.count({ where: { toMemberId: to.id, entryId: null } });
        if (open >= STORY_POLICY.openAsksPerMember) throw limitError("ASK_OPEN_LIMIT");
        const row = await tx.storyAsk.create({
          data: {
            spaceId,
            askedById: ctx.userId,
            toMemberId: to.id,
            promptKey: input.promptKey,
            question: input.question,
          },
          select: askSelect,
        });
        return { row, created: true };
      });
      // 이미 열려 있던 같은 카드를 돌려줄 때는 다시 알리지 않는다
      if (created) notify(ctx.push, { type: "ask", spaceId, actorId: ctx.userId, askId: row.id });
      return toAsk(row);
    }),

  /**
   * 답을 기다리는 물어보기(모든 멤버, 오래된 순). 어르신당 상한이 있어 페이지 없이 돌려준다.
   * 답한 물어보기는 이야기 쪽(story.list, get의 ask)에서 보인다.
   */
  asks: spaceProcedure
    .input(z.object({ toMemberId: entityId.optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.storyAsk.findMany({
        where: { spaceId: ctx.member.spaceId, toMemberId: input.toMemberId, entryId: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: askSelect,
      });
      return rows.map(toAsk);
    }),

  /** 물어보기 거두기: 보낸 사람 또는 parent. 답한 이야기는 그대로 남는다 */
  cancelAsk: spaceProcedure
    .input(z.object({ askId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const ask = await ctx.prisma.storyAsk.findFirst({
        where: { id: input.askId, spaceId: ctx.member.spaceId },
        select: { id: true, askedById: true },
      });
      if (!ask) throw notFound("ITEM_NOT_FOUND");
      if (ask.askedById !== ctx.userId && ctx.member.role !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.prisma.storyAsk.deleteMany({ where: { id: ask.id } });
      return { ok: true };
    }),

  /** 이야기 하나(모든 멤버) */
  get: spaceProcedure.input(z.object({ storyId: entityId })).query(async ({ ctx, input }) => {
    const row = await ctx.prisma.storyEntry.findFirst({
      where: { id: input.storyId, spaceId: ctx.member.spaceId },
      select: storySelect,
    });
    if (!row) throw notFound("ITEM_NOT_FOUND");
    const [story] = await withReactions(ctx, [row]);
    return story;
  }),
});
