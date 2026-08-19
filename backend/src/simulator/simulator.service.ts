import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Direction = 'EXPENSE' | 'INCOME';
type Frequency = 'ONE_TIME' | 'MONTHLY';

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

@Injectable()
export class SimulatorService {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(data: {
    userId: string;
    amount: number;
    direction: Direction;
    frequency: Frequency;
    goalId?: string;
    asOf?: string;
  }) {
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw new BadRequestException(
        'El monto de la simulación debe ser mayor a cero',
      );
    }
    if (!['EXPENSE', 'INCOME'].includes(data.direction)) {
      throw new BadRequestException('La dirección debe ser EXPENSE o INCOME');
    }
    if (!['ONE_TIME', 'MONTHLY'].includes(data.frequency)) {
      throw new BadRequestException(
        'La frecuencia debe ser ONE_TIME o MONTHLY',
      );
    }

    const asOf = data.asOf ? new Date(data.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('La fecha de simulación no es válida');
    }

    const lookbackStart = new Date(asOf);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 90);

    const [recentTransactions, allTransactions, goal] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId: data.userId, date: { gte: lookbackStart, lte: asOf } },
        select: { amount: true, type: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId: data.userId, date: { lte: asOf } },
        select: { amount: true, type: true },
      }),
      data.goalId
        ? this.prisma.goal.findFirst({
            where: { id: data.goalId, userId: data.userId },
          })
        : Promise.resolve(null),
    ]);

    if (data.goalId && !goal) throw new NotFoundException('Meta no encontrada');

    const recent = this.summarize(recentTransactions);
    const historical = this.summarize(allTransactions);
    const averageMonthlyIncome = recent.income / 3;
    const averageMonthlyExpenses = recent.expense / 3;
    const baselineMonthlyFreeCash =
      averageMonthlyIncome - averageMonthlyExpenses;
    const signedAmount =
      data.direction === 'INCOME' ? data.amount : -data.amount;
    const adjustedMonthlyFreeCash =
      baselineMonthlyFreeCash +
      (data.frequency === 'MONTHLY' ? signedAmount : 0);
    const trackedBalance = historical.income - historical.expense;
    const balanceAfterScenario = trackedBalance + signedAmount;

    const goalImpact = goal
      ? this.projectGoal({
          targetAmount: Number(goal.targetAmount),
          currentAmount: Number(goal.currentAmount),
          baselineMonthlyFreeCash,
          adjustedMonthlyFreeCash,
          oneTimeAdjustment: data.frequency === 'ONE_TIME' ? signedAmount : 0,
          asOf,
        })
      : null;

    let riskLevel: 'SAFE' | 'CAUTION' | 'RISK' = 'SAFE';
    const warnings: string[] = [];
    if (balanceAfterScenario < 0 || adjustedMonthlyFreeCash < 0) {
      riskLevel = 'RISK';
      warnings.push(
        'El escenario deja un saldo o flujo mensual calculado en negativo.',
      );
    } else if (
      data.direction === 'EXPENSE' &&
      (data.amount > Math.max(baselineMonthlyFreeCash, 0) ||
        adjustedMonthlyFreeCash === 0)
    ) {
      riskLevel = 'CAUTION';
      warnings.push('El gasto supera el flujo libre mensual estimado.');
    }

    if (recentTransactions.length === 0) {
      warnings.push(
        'No hay historial reciente suficiente; la proyección será poco representativa.',
      );
    }

    return {
      asOf,
      scenario: {
        amount: data.amount,
        direction: data.direction,
        frequency: data.frequency,
      },
      baseline: {
        trackedBalance: roundMoney(trackedBalance),
        averageMonthlyIncome: roundMoney(averageMonthlyIncome),
        averageMonthlyExpenses: roundMoney(averageMonthlyExpenses),
        monthlyFreeCash: roundMoney(baselineMonthlyFreeCash),
      },
      result: {
        trackedBalance: roundMoney(balanceAfterScenario),
        monthlyFreeCash: roundMoney(adjustedMonthlyFreeCash),
        riskLevel,
        warnings,
      },
      goalImpact,
      assumptions: [
        'Los promedios mensuales usan los últimos 90 días divididos entre tres.',
        'El saldo rastreado solo considera transacciones registradas en Tope Money.',
        'El crédito disponible no se considera ingreso ni dinero libre.',
      ],
    };
  }

  private summarize(transactions: Array<{ amount: number; type: string }>) {
    return transactions.reduce(
      (totals, transaction) => {
        if (transaction.type.toUpperCase() === 'INCOME')
          totals.income += transaction.amount;
        else totals.expense += transaction.amount;
        return totals;
      },
      { income: 0, expense: 0 },
    );
  }

  private projectGoal(input: {
    targetAmount: number;
    currentAmount: number;
    baselineMonthlyFreeCash: number;
    adjustedMonthlyFreeCash: number;
    oneTimeAdjustment: number;
    asOf: Date;
  }) {
    const remaining = Math.max(input.targetAmount - input.currentAmount, 0);
    const baselineMonths = this.monthsToGoal(
      remaining,
      input.baselineMonthlyFreeCash,
    );
    const adjustedRemaining = Math.max(remaining - input.oneTimeAdjustment, 0);
    const adjustedMonths = this.monthsToGoal(
      adjustedRemaining,
      input.adjustedMonthlyFreeCash,
    );

    return {
      remainingAmount: roundMoney(remaining),
      baselineMonths,
      adjustedMonths,
      baselineDate:
        baselineMonths === null ? null : addMonths(input.asOf, baselineMonths),
      adjustedDate:
        adjustedMonths === null ? null : addMonths(input.asOf, adjustedMonths),
      monthDifference:
        baselineMonths === null || adjustedMonths === null
          ? null
          : adjustedMonths - baselineMonths,
    };
  }

  private monthsToGoal(
    remaining: number,
    monthlyFreeCash: number,
  ): number | null {
    if (remaining <= 0) return 0;
    if (monthlyFreeCash <= 0) return null;
    return Math.ceil(remaining / monthlyFreeCash);
  }
}
