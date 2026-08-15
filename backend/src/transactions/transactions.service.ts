import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta a tu PrismaService

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    amount: number;
    description?: string;
    merchant: string;
    type: string;
    isPlanned: boolean;
    userId: string;
    categoryId?: string;
  }) {
    return this.prisma.transaction.create({
      data: {
        amount: data.amount,
        description: data.description,
        merchant: data.merchant,
        type: data.type,
        isPlanned: data.isPlanned,
        userId: data.userId,
        categoryId: data.categoryId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }
}