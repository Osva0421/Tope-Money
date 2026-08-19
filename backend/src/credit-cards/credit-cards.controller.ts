import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  create(
    @Body()
    body: {
      name: string;
      creditLimit: number;
      statementDay: number;
      paymentDueDay: number;
      lastFourDigits?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.creditCardsService.create({ ...body, userId });
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.creditCardsService.findAllByUser(userId);
  }

  @Get('alerts')
  getAlerts(@CurrentUserId() userId: string, @Query('asOf') asOf?: string) {
    return this.creditCardsService.getAlerts(
      userId,
      asOf ? new Date(asOf) : new Date(),
    );
  }

  @Get(':id/cycle')
  getCycle(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.creditCardsService.getCycleAnalysis(
      id,
      userId,
      asOf ? new Date(asOf) : new Date(),
    );
  }
}
