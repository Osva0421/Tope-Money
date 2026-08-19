import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate?: string;
  }) {
    this.validateAmounts(data.targetAmount, data.currentAmount ?? 0);

    return this.prisma.goal.create({
      data: {
        userId: data.userId,
        name: data.name.trim(),
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount ?? 0,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateProgress(id: string, userId: string, currentAmount: number) {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Meta no encontrada');

    const targetAmount = Number(goal.targetAmount);
    this.validateAmounts(targetAmount, currentAmount);

    return this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount,
        status: currentAmount >= targetAmount ? 'COMPLETED' : 'ACTIVE',
      },
    });
  }

  async getProjection(id: string, userId: string, asOf = new Date()) {
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('La fecha de proyección no es válida');
    }

    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Meta no encontrada');

    const lookbackDays = 84;
    const lookbackStart = new Date(asOf);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - lookbackDays);
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: lookbackStart, lte: asOf } },
      select: { amount: true, type: true },
    });

    const netCashFlow = transactions.reduce(
      (total, transaction) =>
        transaction.type.toUpperCase() === 'INCOME'
          ? total + transaction.amount
          : total - transaction.amount,
      0,
    );
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const remainingAmount = Math.max(targetAmount - currentAmount, 0);
    const averageWeeklyAvailable = netCashFlow / (lookbackDays / 7);
    const projectedDays =
      remainingAmount === 0
        ? 0
        : averageWeeklyAvailable > 0
          ? Math.ceil((remainingAmount / averageWeeklyAvailable) * 7)
          : null;
    const projectedDate =
      projectedDays === null
        ? null
        : new Date(asOf.getTime() + projectedDays * 24 * 60 * 60 * 1000);
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

    return {
      goalId: id,
      asOf,
      progressPercent: Number(
        Math.min((currentAmount / targetAmount) * 100, 100).toFixed(2),
      ),
      remainingAmount: Number(remainingAmount.toFixed(2)),
      averageWeeklyAvailable: Number(averageWeeklyAvailable.toFixed(2)),
      projectedDays,
      projectedDate,
      targetDate,
      onTrack:
        targetDate && projectedDate
          ? projectedDate.getTime() <= targetDate.getTime()
          : null,
      dataQuality: {
        lookbackDays,
        transactionCount: transactions.length,
        hasPositivePace: averageWeeklyAvailable > 0,
      },
      assumptions: [
        'El ritmo usa el flujo neto de los últimos 84 días.',
        'La proyección supone que todo el flujo libre se destina a esta meta.',
      ],
    };
  }

  private validateAmounts(targetAmount: number, currentAmount: number) {
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      throw new BadRequestException('El monto objetivo debe ser mayor a cero');
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      throw new BadRequestException('El monto actual no puede ser negativo');
    }
  }
}
