import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiService', () => {
  it('stays disabled and safe when no API key is configured', async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const service = new AiService({} as PrismaService);

    expect(service.getStatus()).toMatchObject({
      configured: false,
      mode: 'optional-fallback',
    });
    await expect(
      service.suggestCategory('user-1', 'Comercio nuevo', 'expense'),
    ).resolves.toBeNull();
    await expect(
      service.generateFinancialNarrative('user-1', {}),
    ).resolves.toBeNull();

    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  });
});
