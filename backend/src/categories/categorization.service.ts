import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}

function editSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function fuzzyKeywordScore(merchant: string, keyword: string): number {
  if (!keyword) return 0;
  if (merchant.includes(keyword)) return 1000 + keyword.length;

  const merchantTokens = merchant.split(' ');
  const keywordTokens = keyword.split(' ');
  const tokenScores = keywordTokens.map((keywordToken) =>
    Math.max(
      ...merchantTokens.map((merchantToken) =>
        editSimilarity(keywordToken, merchantToken),
      ),
    ),
  );
  const average =
    tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length;

  return tokenScores.every((score) => score >= 0.8)
    ? average * 100 + keyword.length / 1000
    : 0;
}

@Injectable()
export class CategorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestCategory(
    userId: string,
    merchant: string,
  ): Promise<string | null> {
    const normalizedMerchant = normalize(merchant);

    const categories = await this.prisma.category.findMany({
      where: { userId, keywords: { isEmpty: false } },
    });

    let bestMatch: { categoryId: string; score: number } | null = null;

    for (const category of categories) {
      for (const keyword of category.keywords) {
        const normalizedKeyword = normalize(keyword);
        const score = fuzzyKeywordScore(normalizedMerchant, normalizedKeyword);
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { categoryId: category.id, score };
        }
      }
    }

    return bestMatch?.categoryId ?? null;
  }

  async learnFromCorrection(
    userId: string,
    categoryId: string,
    merchant: string,
  ): Promise<void> {
    const normalizedMerchant = normalize(merchant);
    if (!normalizedMerchant) return;

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) return;

    const conflictingCategories = await this.prisma.category.findMany({
      where: {
        userId,
        id: { not: categoryId },
        keywords: { has: normalizedMerchant },
      },
    });
    await Promise.all(
      conflictingCategories.map((conflictingCategory) =>
        this.prisma.category.update({
          where: { id: conflictingCategory.id },
          data: {
            keywords: conflictingCategory.keywords.filter(
              (keyword) => normalize(keyword) !== normalizedMerchant,
            ),
          },
        }),
      ),
    );

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
