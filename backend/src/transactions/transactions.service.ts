import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategorizationService } from '../categories/categorization.service';
import { AiService } from '../ai/ai.service';

function parseTransactionDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('La fecha de la transacción no es válida');
  }
  return parsed;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizationService: CategorizationService,
    private readonly aiService: AiService,
  ) {}

  async create(data: {
    amount: number;
    description?: string;
    merchant: string;
    type: string;
    isPlanned: boolean;
    userId: string;
    categoryId?: string;
    creditCardId?: string;
    date?: string;
    statementImportId?: string;
    externalReference?: string;
  }) {
    await this.validateOwnedReferences(
      data.userId,
      data.categoryId,
      data.creditCardId,
    );
    let categoryId: string | null = data.categoryId ?? null;
    let categoryAssignedBy: string | null = null;

    if (categoryId) {
      categoryAssignedBy = 'user';
      await this.categorizationService.learnFromCorrection(
        data.userId,
        categoryId,
        data.merchant,
      );
    } else {
      const suggested = await this.categorizationService.suggestCategory(
        data.userId,
        data.merchant,
      );
      if (suggested) {
        categoryId = suggested;
        categoryAssignedBy = 'rule';
      } else {
        const aiSuggestion = await this.aiService.suggestCategory(
          data.userId,
          data.merchant,
          data.type,
        );
        if (aiSuggestion) {
          categoryId = aiSuggestion.categoryId;
          categoryAssignedBy = 'ai';
        }
      }
    }

    const { date, ...transactionData } = data;
    return this.prisma.transaction.create({
      data: {
        ...transactionData,
        date: parseTransactionDate(date),
        categoryId,
        categoryAssignedBy,
      },
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
      userId: string;
      amount?: number;
      merchant?: string;
      description?: string;
      isPlanned?: boolean;
      categoryId?: string;
      creditCardId?: string | null;
      date?: string;
    },
  ) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId: data.userId },
    });
    if (!existing) throw new NotFoundException('Transacción no encontrada');

    await this.validateOwnedReferences(
      data.userId,
      data.categoryId,
      data.creditCardId ?? undefined,
    );

    const { userId, date, ...changes } = data;
    const updateData: Record<string, unknown> = {
      ...changes,
      ...(date ? { date: parseTransactionDate(date) } : {}),
    };

    if (data.categoryId) {
      updateData.categoryAssignedBy = 'user';
    }

    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    if (data.categoryId) {
      await this.categorizationService.learnFromCorrection(
        userId,
        data.categoryId,
        transaction.merchant,
      );
    }

    return transaction;
  }

  private async validateOwnedReferences(
    userId: string,
    categoryId?: string,
    creditCardId?: string,
  ) {
    const [category, creditCard] = await Promise.all([
      categoryId
        ? this.prisma.category.findFirst({ where: { id: categoryId, userId } })
        : Promise.resolve(null),
      creditCardId
        ? this.prisma.creditCard.findFirst({
            where: { id: creditCardId, userId },
          })
        : Promise.resolve(null),
    ]);
    if (categoryId && !category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (creditCardId && !creditCard) {
      throw new NotFoundException('Tarjeta no encontrada');
    }
  }
}
