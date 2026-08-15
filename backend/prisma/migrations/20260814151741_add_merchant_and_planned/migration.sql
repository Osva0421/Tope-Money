/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `isPlanned` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchant` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "createdAt",
ADD COLUMN     "isPlanned" BOOLEAN NOT NULL,
ADD COLUMN     "merchant" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
