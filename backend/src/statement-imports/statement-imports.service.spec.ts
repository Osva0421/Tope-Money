import { Test, TestingModule } from '@nestjs/testing';
import { StatementImportsService } from './statement-imports.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';

describe('StatementImportsService', () => {
  let service: StatementImportsService;
  const prisma = {
    user: { findUnique: jest.fn() },
    statementImport: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    statementEntry: { create: jest.fn(), findFirst: jest.fn() },
    transaction: { findMany: jest.fn() },
  };
  const transactionsService = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementImportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionsService, useValue: transactionsService },
      ],
    }).compile();
    service = module.get(StatementImportsService);
  });

  it('matches, creates and deduplicates statement rows', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.statementImport.create.mockResolvedValue({ id: 'import-1' });
    prisma.statementEntry.create.mockResolvedValue({});
    prisma.statementEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ transactionId: 'tx-old' });
    prisma.transaction.findMany
      .mockResolvedValueOnce([
        {
          id: 'tx-match',
          merchant: 'Starbucks Reforma',
          date: new Date('2026-08-18T12:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    transactionsService.create.mockResolvedValue({ id: 'tx-created' });
    prisma.statementImport.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'import-1', ...data }),
    );

    const result = await service.importCsv({
      userId: 'user-1',
      sourceName: 'Banco de prueba',
      csv: [
        'Fecha,Descripción,Monto,Tipo,Referencia',
        '18/08/2026,COMPRA STARBUCKS 9981,95.00,CARGO,1',
        '17/08/2026,NÓMINA,1000.00,ABONO,2',
        '16/08/2026,OXXO,50.00,CARGO,3',
      ].join('\n'),
    });

    expect(result).toMatchObject({
      status: 'COMPLETED',
      createdCount: 1,
      matchedCount: 1,
      duplicateCount: 1,
      errorCount: 0,
    });
    expect(transactionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant: 'NÓMINA',
        type: 'income',
        statementImportId: 'import-1',
      }),
    );
  });
});
