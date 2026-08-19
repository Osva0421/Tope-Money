import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from './credit-cards.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  const prisma = {
    creditCard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCardsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CreditCardsService);
  });

  it('calculates utilization for the active statement cycle', async () => {
    prisma.creditCard.findFirst.mockResolvedValue({
      id: 'card-1',
      creditLimit: 20000,
      statementDay: 10,
      paymentDueDay: 28,
    });
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

    const result = await service.getCycleAnalysis(
      'card-1',
      'user-1',
      new Date('2026-08-18T12:00:00.000Z'),
    );

    expect(result).toMatchObject({
      spent: 5000,
      remainingCredit: 15000,
      utilizationPercent: 25,
    });
    expect(result.cycleStart.toISOString()).toBe('2026-08-11T00:00:00.000Z');
    expect(result.cycleEnd.toISOString()).toBe('2026-09-10T00:00:00.000Z');
  });

  it('creates a payment reminder during the seven days before due date', async () => {
    prisma.creditCard.findMany.mockResolvedValue([
      {
        id: 'card-1',
        name: 'Tarjeta principal',
        statementDay: 10,
        paymentDueDay: 28,
      },
    ]);
    prisma.transaction.aggregate.mockResolvedValue({
      _sum: { amount: 3200 },
    });

    const result = await service.getAlerts(
      'user-1',
      new Date('2026-08-23T00:00:00.000Z'),
    );

    expect(result[0]).toMatchObject({
      type: 'PAYMENT_DUE',
      daysUntilPayment: 5,
      estimatedStatementAmount: 3200,
      severity: 'MEDIUM',
    });
  });
});
