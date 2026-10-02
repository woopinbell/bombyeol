-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "isFirst" BOOLEAN NOT NULL DEFAULT false;

-- "처음"이 종류 이름에서 표시로 바뀌었다(사용자 결정 2026-10-02): first_* 기록은 같은 순간 종류 + 처음 표시로 옮긴다.
UPDATE "Milestone" SET "kind" = substr("kind", 7), "isFirst" = true
WHERE "kind" IN ('first_roll', 'first_sit', 'first_crawl', 'first_tooth', 'first_step', 'first_word')
  AND "childId" IS NOT NULL;
UPDATE "Milestone" SET "kind" = 'walk', "isFirst" = true
WHERE "kind" = 'first_walk' AND "petId" IS NOT NULL;
