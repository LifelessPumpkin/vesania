/*
  Warnings:

  - You are about to drop the column `status` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `CardDefinition` table. All the data in the column will be lost.
  - You are about to drop the `Character` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Run` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `CardDefinition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rarity` to the `CardDefinition` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- AlterEnum
ALTER TYPE "CardType" ADD VALUE 'TOOL';

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_characterId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_characterId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_ownerId_fkey";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "CardDefinition" DROP COLUMN "description",
DROP COLUMN "rarity",
ADD COLUMN     "rarity" "CardRarity" NOT NULL;

-- DropTable
DROP TABLE "Character";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "Run";

-- DropEnum
DROP TYPE "CardStatus";

-- CreateIndex
CREATE UNIQUE INDEX "CardDefinition_name_key" ON "CardDefinition"("name");
