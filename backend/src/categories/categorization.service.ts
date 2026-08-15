import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .toUpperCase()
    .trim();
}

@Injectable()
export class CategorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestCategory(userId: string, merchant: string): Promise<string | null> {
    const normalizedMerchant = normalize(merchant);

    const categories = await this.prisma.category.findMany({
      where: { userId, keywords: { isEmpty: false } },
    });

    let bestMatch: { categoryId: string; keywordLength: number } | null = null;

    for (const category of categories) {
      for (const keyword of category.keywords) {
        const normalizedKeyword = normalize(keyword);
        if (normalizedMerchant.includes(normalizedKeyword)) {
          if (!bestMatch || normalizedKeyword.length > bestMatch.keywordLength) {
            bestMatch = { categoryId: category.id, keywordLength: normalizedKeyword.length };
          }
        }
      }
    }

    return bestMatch?.categoryId ?? null;
  }

  async learnFromCorrection(categoryId: string, merchant: string): Promise<void> {
    const normalizedMerchant = normalize(merchant);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return;

    const alreadyKnown = category.keywords.some(
      (k) => normalize(k) === normalizedMerchant,
    );
    if (alreadyKnown) return;

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { keywords: { push: normalizedMerchant } },
    });
  }
}
