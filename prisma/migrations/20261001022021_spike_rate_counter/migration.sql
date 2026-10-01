-- CreateTable
CREATE TABLE "RateCounter" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateCounter_pkey" PRIMARY KEY ("key","windowStart")
);
