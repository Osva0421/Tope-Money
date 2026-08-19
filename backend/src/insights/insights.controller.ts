import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('summary')
  getSummary(
    @CurrentUserId() userId: string,
    @Query('periodDays') periodDays?: string,
    @Query('smallExpenseLimit') smallExpenseLimit?: string,
  ) {
    return this.insightsService.getSummary(
      userId,
      periodDays ? Number(periodDays) : 30,
      smallExpenseLimit ? Number(smallExpenseLimit) : 200,
    );
  }

  @Get('narrative')
  getNarrative(
    @CurrentUserId() userId: string,
    @Query('periodDays') periodDays?: string,
  ) {
    return this.insightsService.getNarrative(
      userId,
      periodDays ? Number(periodDays) : 30,
    );
  }
}
