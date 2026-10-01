-- CreateTable
CREATE TABLE "SpikePing" (
    "id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpikePing_pkey" PRIMARY KEY ("id")
);
