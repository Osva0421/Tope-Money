import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // Lista las categorías y, de paso, trae los datos del usuario dueño
  async getAllCategories() {
    return this.prisma.category.findMany({
      include: { user: true }, 
    });
  }

  // Crea una categoría asociada a un usuario
  async createCategory(data: { name: string; type: string; userId: string; icon?: string }) {
    return this.prisma.category.create({
      data,
    });
  }
}