import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { EVENT_POLICY, TIER_LIMITS, tierOf } from "@/lib/plan";
import { inputError, limitError, notFound } from "@/server/errors";
import { upcomingFor } from "@/server/family-upcoming";
import { lockKey } from "@/server/locks";
import type { Context } from "@/server/trpc/context";
import { parentProcedure, spaceProcedure } from "@/server/trpc/procedures";
import { router } from "@/server/trpc/init";
import { activeInviteWhere } from "./invite";
import { entityId, isoDate, relationLabel } from "./inputs";

const memberRole = z.enum(["parent", "grandparent", "relative"]);

type SpaceCtx = Context & {
  userId: string;
  member: { id: string; role: string; spaceId: string };
};

/**
 * 역할 변경, 내보내기 대상: 같은 Space의 다른 멤버. 자기 자신과 Space를 만든 사람은 대상이 아니고
 * (마지막 관리자 소실, 관리자끼리 서로 내보내기 방지), 기념 상태인 분은 되돌린 뒤에만.
 */
async function findManagedMember(ctx: SpaceCtx, memberId: string) {
  const member = await ctx.prisma.member.findFirst({
    where: { id: memberId, spaceId: ctx.member.spaceId },
    select: {
      id: true,
      userId: true,
      role: true,
      space: { select: { createdById: true } },
      memorial: { select: { id: true } },
    },
  });
  if (!member) throw notFound("SUBJECT_NOT_FOUND");
  if (member.id === ctx.member.id || member.userId === member.space.createdById) {
    throw new TRPCError({ code: "FORBIDDEN", message: "MEMBER_PROTECTED" });
  }
  if (member.memorial) throw inputError("MEMORIAL_READ_ONLY");
  return member;
}

/**
 * 멤버가 Space를 떠난다(내보내기, 나가기). 그 사람이 발급해 아직 쓰이지 않은 초대는 거둔다.
 * 콘텐츠는 Space 소유라 남는다 - 이야기는 화자, 대필자 스냅샷으로, 받은 물어보기는 사라진다(FK 규칙).
 */
async function removeMember(ctx: SpaceCtx, member: { id: string; userId: string }) {
  const spaceId = ctx.member.spaceId;
  await ctx.prisma.$transaction(async (tx) => {
    await lockKey(tx, `space-invites:${spaceId}`);
    await tx.invite.updateMany({
      where: { ...activeInviteWhere(spaceId, new Date()), createdById: member.userId },
      data: { revokedAt: new Date() },
    });
    await tx.member.deleteMany({ where: { id: member.id } });
  });
}

/** 우리(PRD §4.4): 세대별 프로필 - 멤버, 역할, 관계 표시명 관리 */
export const familyRouter = router({
  /** 멤버 목록(모든 멤버): 관리 화면에서 바꿀 수 있는 대상인지 판단할 표시를 함께 준다 */
  members: spaceProcedure.query(async ({ ctx }) => {
    const space = await ctx.prisma.space.findUniqueOrThrow({
      where: { id: ctx.member.spaceId },
      select: {
        createdById: true,
        members: {
          orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            userId: true,
            role: true,
            relationLabel: true,
            joinedAt: true,
            user: { select: { name: true } },
            memorial: { select: { id: true } },
          },
        },
      },
    });
    return space.members.map(({ userId, user, memorial, ...m }) => ({
      ...m,
      name: user.name,
      me: m.id === ctx.member.id,
      creator: userId === space.createdById,
      memorial: Boolean(memorial),
    }));
  }),

  /**
   * 우리 탭 카드(조회 시점 계산, 정시 알림 없음): 다음 가족 모임 D-day와 앞으로 days일 안의
   * 아이 생일, 반려동물 생일, 입양기념일, 기일, 직접 등록한 생일/기념일. today, utcOffsetMinutes는 클라이언트 현지 기준.
   * 출생 예정일은 넣지 않는다(임신 관련 날짜는 카드로 펼치지 않음, COMMIT_PLAN Phase 5 메모).
   */
  upcoming: spaceProcedure
    .input(
      z.object({
        today: isoDate.optional(),
        utcOffsetMinutes: z
          .number()
          .int()
          .min(-14 * 60)
          .max(14 * 60)
          .default(0),
        days: z
          .number()
          .int()
          .min(1)
          .max(EVENT_POLICY.upcomingMaxDays)
          .default(EVENT_POLICY.upcomingDays),
      }),
    )
    .query(({ ctx, input }) =>
      upcomingFor(ctx.prisma, ctx.member.spaceId, {
        today: input.today,
        utcOffsetMinutes: input.utcOffsetMinutes,
        days: input.days,
      }),
    ),

  /** 관계 표시명(할머니, 외할아버지 등): 본인 또는 parent. null이면 지운다 */
  updateLabel: spaceProcedure
    .input(z.object({ memberId: entityId, relationLabel: relationLabel.nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (input.memberId !== ctx.member.id && ctx.member.role !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { count } = await ctx.prisma.member.updateMany({
        where: { id: input.memberId, spaceId: ctx.member.spaceId },
        data: { relationLabel: input.relationLabel },
      });
      if (count === 0) throw notFound("SUBJECT_NOT_FOUND");
      return { memberId: input.memberId, relationLabel: input.relationLabel };
    }),

  /**
   * 역할 바꾸기(parent). 요금제의 역할별 정원(G-11)을 초대와 같은 잠금 아래에서 다시 센다 - * 대기 중인 초대도 정원에 포함. 바뀐 역할은 다음 요청부터 바로 권한에 반영된다(매 요청 검사).
   */
  changeRole: parentProcedure
    .input(z.object({ memberId: entityId, role: memberRole }))
    .mutation(async ({ ctx, input }) => {
      const member = await findManagedMember(ctx, input.memberId);
      if (member.role === input.role) return { memberId: member.id, role: member.role };
      const spaceId = ctx.member.spaceId;
      return ctx.prisma.$transaction(async (tx) => {
        await lockKey(tx, `space-invites:${spaceId}`);
        const [members, pending] = await Promise.all([
          tx.member.count({ where: { spaceId, role: input.role } }),
          tx.invite.count({
            where: { ...activeInviteWhere(spaceId, new Date()), role: input.role },
          }),
        ]);
        if (members + pending >= TIER_LIMITS[tierOf()].membersByRole[input.role]) {
          throw limitError("MEMBER_ROLE_LIMIT");
        }
        const updated = await tx.member.update({
          where: { id: member.id },
          data: { role: input.role },
          select: { id: true, role: true },
        });
        return { memberId: updated.id, role: updated.role };
      });
    }),

  /** 내보내기(parent) */
  remove: parentProcedure
    .input(z.object({ memberId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const member = await findManagedMember(ctx, input.memberId);
      await removeMember(ctx, member);
      return { ok: true };
    }),

  /** 스스로 나가기(삭제 유예 중에도). Space를 만든 사람은 나갈 수 없다(대신 Space 삭제) */
  leave: spaceProcedure.meta({ allowWhileDeleting: true }).mutation(async ({ ctx }) => {
    const space = await ctx.prisma.space.findUniqueOrThrow({
      where: { id: ctx.member.spaceId },
      select: { createdById: true },
    });
    if (space.createdById === ctx.userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "MEMBER_PROTECTED" });
    }
    await removeMember(ctx, { id: ctx.member.id, userId: ctx.userId });
    return { ok: true };
  }),
});
