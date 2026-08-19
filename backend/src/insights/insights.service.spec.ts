import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('InsightsService', () => {
  let service: InsightsService;
  const prisma = { transaction: { findMany: jest.fn() } };
  const ai = { generateFinancialNarrative: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: ai },
      ],
    }).compile();
    service = module.get(InsightsService);
  });

  it('falls back to deterministic messages when AI is not configured', async () => {
    prisma.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    ai.generateFinancialNarrative.mockResolvedValue(null);

    const result = await service.getNarrative('user-1');

    expect(result).toEqual({
      source: 'deterministic',
      message:
        'Registra o importa movimientos para empezar a generar análisis.',
    });
  });

  it('calculates cash flow, category totals and repeated small expenses', async () => {
    const cafe = {
      categoryId: 'cafe',
      category: {
        id: 'cafe',
        name: 'Café',
        icon: '☕',
        nature: 'DISCRETIONARY',
      },
      type: 'expense',
      amount: 80,
      merchant: 'Starbucks Reforma',
      isPlanned: false,
    };
    prisma.transaction.findMany
      .mockResolvedValueOnce([
        {
          categoryId: 'income',
          category: null,
          type: 'income',
          amount: 10000,
          merchant: 'Nómina',
          isPlanned: true,
        },
        cafe,
        cafe,
        cafe,
        {
          categoryId: 'rent',
          category: {
            id: 'rent',
            name: 'Renta',
            icon: '🏠',
            nature: 'ESSENTIAL',
          },
          type: 'expense',
          amount: 3000,
          merchant: 'Renta',
          isPlanned: true,
        },
      ])
      .mockResolvedValueOnce([{ type: 'expense', amount: 4000 }]);

    const result = await service.getSummary('user-1', 30, 200);

    expect(result.totals).toMatchObject({
      income: 10000,
      expenses: 3240,
      netCashFlow: 6760,
      savingsRatePercent: 67.6,
      expenseTrendPercent: -19,
    });
    expect(result.categories[0]).toMatchObject({ name: 'Renta', total: 3000 });
    expect(result.smallRecurringExpenses[0]).toMatchObject({
      merchant: 'STARBUCKS REFORMA',
      count: 3,
      total: 240,
      average: 80,
    });
  });

  it('returns a useful empty-state message without transactions', async () => {
    prisma.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getSummary('user-1');

    expect(result.messages).toEqual([
      'Registra o importa movimientos para empezar a generar análisis.',
    ]);
  });
});
