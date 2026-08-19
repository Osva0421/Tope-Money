import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(
    @Body()
    body: {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      targetDate?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.goalsService.create({ ...body, userId });
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.goalsService.findAllByUser(userId);
  }

  @Get(':id/projection')
  getProjection(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.goalsService.getProjection(
      id,
      userId,
      asOf ? new Date(asOf) : new Date(),
    );
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() body: { currentAmount: number },
  ) {
    return this.goalsService.updateProgress(id, userId, body.currentAmount);
  }
}
