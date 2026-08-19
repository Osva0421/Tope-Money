-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "externalReference" TEXT,
ADD COLUMN "statementImportId" TEXT;

-- CreateTable
CREATE TABLE "StatementImport" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "fileName" TEXT,
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementEntry" (
    "id" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "merchant" TEXT,
    "amount" DOUBLE PRECISION,
    "type" TEXT,
    "externalReference" TEXT,
    "fingerprint" TEXT,
    "status" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "StatementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_statementImportId_idx" ON "Transaction"("statementImportId");
CREATE INDEX "StatementImport_userId_createdAt_idx" ON "StatementImport"("userId", "createdAt");
CREATE INDEX "StatementEntry_userId_fingerprint_idx" ON "StatementEntry"("userId", "fingerprint");
CREATE INDEX "StatementEntry_importId_status_idx" ON "StatementEntry"("importId", "status");
CREATE UNIQUE INDEX "StatementEntry_importId_rowNumber_key" ON "StatementEntry"("importId", "rowNumber");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementImportId_fkey" FOREIGN KEY ("statementImportId") REFERENCES "StatementImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatementEntry" ADD CONSTRAINT "StatementEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatementEntry" ADD CONSTRAINT "StatementEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatementEntry" ADD CONSTRAINT "StatementEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
