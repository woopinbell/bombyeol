import { z } from "zod";
import { STORY_CATEGORIES, STORY_PROMPTS, type StoryPromptKey } from "@/lib/story-prompts";
import { notFound } from "@/server/errors";
import { spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { entityId } from "./inputs";

const categoryInput = z.enum(STORY_CATEGORIES);

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
});
