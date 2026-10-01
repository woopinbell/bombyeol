-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('dog', 'cat', 'other');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('living', 'memorial');

-- CreateEnum
CREATE TYPE "MomentKind" AS ENUM ('media', 'diary');

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "speciesLabel" TEXT,
    "breed" TEXT,
    "birthDate" DATE,
    "birthDateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "adoptedAt" DATE,
    "passedAt" DATE,
    "status" "PetStatus" NOT NULL DEFAULT 'living',
    "coverAssetId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "childId" TEXT,
    "petId" TEXT,
    "kind" "MomentKind" NOT NULL,
    "body" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentMedia" (
    "momentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "assetId" TEXT NOT NULL,
    "thumbnailAssetId" TEXT,

    CONSTRAINT "MomentMedia_pkey" PRIMARY KEY ("momentId","position")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "childId" TEXT,
    "petId" TEXT,
    "kind" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "recordedAt" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pet_coverAssetId_key" ON "Pet"("coverAssetId");

-- CreateIndex
CREATE INDEX "Pet_spaceId_idx" ON "Pet"("spaceId");

-- CreateIndex
CREATE INDEX "Moment_spaceId_takenAt_id_idx" ON "Moment"("spaceId", "takenAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Moment_childId_takenAt_idx" ON "Moment"("childId", "takenAt" DESC);

-- CreateIndex
CREATE INDEX "Moment_petId_takenAt_idx" ON "Moment"("petId", "takenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MomentMedia_assetId_key" ON "MomentMedia"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentMedia_thumbnailAssetId_key" ON "MomentMedia"("thumbnailAssetId");

-- CreateIndex
CREATE INDEX "Milestone_childId_recordedAt_idx" ON "Milestone"("childId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "Milestone_petId_recordedAt_idx" ON "Milestone"("petId", "recordedAt" DESC);

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentMedia" ADD CONSTRAINT "MomentMedia_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentMedia" ADD CONSTRAINT "MomentMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentMedia" ADD CONSTRAINT "MomentMedia_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 대상 제약(Prisma 스키마로 표현할 수 없어 직접 추가)
-- Moment: 아이·반려동물 중 최대 하나(둘 다 비면 가족 전체)
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_single_subject" CHECK (num_nonnulls("childId", "petId") <= 1);
-- Milestone: 아이·반려동물 중 정확히 하나
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_one_subject" CHECK (num_nonnulls("childId", "petId") = 1);
