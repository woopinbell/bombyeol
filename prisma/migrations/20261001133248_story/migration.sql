-- AlterEnum
ALTER TYPE "ReactionKind" ADD VALUE 'star';

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "storyEntryId" TEXT;

-- CreateTable
CREATE TABLE "StoryEntry" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "narratorMemberId" TEXT,
    "narratorName" TEXT,
    "narratorLabel" TEXT,
    "scribeMemberId" TEXT,
    "scribeName" TEXT,
    "promptKey" TEXT,
    "category" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "storyYear" INTEGER,
    "petId" TEXT,
    "photoAssetId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAsk" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "askedById" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "promptKey" TEXT,
    "question" TEXT,
    "entryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAsk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorialProfile" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "memberId" TEXT,
    "petId" TEXT,
    "name" TEXT,
    "relationLabel" TEXT,
    "passedAt" DATE,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryEntry_photoAssetId_key" ON "StoryEntry"("photoAssetId");

-- CreateIndex
CREATE INDEX "StoryEntry_spaceId_createdAt_id_idx" ON "StoryEntry"("spaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "StoryEntry_narratorMemberId_createdAt_idx" ON "StoryEntry"("narratorMemberId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StoryEntry_petId_idx" ON "StoryEntry"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryAsk_entryId_key" ON "StoryAsk"("entryId");

-- CreateIndex
CREATE INDEX "StoryAsk_toMemberId_entryId_idx" ON "StoryAsk"("toMemberId", "entryId");

-- CreateIndex
CREATE INDEX "StoryAsk_spaceId_createdAt_idx" ON "StoryAsk"("spaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemorialProfile_memberId_key" ON "MemorialProfile"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemorialProfile_petId_key" ON "MemorialProfile"("petId");

-- CreateIndex
CREATE INDEX "MemorialProfile_spaceId_idx" ON "MemorialProfile"("spaceId");

-- CreateIndex
CREATE INDEX "Reaction_storyEntryId_kind_createdAt_idx" ON "Reaction"("storyEntryId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_storyEntryId_fkey" FOREIGN KEY ("storyEntryId") REFERENCES "StoryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_narratorMemberId_fkey" FOREIGN KEY ("narratorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_scribeMemberId_fkey" FOREIGN KEY ("scribeMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAsk" ADD CONSTRAINT "StoryAsk_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAsk" ADD CONSTRAINT "StoryAsk_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAsk" ADD CONSTRAINT "StoryAsk_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAsk" ADD CONSTRAINT "StoryAsk_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "StoryEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorialProfile" ADD CONSTRAINT "MemorialProfile_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorialProfile" ADD CONSTRAINT "MemorialProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorialProfile" ADD CONSTRAINT "MemorialProfile_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorialProfile" ADD CONSTRAINT "MemorialProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 대상 제약(Prisma 스키마로 표현할 수 없어 직접 추가)
-- 반응 대상은 정확히 하나(이야기 추가)
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_one_target";
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_one_target" CHECK (num_nonnulls("momentId", "milestoneId", "storyEntryId") = 1);
-- 물어보기는 질문 카드 또는 직접 쓴 질문 중 하나
ALTER TABLE "StoryAsk" ADD CONSTRAINT "StoryAsk_one_question" CHECK (num_nonnulls("promptKey", "question") = 1);
-- 기념 대상은 멤버·반려동물 중 최대 하나(멤버가 사라지면 스냅샷만 남는다)
ALTER TABLE "MemorialProfile" ADD CONSTRAINT "MemorialProfile_one_subject" CHECK (num_nonnulls("memberId", "petId") <= 1);
-- 이야기 시기(연)는 상식 범위
ALTER TABLE "StoryEntry" ADD CONSTRAINT "StoryEntry_year_range" CHECK ("storyYear" IS NULL OR "storyYear" BETWEEN 1850 AND 2200);
