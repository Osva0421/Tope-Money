-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "categoryAssignedBy" TEXT;
