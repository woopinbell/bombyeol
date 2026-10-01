import { z } from "zod";
import { ACCOUNT_LIMITS } from "@/lib/plan";
import { limitError } from "@/server/errors";
import { lockKey } from "@/server/locks";
import { protectedProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { childInput, createChild } from "./child";
import { relationLabel, spaceName } from "./inputs";

const DAY_MS = 24 * 60 * 60 * 1000;

export const spaceRouter = router({
  /** 가족 Space 생성: 생성자는 parent 멤버가 되고, 첫 아이를 함께 등록할 수 있다(G-11). */
  create: protectedProcedure
    .input(
      z.object({
        name: spaceName,
        relationLabel: relationLabel.optional(),
        child: childInput.optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `user-spaces:${ctx.userId}`);
        const cooldownStart = new Date(
          Date.now() - ACCOUNT_LIMITS.deletedSpaceCooldownDays * DAY_MS,
        );
        const [created, memberships] = await Promise.all([
          tx.space.count({
            where: {
              createdById: ctx.userId,
              OR: [{ deletedAt: null }, { deletedAt: { gt: cooldownStart } }],
            },
          }),
          tx.member.count({ where: { userId: ctx.userId, space: { deletedAt: null } } }),
        ]);
        if (created >= ACCOUNT_LIMITS.spacesCreatedPerUser) throw limitError("SPACE_CREATE_LIMIT");
        if (memberships >= ACCOUNT_LIMITS.membershipsPerUser) throw limitError("MEMBERSHIP_LIMIT");

        const space = await tx.space.create({
          data: {
            name: input.name,
            createdById: ctx.userId,
            members: {
              create: { userId: ctx.userId, role: "parent", relationLabel: input.relationLabel },
            },
          },
          select: { id: true },
        });
        if (input.child) await createChild(tx, space.id, ctx.userId, input.child);
        return space;
      }),
    ),

  /** 내가 속한 Space 목록 */
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.member.findMany({
      where: { userId: ctx.userId, space: { deletedAt: null } },
      orderBy: { joinedAt: "asc" },
      select: { role: true, space: { select: { id: true, name: true } } },
    }),
  ),

  /** Space 상세: 멤버와 아이 */
  get: spaceProcedure.query(({ ctx }) =>
    ctx.prisma.space.findUniqueOrThrow({
      where: { id: ctx.member.spaceId },
      select: {
        id: true,
        name: true,
        members: {
          orderBy: { joinedAt: "asc" },
          select: { id: true, role: true, relationLabel: true, user: { select: { name: true } } },
        },
        children: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            nickname: true,
            dueDate: true,
            birthDate: true,
            status: true,
          },
        },
      },
    }),
  ),
});
