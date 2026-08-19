import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import {
  parseStatementCsv,
  StatementColumnMapping,
  StatementDateFormat,
  StatementTransactionType,
} from './csv-statement.parser';
import { merchantSimilarity, normalizeMerchant } from './reconciliation';

interface ImportCsvInput {
  userId: string;
  sourceName: string;
  fileName?: string;
  csv: string;
  mapping?: StatementColumnMapping;
  dateFormat?: StatementDateFormat;
  positiveAmountType?: StatementTransactionType;
}

@Injectable()
export class StatementImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async importCsv(input: ImportCsvInput) {
    if (!input.sourceName?.trim()) {
      throw new BadRequestException(
        'Indica el banco o fuente del estado de cuenta',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const parsed = parseStatementCsv(input.csv, {
      mapping: input.mapping,
      dateFormat: input.dateFormat,
      positiveAmountType: input.positiveAmountType,
    });
    const statementImport = await this.prisma.statementImport.create({
      data: {
        userId: input.userId,
        sourceName: input.sourceName.trim(),
        fileName: input.fileName?.trim() || undefined,
        format: 'CSV',
        rowCount: parsed.rows.length + parsed.errors.length,
      },
    });

    let createdCount = 0;
    let matchedCount = 0;
    let duplicateCount = 0;
    let errorCount = parsed.errors.length;

    await Promise.all(
      parsed.errors.map((error) =>
        this.prisma.statementEntry.create({
          data: {
            userId: input.userId,
            importId: statementImport.id,
            rowNumber: error.rowNumber,
            status: 'ERROR',
            errorMessage: error.message,
            rawData: error.rawData,
          },
        }),
      ),
    );

    for (const row of parsed.rows) {
      const fingerprint = this.fingerprint(input.userId, input.sourceName, row);
      try {
        const previous = await this.prisma.statementEntry.findFirst({
          where: {
            userId: input.userId,
            fingerprint,
            importId: { not: statementImport.id },
            status: { in: ['CREATED', 'MATCHED', 'DUPLICATE'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (previous) {
          duplicateCount += 1;
          await this.createEntry(statementImport.id, input.userId, row, {
            fingerprint,
            status: 'DUPLICATE',
            transactionId: previous.transactionId ?? undefined,
            confidence: 1,
          });
          continue;
        }

        const match = await this.findMatch(input.userId, row);
        if (match) {
          matchedCount += 1;
          await this.createEntry(statementImport.id, input.userId, row, {
            fingerprint,
            status: 'MATCHED',
            transactionId: match.id,
            confidence: match.confidence,
          });
          continue;
        }

        const transaction = await this.transactionsService.create({
          userId: input.userId,
          amount: row.amount,
          merchant: row.merchant,
          description: `Importado de ${input.sourceName.trim()}`,
          type: row.type,
          isPlanned: false,
          date: row.date.toISOString().slice(0, 10),
          statementImportId: statementImport.id,
          externalReference: row.externalReference,
        });
        createdCount += 1;
        await this.createEntry(statementImport.id, input.userId, row, {
          fingerprint,
          status: 'CREATED',
          transactionId: transaction.id,
          confidence: 1,
        });
      } catch (error) {
        errorCount += 1;
        await this.createEntry(statementImport.id, input.userId, row, {
          fingerprint,
          status: 'ERROR',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Error desconocido al importar',
        });
      }
    }

    return this.prisma.statementImport.update({
      where: { id: statementImport.id },
      data: {
        status: errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        createdCount,
        matchedCount,
        duplicateCount,
        errorCount,
        finishedAt: new Date(),
      },
      include: { entries: { orderBy: { rowNumber: 'asc' } } },
    });
  }

  listByUser(userId: string) {
    return this.prisma.statementImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const result = await this.prisma.statementImport.findFirst({
      where: { id, userId },
      include: { entries: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!result) throw new NotFoundException('Importación no encontrada');
    return result;
  }

  private async findMatch(
    userId: string,
    row: {
      date: Date;
      amount: number;
      merchant: string;
      type: StatementTransactionType;
    },
  ): Promise<{ id: string; confidence: number } | null> {
    const start = new Date(row.date);
    const end = new Date(row.date);
    start.setUTCDate(start.getUTCDate() - 3);
    end.setUTCDate(end.getUTCDate() + 3);
    const candidates = await this.prisma.transaction.findMany({
      where: {
        userId,
        amount: { gte: row.amount - 0.01, lte: row.amount + 0.01 },
        type: { in: [row.type, row.type.toUpperCase()] },
        date: { gte: start, lte: end },
      },
      select: { id: true, merchant: true, date: true },
    });

    let best: { id: string; confidence: number } | null = null;
    for (const candidate of candidates) {
      const days =
        Math.abs(candidate.date.getTime() - row.date.getTime()) / 86_400_000;
      const dateScore = days < 0.5 ? 1 : days <= 1.5 ? 0.85 : 0.5;
      const confidence =
        merchantSimilarity(candidate.merchant, row.merchant) * 0.6 +
        dateScore * 0.4;
      if (confidence >= 0.65 && (!best || confidence > best.confidence)) {
        best = { id: candidate.id, confidence: Number(confidence.toFixed(3)) };
      }
    }
    return best;
  }

  private fingerprint(
    userId: string,
    sourceName: string,
    row: {
      date: Date;
      amount: number;
      merchant: string;
      type: StatementTransactionType;
      externalReference?: string;
    },
  ): string {
    const value = [
      userId,
      sourceName.trim().toUpperCase(),
      row.date.toISOString().slice(0, 10),
      row.amount.toFixed(2),
      row.type,
      normalizeMerchant(row.merchant),
      row.externalReference ?? '',
    ].join('|');
    return createHash('sha256').update(value).digest('hex');
  }

  private createEntry(
    importId: string,
    userId: string,
    row: {
      rowNumber: number;
      date: Date;
      merchant: string;
      amount: number;
      type: StatementTransactionType;
      externalReference?: string;
      rawData: Record<string, string>;
    },
    result: {
      fingerprint: string;
      status: string;
      transactionId?: string;
      confidence?: number;
      errorMessage?: string;
    },
  ) {
    return this.prisma.statementEntry.create({
      data: {
        userId,
        importId,
        rowNumber: row.rowNumber,
        date: row.date,
        merchant: row.merchant,
        amount: row.amount,
        type: row.type,
        externalReference: row.externalReference,
        rawData: row.rawData,
        ...result,
      },
    });
  }
}
