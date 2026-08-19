import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const categories = { createDefaultCategoriesForUser: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CategoriesService, useValue: categories },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates the default category tree for a new user', async () => {
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    await service.createUser({ email: 'user@example.com' });

    expect(categories.createDefaultCategoriesForUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('syncs a Supabase user and seeds categories on first access', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'auth-user-1',
      email: 'auth@example.com',
    });

    await service.syncAuthenticatedUser({
      id: 'auth-user-1',
      email: 'auth@example.com',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { id: 'auth-user-1', email: 'auth@example.com' },
    });
    expect(categories.createDefaultCategoriesForUser).toHaveBeenCalledWith(
      'auth-user-1',
    );
  });
});
