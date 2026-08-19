import { Body, Controller, Post } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post()
  simulate(
    @Body()
    body: {
      amount: number;
      direction: 'EXPENSE' | 'INCOME';
      frequency: 'ONE_TIME' | 'MONTHLY';
      goalId?: string;
      asOf?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.simulatorService.simulate({ ...body, userId });
  }
}
