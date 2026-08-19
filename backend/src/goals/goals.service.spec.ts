import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GoalsService', () => {
  let service: GoalsService;
  const prisma = {
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(GoalsService);
  });

  it('marks a goal as completed when progress reaches its target', async () => {
    prisma.goal.findFirst.mockResolvedValue({ targetAmount: 10000 });
    prisma.goal.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'goal-1', ...data }),
    );

    await expect(
      service.updateProgress('goal-1', 'user-1', 10000),
    ).resolves.toMatchObject({ status: 'COMPLETED' });
  });

  it('projects a goal using the recent weekly free cash flow', async () => {
    prisma.goal.findFirst.mockResolvedValue({
      id: 'goal-1',
      targetAmount: 12000,
      currentAmount: 2000,
      targetDate: new Date('2027-01-01T00:00:00.000Z'),
    });
    prisma.transaction.findMany.mockResolvedValue([
      { type: 'income', amount: 24000 },
      { type: 'expense', amount: 12000 },
    ]);

    const result = await service.getProjection(
      'goal-1',
      'user-1',
      new Date('2026-08-18T00:00:00.000Z'),
    );

    expect(result).toMatchObject({
      progressPercent: 16.67,
      remainingAmount: 10000,
      averageWeeklyAvailable: 1000,
      projectedDays: 70,
      onTrack: true,
    });
  });
});
