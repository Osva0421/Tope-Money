import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async createUser(data: { id?: string; email: string; name?: string }) {
    const user = await this.prisma.user.create({ data });

    // En cuanto se crea el usuario, se le arma su árbol de categorías base.
    await this.categoriesService.createDefaultCategoriesForUser(user.id);

    return user;
  }

  async syncAuthenticatedUser(data: {
    id: string;
    email: string;
    name?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { id: data.id },
      include: { _count: { select: { categories: true } } },
    });
    if (existing) {
      if (existing._count.categories === 0) {
        await this.categoriesService.createDefaultCategoriesForUser(data.id);
      }
      return existing;
    }

    return this.createUser(data);
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }
}
