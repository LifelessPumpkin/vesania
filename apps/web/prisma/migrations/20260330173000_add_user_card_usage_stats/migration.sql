-- CreateTable
CREATE TABLE "UserCardUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCardUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCardUsage_userId_cardId_key" ON "UserCardUsage"("userId", "cardId");

-- CreateIndex
CREATE INDEX "UserCardUsage_userId_playCount_idx" ON "UserCardUsage"("userId", "playCount");

-- AddForeignKey
ALTER TABLE "UserCardUsage" ADD CONSTRAINT "UserCardUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCardUsage" ADD CONSTRAINT "UserCardUsage_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
