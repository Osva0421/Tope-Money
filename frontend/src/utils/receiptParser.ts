export interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  date: string | null;
}

const TOTAL_KEYWORDS = ["TOTAL", "IMPORTE", "A PAGAR", "MONTO"];
const MERCHANT_NOISE = [
  "RFC",
  "TICKET",
  "FOLIO",
  "TEL",
  "FECHA",
  "CAJA",
  "SUCURSAL",
  "CLIENTE",
];
const MONEY_REGEX = /\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/g;

function moneyValues(line: string): number[] {
  return Array.from(line.matchAll(MONEY_REGEX))
    .filter((match) => match[0].includes("$") || match[1].includes("."))
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter(
      (value) => Number.isFinite(value) && value >= 0 && value < 10_000_000,
    );
}

function extractAmount(lines: string[]): number | null {
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    const isSubtotal = upperLine.includes("SUBTOTAL");
    if (
      !isSubtotal &&
      TOTAL_KEYWORDS.some((keyword) => upperLine.includes(keyword))
    ) {
      const values = moneyValues(line);
      if (values.length > 0) return Math.max(...values);
    }
  }

  const allValues = lines.flatMap(moneyValues);
  return allValues.length > 0 ? Math.max(...allValues) : null;
}

function extractMerchant(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();
    const isMostlyText = /[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]{3,}/.test(trimmed);
    const isNoise = MERCHANT_NOISE.some((word) => upper.startsWith(word));
    if (trimmed.length >= 3 && isMostlyText && !isNoise) return trimmed;
  }
  return null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${fullYear.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function extractDate(lines: string[]): string | null {
  for (const line of lines) {
    const dayFirst = line.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
    if (dayFirst) {
      const parsed = toIsoDate(
        Number(dayFirst[3]),
        Number(dayFirst[2]),
        Number(dayFirst[1]),
      );
      if (parsed) return parsed;
    }

    const yearFirst = line.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
    if (yearFirst) {
      const parsed = toIsoDate(
        Number(yearFirst[1]),
        Number(yearFirst[2]),
        Number(yearFirst[3]),
      );
      if (parsed) return parsed;
    }
  }
  return null;
}

export function parseReceiptText(lines: string[]): ParsedReceipt {
  return {
    merchant: extractMerchant(lines),
    amount: extractAmount(lines),
    date: extractDate(lines),
  };
}
