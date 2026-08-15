import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories() {
    return this.prisma.category.findMany();
  }

  // Crea una categoría asociada a un usuario
  async createCategory(data: {
    name: string;
    type: string;
    userId: string;
    icon?: string;
    parentId?: string;
  }) {
    return this.prisma.category.create({
      data,
    });
  }

  async updateCategory(
    id: string,
    data: { keywords?: string[]; name?: string; icon?: string },
  ) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }
}
