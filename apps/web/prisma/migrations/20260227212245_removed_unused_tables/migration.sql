/*
  Warnings:

  - You are about to drop the `Character` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Run` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_characterId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_characterId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_ownerId_fkey";

-- DropTable
DROP TABLE "Character";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "Run";
