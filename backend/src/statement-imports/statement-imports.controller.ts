import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StatementImportsService } from './statement-imports.service';
import {
  StatementColumnMapping,
  StatementDateFormat,
  StatementTransactionType,
} from './csv-statement.parser';
import { CurrentUserId } from '../auth/auth-user';

@Controller('statement-imports')
export class StatementImportsController {
  constructor(
    private readonly statementImportsService: StatementImportsService,
  ) {}

  @Post('csv')
  importCsv(
    @Body()
    body: {
      sourceName: string;
      fileName?: string;
      csv: string;
      mapping?: StatementColumnMapping;
      dateFormat?: StatementDateFormat;
      positiveAmountType?: StatementTransactionType;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.statementImportsService.importCsv({ ...body, userId });
  }

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.statementImportsService.listByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.statementImportsService.findOne(id, userId);
  }
}
