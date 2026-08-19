import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeMerchant } from '../statement-imports/reconciliation';
import { AiService } from '../ai/ai.service';

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function isIncome(type: string): boolean {
  return type.toUpperCase() === 'INCOME';
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getNarrative(userId: string, periodDays = 30) {
    const summary = await this.getSummary(userId, periodDays);
    const aiNarrative = await this.aiService.generateFinancialNarrative(
      userId,
      summary,
    );

    return {
      source: aiNarrative ? 'ai' : 'deterministic',
      message: aiNarrative ?? summary.messages.join(' '),
    };
  }

  async getSummary(userId: string, periodDays = 30, smallExpenseLimit = 200) {
    if (!Number.isInteger(periodDays) || periodDays < 7 || periodDays > 366) {
      throw new BadRequestException('El periodo debe estar entre 7 y 366 días');
    }
    if (
      !Number.isFinite(smallExpenseLimit) ||
      smallExpenseLimit <= 0 ||
      smallExpenseLimit > 2000
    ) {
      throw new BadRequestException(
        'El límite de gasto pequeño debe estar entre 0 y 2,000',
      );
    }

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setUTCDate(currentStart.getUTCDate() - periodDays);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - periodDays);

    const [current, previous] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: currentStart, lte: now } },
        include: {
          category: {
            select: { id: true, name: true, icon: true, nature: true },
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: previousStart, lt: currentStart } },
        select: { amount: true, type: true },
      }),
    ]);

    const income = current.filter((transaction) => isIncome(transaction.type));
    const expenses = current.filter(
      (transaction) => !isIncome(transaction.type),
    );
    const totalIncome = income.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const previousExpenses = previous
      .filter((transaction) => !isIncome(transaction.type))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : null;
    const expenseTrendPercent =
      previousExpenses > 0
        ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
        : null;

    const categoryMap = new Map<
      string,
      {
        categoryId: string | null;
        name: string;
        icon: string | null;
        nature: string | null;
        total: number;
        count: number;
      }
    >();
    for (const transaction of expenses) {
      const key = transaction.categoryId ?? 'uncategorized';
      const currentCategory = categoryMap.get(key) ?? {
        categoryId: transaction.categoryId,
        name: transaction.category?.name ?? 'Sin categoría',
        icon: transaction.category?.icon ?? null,
        nature: transaction.category?.nature ?? null,
        total: 0,
        count: 0,
      };
      currentCategory.total += transaction.amount;
      currentCategory.count += 1;
      categoryMap.set(key, currentCategory);
    }
    const categories = Array.from(categoryMap.values())
      .map((category) => ({
        ...category,
        total: roundMoney(category.total),
        percentage:
          totalExpenses > 0
            ? Number(((category.total / totalExpenses) * 100).toFixed(2))
            : 0,
      }))
      .sort((left, right) => right.total - left.total);

    const smallExpenseGroups = new Map<
      string,
      { merchant: string; category: string; count: number; total: number }
    >();
    for (const transaction of expenses.filter(
      (item) => item.amount <= smallExpenseLimit,
    )) {
      const merchant = normalizeMerchant(transaction.merchant);
      const key = `${merchant}|${transaction.categoryId ?? ''}`;
      const group = smallExpenseGroups.get(key) ?? {
        merchant,
        category: transaction.category?.name ?? 'Sin categoría',
        count: 0,
        total: 0,
      };
      group.count += 1;
      group.total += transaction.amount;
      smallExpenseGroups.set(key, group);
    }
    const smallRecurringExpenses = Array.from(smallExpenseGroups.values())
      .filter((group) => group.count >= 3)
      .map((group) => ({
        ...group,
        total: roundMoney(group.total),
        average: roundMoney(group.total / group.count),
        percentageOfExpenses:
          totalExpenses > 0
            ? Number(((group.total / totalExpenses) * 100).toFixed(2))
            : 0,
      }))
      .sort((left, right) => right.total - left.total);

    const plannedExpenses = expenses
      .filter((transaction) => transaction.isPlanned)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const unplannedExpenses = totalExpenses - plannedExpenses;
    const messages = this.createMessages({
      totalIncome,
      totalExpenses,
      savingsRate,
      expenseTrendPercent,
      topCategory: categories[0],
      smallRecurringExpenses,
    });

    return {
      period: { days: periodDays, start: currentStart, end: now },
      totals: {
        income: roundMoney(totalIncome),
        expenses: roundMoney(totalExpenses),
        netCashFlow: roundMoney(netCashFlow),
        savingsRatePercent:
          savingsRate === null ? null : Number(savingsRate.toFixed(2)),
        expenseTrendPercent:
          expenseTrendPercent === null
            ? null
            : Number(expenseTrendPercent.toFixed(2)),
      },
      planning: {
        plannedExpenses: roundMoney(plannedExpenses),
        unplannedExpenses: roundMoney(unplannedExpenses),
      },
      categories,
      smallRecurringExpenses,
      messages,
      dataQuality: {
        transactionCount: current.length,
        uncategorizedCount: current.filter(
          (transaction) => !transaction.categoryId,
        ).length,
        hasPreviousPeriod: previous.length > 0,
      },
    };
  }

  private createMessages(input: {
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number | null;
    expenseTrendPercent: number | null;
    topCategory?: { name: string; percentage: number };
    smallRecurringExpenses: Array<{
      merchant: string;
      count: number;
      total: number;
    }>;
  }): string[] {
    const messages: string[] = [];
    if (input.totalIncome === 0 && input.totalExpenses === 0) {
      return [
        'Registra o importa movimientos para empezar a generar análisis.',
      ];
    }
    if (input.savingsRate !== null && input.savingsRate >= 20) {
      messages.push(
        `Tu flujo libre fue de ${input.savingsRate.toFixed(1)}% de tus ingresos en este periodo.`,
      );
    } else if (input.savingsRate !== null && input.savingsRate < 0) {
      messages.push(
        'Tus gastos superaron tus ingresos registrados en este periodo.',
      );
    }
    if (input.expenseTrendPercent !== null && input.expenseTrendPercent > 10) {
      messages.push(
        `Tus gastos aumentaron ${input.expenseTrendPercent.toFixed(1)}% frente al periodo anterior.`,
      );
    } else if (
      input.expenseTrendPercent !== null &&
      input.expenseTrendPercent < -10
    ) {
      messages.push(
        `Tus gastos bajaron ${Math.abs(input.expenseTrendPercent).toFixed(1)}% frente al periodo anterior.`,
      );
    }
    if (input.topCategory) {
      messages.push(
        `${input.topCategory.name} concentró ${input.topCategory.percentage.toFixed(1)}% de tus gastos.`,
      );
    }
    if (input.smallRecurringExpenses.length > 0) {
      const top = input.smallRecurringExpenses[0];
      messages.push(
        `${top.merchant} aparece ${top.count} veces en gastos pequeños y suma $${top.total.toFixed(2)}.`,
      );
    }
    return messages;
  }
}
