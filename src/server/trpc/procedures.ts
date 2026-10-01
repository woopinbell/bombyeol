import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { MemberRole } from "@/generated/prisma/client";
import { publicProcedure } from "./init";

/** 로그인한 사용자만 통과. ctx.userId를 string으로 좁힌다. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/**
 * 요청 사용자가 input.spaceId의 멤버인지 매 요청 검사한다(ARCHITECTURE §3·§4).
 * 멤버가 아니거나 삭제된 Space면 존재 여부를 드러내지 않도록 NOT_FOUND.
 */
export const spaceProcedure = protectedProcedure
  .input(z.object({ spaceId: z.string().min(1).max(64) }))
  .use(async ({ ctx, input, next }) => {
    const member = await ctx.prisma.member.findUnique({
      where: { spaceId_userId: { spaceId: input.spaceId, userId: ctx.userId } },
      select: { id: true, role: true, spaceId: true, space: { select: { deletedAt: true } } },
    });
    if (!member || member.space.deletedAt) throw new TRPCError({ code: "NOT_FOUND" });
    return next({
      ctx: { ...ctx, member: { id: member.id, role: member.role, spaceId: member.spaceId } },
    });
  });

/** 허용된 역할의 멤버만 통과(예: 초대·아이 관리·삭제는 parent). */
export function spaceRoleProcedure(...roles: [MemberRole, ...MemberRole[]]) {
  return spaceProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.member.role)) throw new TRPCError({ code: "FORBIDDEN" });
    return next();
  });
}

export const parentProcedure = spaceRoleProcedure("parent");
