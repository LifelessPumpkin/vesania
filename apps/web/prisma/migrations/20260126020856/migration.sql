/*
  Warnings:

  - You are about to drop the `CardInstance` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `definitionId` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CHARACTER', 'ITEM', 'SPELL');

-- AlterEnum
ALTER TYPE "CardStatus" ADD VALUE 'LOCKED';

-- DropForeignKey
ALTER TABLE "CardInstance" DROP CONSTRAINT "CardInstance_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CardInstance" DROP CONSTRAINT "CardInstance_characterId_fkey";

-- DropForeignKey
ALTER TABLE "CardInstance" DROP CONSTRAINT "CardInstance_ownerId_fkey";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "definitionId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CardInstance";

-- CreateTable
CREATE TABLE "CardDefinition" (
    "id" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" TEXT,
    "effectJson" JSONB,

    CONSTRAINT "CardDefinition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CardDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
