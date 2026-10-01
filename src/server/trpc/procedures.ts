import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { MemberRole, Prisma } from "@/generated/prisma/client";
import { publicProcedure } from "./init";

/** 진행 중(취소·완료 전)인 Space 삭제 요청 */
export function openSpaceDeletion(spaceId: string): Prisma.DeletionRequestWhereInput {
  return { kind: "space", spaceId, canceledAt: null, completedAt: null };
}

/** 로그인한 사용자만 통과. ctx.userId를 string으로 좁힌다. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/**
 * 요청 사용자가 input.spaceId의 멤버인지 매 요청 검사한다(ARCHITECTURE §3·§4).
 * 멤버가 아니거나 삭제된 Space면 존재 여부를 드러내지 않도록 NOT_FOUND.
 * 삭제 유예 중인 Space는 읽기·내보내기만 — 쓰기는 `SPACE_DELETING`(메타로 허용한 것만 통과).
 */
export const spaceProcedure = protectedProcedure
  .input(z.object({ spaceId: z.string().min(1).max(64) }))
  .use(async ({ ctx, input, next, type, meta }) => {
    const member = await ctx.prisma.member.findUnique({
      where: { spaceId_userId: { spaceId: input.spaceId, userId: ctx.userId } },
      select: { id: true, role: true, spaceId: true, space: { select: { deletedAt: true } } },
    });
    if (!member || member.space.deletedAt) throw new TRPCError({ code: "NOT_FOUND" });
    if (type === "mutation" && !meta?.allowWhileDeleting) {
      const deleting = await ctx.prisma.deletionRequest.findFirst({
        where: openSpaceDeletion(member.spaceId),
        select: { id: true },
      });
      if (deleting) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SPACE_DELETING" });
      }
    }
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
