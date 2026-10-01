-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('terms', 'privacy', 'child_data', 'pregnancy');

-- CreateEnum
CREATE TYPE "PregnancyRecordKind" AS ENUM ('ultrasound', 'checkup', 'kick', 'note');

-- CreateEnum
CREATE TYPE "PregnancyVisibility" AS ENUM ('parents_only', 'family');

-- CreateEnum
CREATE TYPE "FamilyEventKind" AS ENUM ('gathering', 'birthday', 'anniversary', 'other');

-- CreateEnum
CREATE TYPE "FamilyEventRecurrence" AS ENUM ('none', 'yearly');

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spaceId" TEXT,
    "kind" "ConsentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PregnancyRecord" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "kind" "PregnancyRecordKind" NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "photoAssetId" TEXT,
    "visibility" "PregnancyVisibility" NOT NULL DEFAULT 'parents_only',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PregnancyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "FamilyEventKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" "FamilyEventRecurrence" NOT NULL DEFAULT 'none',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consent_userId_kind_spaceId_idx" ON "Consent"("userId", "kind", "spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PregnancyRecord_photoAssetId_key" ON "PregnancyRecord"("photoAssetId");

-- CreateIndex
CREATE INDEX "PregnancyRecord_childId_date_id_idx" ON "PregnancyRecord"("childId", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "PregnancyRecord_spaceId_createdById_idx" ON "PregnancyRecord"("spaceId", "createdById");

-- CreateIndex
CREATE INDEX "FamilyEvent_spaceId_startsAt_idx" ON "FamilyEvent"("spaceId", "startsAt");

-- CreateIndex
CREATE INDEX "FamilyEvent_spaceId_recurrence_idx" ON "FamilyEvent"("spaceId", "recurrence");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 규칙 제약(Prisma 스키마로 표현할 수 없어 직접 추가)
-- 약관·처리방침 동의는 사용자 단위, 아이 정보·임신 동의는 Space 단위
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_scope" CHECK (("kind" IN ('terms', 'privacy')) = ("spaceId" IS NULL));
-- 초음파 기록에만 사진이 붙고 반드시 붙는다. 메모 기록은 글이 있어야 한다
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_photo_kind" CHECK (("kind" = 'ultrasound') = ("photoAssetId" IS NOT NULL));
ALTER TABLE "PregnancyRecord" ADD CONSTRAINT "PregnancyRecord_note_required" CHECK ("kind" <> 'note' OR "note" IS NOT NULL);
-- 일정은 끝이 시작보다 앞설 수 없다
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_range" CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt");
