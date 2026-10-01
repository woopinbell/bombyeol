import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { TIER_LIMITS, tierOf } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { parentProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { isoDate, personName } from "./inputs";

/** 이름·태명 중 하나 이상, 출생 예정일·생일 중 정확히 하나 */
export const childInput = z
  .object({
    name: personName.optional(),
    nickname: personName.optional(),
    dueDate: isoDate.optional(),
    birthDate: isoDate.optional(),
  })
  .refine((c) => c.name || c.nickname, { message: "NAME_REQUIRED" })
  .refine((c) => Boolean(c.dueDate) !== Boolean(c.birthDate), { message: "ONE_DATE_REQUIRED" });

export function createChild(
  tx: Prisma.TransactionClient,
  spaceId: string,
  createdById: string,
  child: z.infer<typeof childInput>,
) {
  const { name, nickname, dueDate, birthDate } = child;
  return tx.child.create({
    data: {
      spaceId,
      name,
      nickname,
      dueDate,
      birthDate,
      status: birthDate ? "born" : "expecting",
      createdById,
    },
    select: { id: true, status: true },
  });
}

export const childRouter = router({
  create: parentProcedure.input(z.object({ child: childInput })).mutation(({ ctx, input }) =>
    ctx.prisma.$transaction(async (tx) => {
      await lockKey(tx, `space-children:${ctx.member.spaceId}`);
      const count = await tx.child.count({ where: { spaceId: ctx.member.spaceId } });
      if (count >= TIER_LIMITS[tierOf()].children) throw limitError("CHILD_LIMIT");
      return createChild(tx, ctx.member.spaceId, ctx.userId, input.child);
    }),
  ),
});
