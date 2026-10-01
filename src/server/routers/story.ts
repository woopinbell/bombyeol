import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { RATE_LIMITS, STORY_POLICY } from "@/lib/plan";
import {
  STORY_CATEGORIES,
  STORY_PROMPTS,
  isStoryPromptKey,
  type StoryPromptKey,
} from "@/lib/story-prompts";
import { inputError, limitError, notFound } from "@/server/errors";
import { hitRateLimit } from "@/server/rate-limit";
import type { Context } from "@/server/trpc/context";
import { spaceProcedure } from "@/server/trpc/procedures";
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

const storySelect = {
  id: true,
  title: true,
  body: true,
  promptKey: true,
  category: true,
  storyYear: true,
  petId: true,
  narratorMemberId: true,
  narratorName: true,
  narratorLabel: true,
  scribeMemberId: true,
  scribeName: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.StoryEntrySelect;

type StoryRow = Prisma.StoryEntryGetPayload<{ select: typeof storySelect }>;

/** 응답 모양: 화자·대필자는 작성 시점 스냅샷(멤버가 사라져도 표시된다, PRIVACY §5) */
function toStory(row: StoryRow) {
  const { narratorMemberId, narratorName, narratorLabel, scribeMemberId, scribeName, ...rest } =
    row;
  return {
    ...rest,
    narrator: { memberId: narratorMemberId, name: narratorName, label: narratorLabel },
    scribe: scribeMemberId || scribeName ? { memberId: scribeMemberId, name: scribeName } : null,
  };
}

type SpaceCtx = Context & {
  userId: string;
  member: { id: string; role: string; spaceId: string };
};

/**
 * 누가 누구의 이야기를 쓸 수 있나(PRD §4.3):
 * 자기 이야기는 parent·grandparent, 대필은 parent·grandparent가 어르신(grandparent)의 이야기를.
 * relative는 열람·반응만.
 */
async function resolveNarrator(ctx: SpaceCtx, narratorMemberId: string | undefined) {
  if (ctx.member.role === "relative") throw new TRPCError({ code: "FORBIDDEN" });
  const narrator = await ctx.prisma.member.findFirst({
    where: { id: narratorMemberId ?? ctx.member.id, spaceId: ctx.member.spaceId },
    select: { id: true, role: true, relationLabel: true, user: { select: { name: true } } },
  });
  if (!narrator) throw notFound("SUBJECT_NOT_FOUND");
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

/** 수정: 쓴 사람 또는 화자 본인. 삭제는 여기에 parent를 더한다 */
async function findStory(ctx: SpaceCtx, storyId: string) {
  const story = await ctx.prisma.storyEntry.findFirst({
    where: { id: storyId, spaceId: ctx.member.spaceId },
    select: { id: true, createdById: true, narratorMemberId: true, promptKey: true },
  });
  if (!story) throw notFound("ITEM_NOT_FOUND");
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
   * narratorMemberId가 내가 아니면 대필 — 작성자(화자)·대필자를 함께 기록한다. 글 쓰기 리밋(G-07).
   */
  create: spaceProcedure
    .input(
      z.object({
        narratorMemberId: entityId.optional(),
        promptKey: z.string().min(1).max(64).optional(),
        category: categoryInput.optional(),
        title: title.optional(),
        body,
        storyYear: storyYear.optional(),
        petId: entityId.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { narrator, scribing } = await resolveNarrator(ctx, input.narratorMemberId);
      if (input.promptKey && !isStoryPromptKey(input.promptKey)) {
        throw inputError("PROMPT_INVALID");
      }
      const petId = await resolvePet(ctx, input.petId);
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
      const row = await ctx.prisma.storyEntry.create({
        data: {
          spaceId: ctx.member.spaceId,
          narratorMemberId: narrator.id,
          narratorName: narrator.user.name,
          narratorLabel: narrator.relationLabel,
          scribeMemberId: scribing ? ctx.member.id : null,
          scribeName: scribe?.name ?? null,
          promptKey: input.promptKey ?? null,
          category: input.promptKey
            ? STORY_PROMPTS[input.promptKey as StoryPromptKey]
            : (input.category ?? null),
          title: input.title,
          body: input.body,
          storyYear: input.storyYear,
          petId,
          createdById: ctx.userId,
        },
        select: storySelect,
      });
      return toStory(row);
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { story, owner } = await findStory(ctx, input.storyId);
      if (!owner) throw new TRPCError({ code: "FORBIDDEN" });
      if (story.promptKey && input.category !== undefined) throw inputError("PROMPT_INVALID");
      const row = await ctx.prisma.storyEntry.update({
        where: { id: story.id },
        data: {
          title: input.title,
          body: input.body,
          storyYear: input.storyYear,
          category: input.category,
          petId: await resolvePet(ctx, input.petId),
        },
        select: storySelect,
      });
      return toStory(row);
    }),

  /** 지우기: 쓴 사람, 화자 본인 또는 parent */
  delete: spaceProcedure.input(z.object({ storyId: entityId })).mutation(async ({ ctx, input }) => {
    const { story, owner } = await findStory(ctx, input.storyId);
    if (!owner && ctx.member.role !== "parent") throw new TRPCError({ code: "FORBIDDEN" });
    await ctx.prisma.storyEntry.deleteMany({ where: { id: story.id } });
    return { ok: true };
  }),

  /** 이야기 모음(모든 멤버): 최신순, 화자·카테고리·반려동물로 거른다. 커서는 (createdAt, id) */
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
        items: page.map(toStory),
        nextCursor:
          rows.length > STORY_POLICY.pageSize && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    }),

  /** 이야기 하나(모든 멤버) */
  get: spaceProcedure.input(z.object({ storyId: entityId })).query(async ({ ctx, input }) => {
    const row = await ctx.prisma.storyEntry.findFirst({
      where: { id: input.storyId, spaceId: ctx.member.spaceId },
      select: storySelect,
    });
    if (!row) throw notFound("ITEM_NOT_FOUND");
    return toStory(row);
  }),
});
