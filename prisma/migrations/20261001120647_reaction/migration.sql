-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('like', 'comment');

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "momentId" TEXT,
    "milestoneId" TEXT,
    "kind" "ReactionKind" NOT NULL,
    "body" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_momentId_kind_createdAt_idx" ON "Reaction"("momentId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Reaction_milestoneId_kind_createdAt_idx" ON "Reaction"("milestoneId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Reaction_createdById_idx" ON "Reaction"("createdById");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 대상 제약(Prisma 스키마로 표현할 수 없어 직접 추가)
-- 대상은 정확히 하나
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_one_target" CHECK (num_nonnulls("momentId", "milestoneId") = 1);
-- 댓글만 본문이 있다
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_body_kind" CHECK (("kind" = 'comment') = ("body" IS NOT NULL));
