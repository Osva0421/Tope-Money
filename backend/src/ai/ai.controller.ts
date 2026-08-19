import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai.service';
import { Public } from '../auth/public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @Public()
  getStatus() {
    return this.aiService.getStatus();
  }
}
