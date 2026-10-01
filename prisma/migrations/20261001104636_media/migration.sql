-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending', 'confirmed', 'deleted');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "spaceId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "uploadUrlsIssued" INTEGER NOT NULL DEFAULT 0,
    "bytesConfirmed" BIGINT NOT NULL DEFAULT 0,
    "bytesDeleted" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("spaceId","periodKey")
);

-- CreateIndex
CREATE INDEX "MediaAsset_spaceId_status_idx" ON "MediaAsset"("spaceId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_status_createdAt_idx" ON "MediaAsset"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
