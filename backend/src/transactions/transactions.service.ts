import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategorizationService } from '../categories/categorization.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizationService: CategorizationService,
  ) {}

  async create(data: {
    amount: number;
    description?: string;
    merchant: string;
    type: string;
    isPlanned: boolean;
    userId: string;
    categoryId?: string;
  }) {
    let categoryId: string | null = data.categoryId ?? null;
    let categoryAssignedBy: string | null = null;

    if (categoryId) {
      categoryAssignedBy = 'user';
      await this.categorizationService.learnFromCorrection(categoryId, data.merchant);
    } else {
      const suggested = await this.categorizationService.suggestCategory(
        data.userId,
        data.merchant,
      );
      if (suggested) {
        categoryId = suggested;
        categoryAssignedBy = 'rule';
      }
    }

    return this.prisma.transaction.create({
      data: { ...data, categoryId, categoryAssignedBy },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.transaction.findMany({ where: { userId } });
  }

  // Edición general: monto, comercio, descripción, previsto/imprevisto y/o categoría.
  // Cualquier combinación de estos campos es válida (todos opcionales).
  async updateTransaction(
    transactionId: string,
    data: {
      amount?: number;
      merchant?: string;
      description?: string;
      isPlanned?: boolean;
      categoryId?: string;
    },
  ) {
    const updateData: Record<string, unknown> = { ...data };

    if (data.categoryId) {
      updateData.categoryAssignedBy = 'user';
    }

    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    if (data.categoryId) {
      await this.categorizationService.learnFromCorrection(
        data.categoryId,
        transaction.merchant,
      );
    }

    return transaction;
  }
}
