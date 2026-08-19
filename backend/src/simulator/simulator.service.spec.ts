import { Test, TestingModule } from '@nestjs/testing';
import { SimulatorService } from './simulator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SimulatorService', () => {
  let service: SimulatorService;
  const prisma = {
    transaction: { findMany: jest.fn() },
    goal: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SimulatorService);
  });

  it('shows how a recurring expense delays a goal', async () => {
    const history = [
      { amount: 30000, type: 'income' },
      { amount: 18000, type: 'expense' },
    ];
    prisma.transaction.findMany
      .mockResolvedValueOnce(history)
      .mockResolvedValueOnce(history);
    prisma.goal.findFirst.mockResolvedValue({
      targetAmount: 12000,
      currentAmount: 0,
    });

    const result = await service.simulate({
      userId: 'user-1',
      amount: 1000,
      direction: 'EXPENSE',
      frequency: 'MONTHLY',
      goalId: 'goal-1',
      asOf: '2026-08-18T00:00:00.000Z',
    });

    expect(result.baseline.monthlyFreeCash).toBe(4000);
    expect(result.result.monthlyFreeCash).toBe(3000);
    expect(result.goalImpact).toMatchObject({
      baselineMonths: 3,
      adjustedMonths: 4,
      monthDifference: 1,
    });
  });
});
