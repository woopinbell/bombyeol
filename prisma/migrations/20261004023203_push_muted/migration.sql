-- CreateEnum
CREATE TYPE "PushNotice" AS ENUM ('moment', 'story', 'ask', 'heart', 'comment', 'news');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "pushMuted" "PushNotice"[] DEFAULT ARRAY[]::"PushNotice"[];
