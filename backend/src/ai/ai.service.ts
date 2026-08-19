import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

export type AiCategorySuggestion = {
  categoryId: string;
  confidence: number;
  reason: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  private readonly client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  constructor(private readonly prisma: PrismaService) {}

  getStatus() {
    return {
      configured: Boolean(this.client),
      model: this.model,
      mode: 'optional-fallback',
    };
  }

  async suggestCategory(
    userId: string,
    merchant: string,
    transactionType: string,
  ): Promise<AiCategorySuggestion | null> {
    if (!this.client || !merchant.trim()) return null;

    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        type: transactionType.toUpperCase(),
      },
      select: { id: true, name: true, nature: true },
      orderBy: { name: 'asc' },
    });
    if (categories.length === 0) return null;

    try {
      const response = await this.client.responses.create({
        model: this.model,
        store: false,
        safety_identifier: this.safetyIdentifier(userId),
        instructions:
          'Clasifica el comercio en una sola categoría de la lista. No inventes categorías. Responde únicamente con el JSON solicitado.',
        input: JSON.stringify({
          merchant: this.normalizeMerchant(merchant),
          transactionType: transactionType.toUpperCase(),
          categories,
        }),
        text: {
          format: {
            type: 'json_schema',
            name: 'category_suggestion',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                categoryId: {
                  type: 'string',
                  enum: categories.map((category) => category.id),
                },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                reason: { type: 'string' },
              },
              required: ['categoryId', 'confidence', 'reason'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.output_text) as AiCategorySuggestion;
      const allowedCategory = categories.some(
        (category) => category.id === parsed.categoryId,
      );
      if (!allowedCategory || parsed.confidence < 0.7) return null;

      return parsed;
    } catch {
      this.logger.warn(
        'La categorización con IA no estuvo disponible; se conservará la transacción sin categoría.',
      );
      return null;
    }
  }

  async generateFinancialNarrative(
    userId: string,
    summary: unknown,
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.responses.create({
        model: this.model,
        store: false,
        safety_identifier: this.safetyIdentifier(userId),
        instructions:
          'Redacta en español mexicano un análisis breve y claro de máximo 100 palabras. Usa exclusivamente las cifras recibidas; no recalcules ni inventes datos. Señala patrones, no des asesoría de inversión, crédito ni afirmaciones absolutas. Termina con una acción práctica y prudente.',
        input: JSON.stringify(summary),
      });
      return response.output_text.trim() || null;
    } catch {
      this.logger.warn(
        'La narrativa con IA no estuvo disponible; se usarán los mensajes deterministas.',
      );
      return null;
    }
  }

  private safetyIdentifier(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }

  private normalizeMerchant(merchant: string): string {
    return merchant
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9 ]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }
}
