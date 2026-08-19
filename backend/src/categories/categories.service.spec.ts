import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const prisma = {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a category with the supplied ownership data', async () => {
    const input = {
      name: 'Mascotas',
      type: 'EXPENSE',
      nature: 'OTHER',
      userId: 'user-1',
    };
    prisma.category.create.mockResolvedValue({ id: 'category-1', ...input });

    await expect(service.createCategory(input)).resolves.toMatchObject(input);
    expect(prisma.category.create).toHaveBeenCalledWith({ data: input });
  });
});
