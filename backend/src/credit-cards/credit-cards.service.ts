import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function utcDate(year: number, month: number, requestedDay: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(requestedDay, lastDay)));
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    name: string;
    creditLimit: number;
    statementDay: number;
    paymentDueDay: number;
    lastFourDigits?: string;
  }) {
    if (!Number.isFinite(data.creditLimit) || data.creditLimit <= 0) {
      throw new BadRequestException(
        'El límite de crédito debe ser mayor a cero',
      );
    }
    this.validateDay(data.statementDay, 'corte');
    this.validateDay(data.paymentDueDay, 'pago');
    if (data.lastFourDigits && !/^\d{4}$/.test(data.lastFourDigits)) {
      throw new BadRequestException(
        'Los últimos dígitos deben contener cuatro números',
      );
    }

    return this.prisma.creditCard.create({ data });
  }

  findAllByUser(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCycleAnalysis(cardId: string, userId: string, asOf = new Date()) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');

    const year = asOf.getUTCFullYear();
    const month = asOf.getUTCMonth();
    const closesThisMonth = utcDate(year, month, card.statementDay);
    const cycleEnd =
      asOf <= addUtcDays(closesThisMonth, 1)
        ? closesThisMonth
        : utcDate(year, month + 1, card.statementDay);
    const previousClose = utcDate(
      cycleEnd.getUTCFullYear(),
      cycleEnd.getUTCMonth() - 1,
      card.statementDay,
    );
    const cycleStart = addUtcDays(previousClose, 1);
    const endExclusive = addUtcDays(cycleEnd, 1);

    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: cycleStart, lt: endExclusive },
      },
      _sum: { amount: true },
    });

    const spent = aggregate._sum.amount ?? 0;
    const creditLimit = Number(card.creditLimit);
    const dueMonthOffset = card.paymentDueDay > card.statementDay ? 0 : 1;
    const paymentDate = utcDate(
      cycleEnd.getUTCFullYear(),
      cycleEnd.getUTCMonth() + dueMonthOffset,
      card.paymentDueDay,
    );

    return {
      cardId,
      cycleStart,
      cycleEnd,
      paymentDate,
      creditLimit,
      spent,
      remainingCredit: Math.max(creditLimit - spent, 0),
      utilizationPercent:
        creditLimit === 0
          ? 0
          : Number(((spent / creditLimit) * 100).toFixed(2)),
    };
  }

  async getAlerts(userId: string, asOf = new Date()) {
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('La fecha de consulta no es válida');
    }

    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const alerts = await Promise.all(
      cards.map(async (card) => {
        const year = asOf.getUTCFullYear();
        const month = asOf.getUTCMonth();
        const closeThisMonth = utcDate(year, month, card.statementDay);
        const lastClose =
          asOf >= closeThisMonth
            ? closeThisMonth
            : utcDate(year, month - 1, card.statementDay);
        const previousClose = utcDate(
          lastClose.getUTCFullYear(),
          lastClose.getUTCMonth() - 1,
          card.statementDay,
        );
        const dueMonthOffset = card.paymentDueDay > card.statementDay ? 0 : 1;
        const paymentDate = utcDate(
          lastClose.getUTCFullYear(),
          lastClose.getUTCMonth() + dueMonthOffset,
          card.paymentDueDay,
        );
        const amount = await this.sumExpensesForPeriod(
          userId,
          card.id,
          addUtcDays(previousClose, 1),
          addUtcDays(lastClose, 1),
        );
        const daysUntilPayment = Math.ceil(
          (paymentDate.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (amount <= 0 || daysUntilPayment < 0 || daysUntilPayment > 7) {
          return null;
        }

        return {
          type: 'PAYMENT_DUE',
          severity: daysUntilPayment <= 2 ? 'HIGH' : 'MEDIUM',
          cardId: card.id,
          cardName: card.name,
          paymentDate,
          daysUntilPayment,
          estimatedStatementAmount: Number(amount.toFixed(2)),
          message:
            daysUntilPayment === 0
              ? `El pago estimado de ${card.name} vence hoy.`
              : `Faltan ${daysUntilPayment} días para el pago estimado de ${card.name}.`,
          caveat:
            'El monto se estima con compras registradas y no descuenta pagos, devoluciones ni intereses.',
        };
      }),
    );

    return alerts.filter((alert) => alert !== null);
  }

  private async sumExpensesForPeriod(
    userId: string,
    cardId: string,
    start: Date,
    endExclusive: Date,
  ): Promise<number> {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: start, lt: endExclusive },
      },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  private validateDay(value: number, label: string) {
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      throw new BadRequestException(
        `El día de ${label} debe estar entre 1 y 31`,
      );
    }
  }
}
