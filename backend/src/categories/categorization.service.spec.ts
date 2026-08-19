import { Test, TestingModule } from '@nestjs/testing';
import { CategorizationService } from './categorization.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategorizationService', () => {
  let service: CategorizationService;
  const prisma = {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorizationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategorizationService);
  });

  it('normalizes accents and chooses the most specific keyword', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'generic', keywords: ['CAFE'] },
      { id: 'specific', keywords: ['CAFE PUNTA'] },
    ]);

    await expect(
      service.suggestCategory('user-1', 'Café Punta del Cielo'),
    ).resolves.toBe('specific');
  });

  it('adds a normalized merchant only once', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'coffee',
      keywords: [],
    });
    prisma.category.findMany.mockResolvedValue([]);
    prisma.category.update.mockResolvedValue({});

    await service.learnFromCorrection('user-1', 'coffee', '  Café Central  ');

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'coffee' },
      data: { keywords: { push: 'CAFE CENTRAL' } },
    });
  });

  it('accepts a small typo in a known merchant', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'coffee', keywords: ['STARBUCKS'] },
    ]);

    await expect(
      service.suggestCategory('user-1', 'STARBUKS POLANCO'),
    ).resolves.toBe('coffee');
  });
});
