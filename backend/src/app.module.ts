import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './users/user.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { GoalsModule } from './goals/goals.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { SimulatorModule } from './simulator/simulator.module';
import { StatementImportsModule } from './statement-imports/statement-imports.module';
import { InsightsModule } from './insights/insights.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    CategoriesModule,
    TransactionsModule,
    GoalsModule,
    CreditCardsModule,
    SimulatorModule,
    StatementImportsModule,
    InsightsModule,
    AiModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useExisting: SupabaseAuthGuard }],
})
export class AppModule {}
