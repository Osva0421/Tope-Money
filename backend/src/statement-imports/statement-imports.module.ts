import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { StatementImportsController } from './statement-imports.controller';
import { StatementImportsService } from './statement-imports.service';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [StatementImportsController],
  providers: [StatementImportsService],
})
export class StatementImportsModule {}
