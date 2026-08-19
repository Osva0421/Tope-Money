import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @Body()
    body: {
      amount: number;
      description?: string;
      merchant: string;
      type: string;
      isPlanned: boolean;
      categoryId?: string;
      creditCardId?: string;
      date?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.transactionsService.create({ ...body, userId });
  }

  @Get()
  async findAll(@CurrentUserId() userId: string) {
    return this.transactionsService.findAllByUser(userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      amount?: number;
      merchant?: string;
      description?: string;
      isPlanned?: boolean;
      categoryId?: string;
      creditCardId?: string | null;
      date?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.transactionsService.updateTransaction(id, { ...body, userId });
  }
}
