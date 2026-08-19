import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_CATEGORY_TREE,
  DefaultCategoryTemplate,
} from './default-categories.seed';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  // Crea una categoría asociada a un usuario (uso manual, ej. "Otros" con texto libre)
  async createCategory(data: {
    name: string;
    type: string;
    nature: string;
    userId: string;
    icon?: string;
    parentId?: string;
  }) {
    if (data.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: data.parentId, userId: data.userId },
      });
      if (!parent) {
        throw new NotFoundException('Categoría superior no encontrada');
      }
    }
    return this.prisma.category.create({
      data,
    });
  }

  async updateCategory(
    id: string,
    userId: string,
    data: { keywords?: string[]; name?: string; icon?: string },
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // Crea el árbol completo de categorías por defecto para un usuario nuevo.
  // Se llama una sola vez, justo después de crear al usuario.
  async createDefaultCategoriesForUser(userId: string): Promise<void> {
    for (const rootTemplate of DEFAULT_CATEGORY_TREE) {
      await this.createCategoryFromTemplate(rootTemplate, userId, null);
    }
  }

  private async createCategoryFromTemplate(
    template: DefaultCategoryTemplate,
    userId: string,
    parentId: string | null,
  ): Promise<void> {
    const created = await this.prisma.category.create({
      data: {
        name: template.name,
        type: template.type,
        nature: template.nature,
        icon: template.icon,
        userId,
        parentId,
        keywords: template.keywords ?? [],
        isDefault: true,
      },
    });

    if (template.children) {
      for (const child of template.children) {
        await this.createCategoryFromTemplate(child, userId, created.id);
      }
    }
  }
}
