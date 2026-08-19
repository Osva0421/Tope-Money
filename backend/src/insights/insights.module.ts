import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
