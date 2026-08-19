import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategorizationService } from '../categories/categorization.service';
import { AiService } from '../ai/ai.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  const prisma = {
    category: { findFirst: jest.fn() },
    creditCard: { findFirst: jest.fn() },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const categorization = {
    suggestCategory: jest.fn(),
    learnFromCorrection: jest.fn(),
  };
  const ai = { suggestCategory: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    ai.suggestCategory.mockResolvedValue(null);
    prisma.category.findFirst.mockResolvedValue({ id: 'coffee' });
    prisma.creditCard.findFirst.mockResolvedValue({ id: 'card-1' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CategorizationService, useValue: categorization },
        { provide: AiService, useValue: ai },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('uses AI only when no learned rule matches', async () => {
    categorization.suggestCategory.mockResolvedValue(null);
    ai.suggestCategory.mockResolvedValue({
      categoryId: 'restaurants',
      confidence: 0.88,
      reason: 'El comercio parece ser un restaurante.',
    });
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'tx-ai', ...data }),
    );

    const result = await service.create({
      amount: 250,
      merchant: 'Comercio nuevo',
      type: 'expense',
      isPlanned: false,
      userId: 'user-1',
    });

    expect(ai.suggestCategory).toHaveBeenCalledWith(
      'user-1',
      'Comercio nuevo',
      'expense',
    );
    expect(result).toMatchObject({
      categoryId: 'restaurants',
      categoryAssignedBy: 'ai',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses a rule suggestion when the user did not choose a category', async () => {
    const input = {
      amount: 95,
      merchant: 'Starbucks Reforma',
      type: 'expense',
      isPlanned: false,
      userId: 'user-1',
    };
    categorization.suggestCategory.mockResolvedValue('coffee');
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'tx-1', ...data }),
    );

    const result = await service.create(input);

    expect(result).toMatchObject({
      categoryId: 'coffee',
      categoryAssignedBy: 'rule',
    });
    expect(categorization.learnFromCorrection).not.toHaveBeenCalled();
  });

  it('learns from a category explicitly selected by the user', async () => {
    const input = {
      amount: 95,
      merchant: 'Café local',
      type: 'expense',
      isPlanned: false,
      userId: 'user-1',
      categoryId: 'coffee',
    };
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'tx-2', ...data }),
    );

    const result = await service.create(input);

    expect(categorization.learnFromCorrection).toHaveBeenCalledWith(
      'user-1',
      'coffee',
      'Café local',
    );
    expect(result).toMatchObject({ categoryAssignedBy: 'user' });
  });
});
