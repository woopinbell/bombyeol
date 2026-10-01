-- CreateEnum
CREATE TYPE "DeletionKind" AS ENUM ('account', 'space');

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "kind" "DeletionKind" NOT NULL,
    "spaceId" TEXT,
    "userId" TEXT,
    "spaceCreatedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAfter" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "canceledById" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletionRequest_kind_completedAt_purgeAfter_idx" ON "DeletionRequest"("kind", "completedAt", "purgeAfter");

-- CreateIndex
CREATE INDEX "DeletionRequest_spaceId_idx" ON "DeletionRequest"("spaceId");

-- CreateIndex
CREATE INDEX "DeletionRequest_spaceCreatedById_completedAt_idx" ON "DeletionRequest"("spaceCreatedById", "completedAt");

-- Space당 진행 중(취소·완료 전) 삭제 요청은 하나뿐(동시 요청 방지)
CREATE UNIQUE INDEX "DeletionRequest_space_open_key" ON "DeletionRequest"("spaceId")
  WHERE "kind" = 'space' AND "canceledAt" IS NULL AND "completedAt" IS NULL;

-- kind별 필수 필드: space 요청은 spaceId·요청자·만든 사람, account 요청은 userId
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_target_check" CHECK (
  ("kind" = 'space' AND "spaceId" IS NOT NULL AND "userId" IS NOT NULL AND "spaceCreatedById" IS NOT NULL)
  OR ("kind" = 'account' AND "userId" IS NOT NULL AND "spaceId" IS NULL)
);
