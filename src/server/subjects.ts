import { z } from "zod";
import type { MemberRole, PrismaClient } from "@/generated/prisma/client";
import { notFound } from "@/server/errors";
import { entityId } from "@/server/routers/inputs";

const childSubject = z.object({ type: z.literal("child"), childId: entityId });
const petSubject = z.object({ type: z.literal("pet"), petId: entityId });

/** 기록 대상: 아이 / 반려동물 / 가족 전체 */
export const subjectInput = z.discriminatedUnion("type", [
  childSubject,
  petSubject,
  z.object({ type: z.literal("family") }),
]);

/** 마일스톤처럼 한 구성원(아이, 반려동물)만 대상이 되는 기록 */
export const memberSubjectInput = z.discriminatedUnion("type", [childSubject, petSubject]);

export type SubjectInput = z.infer<typeof subjectInput>;

/**
 * 누가 어떤 대상에 기록할 수 있나(COMMIT_PLAN Phase 3 설계):
 * 아이 기록은 parent만(PRIVACY §4), 반려동물, 가족 전체는 parent, grandparent. relative는 열람, 댓글만.
 */
export function canRecordFor(role: MemberRole, subject: SubjectInput["type"]) {
  if (subject === "child") return role === "parent";
  return role === "parent" || role === "grandparent";
}

/** 대상이 같은 Space에 있는지 확인하고 Moment, Milestone의 FK 값으로 바꾼다 */
export async function resolveSubject(
  prisma: Pick<PrismaClient, "child" | "pet">,
  spaceId: string,
  subject: SubjectInput,
): Promise<{ childId: string | null; petId: string | null }> {
  if (subject.type === "family") return { childId: null, petId: null };
  if (subject.type === "child") {
    const child = await prisma.child.findFirst({
      where: { id: subject.childId, spaceId },
      select: { id: true },
    });
    if (!child) throw notFound("SUBJECT_NOT_FOUND");
    return { childId: child.id, petId: null };
  }
  const pet = await prisma.pet.findFirst({
    where: { id: subject.petId, spaceId },
    select: { id: true },
  });
  if (!pet) throw notFound("SUBJECT_NOT_FOUND");
  return { childId: null, petId: pet.id };
}
