export interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
}

// Palabras que suelen anteceder el monto final de un ticket.
const TOTAL_KEYWORDS = ['TOTAL', 'IMPORTE', 'A PAGAR', 'MONTO'];

// Encuentra números con forma de dinero, ej: 85.00, $85, 1,250.50
const MONEY_REGEX = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2})/;

function extractAmount(lines: string[]): number | null {
  // 1) Busca primero una línea que contenga una palabra clave de "total"
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (TOTAL_KEYWORDS.some((keyword) => upperLine.includes(keyword))) {
      const match = line.match(MONEY_REGEX);
      if (match) {
        return parseFloat(match[1].replace(',', ''));
      }
    }
  }

  // 2) Si no encontró ninguna línea con esas palabras, toma el número
  //    con forma de dinero más grande de todo el ticket (suele ser el total).
  let largest: number | null = null;
  for (const line of lines) {
    const match = line.match(MONEY_REGEX);
    if (match) {
      const value = parseFloat(match[1].replace(',', ''));
      if (largest === null || value > largest) {
        largest = value;
      }
    }
  }

  return largest;
}

function extractMerchant(lines: string[]): string | null {
  // El nombre del comercio casi siempre está en las primeras 1-3 líneas
  // del ticket, y no suele ser una línea que sea solo números o símbolos.
  for (const line of lines.slice(0, 3)) {
    const trimmed = line.trim();
    const isMostlyText = /[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}/.test(trimmed);
    if (trimmed.length > 0 && isMostlyText) {
      return trimmed;
    }
  }
  return null;
}

export function parseReceiptText(lines: string[]): ParsedReceipt {
  return {
    merchant: extractMerchant(lines),
    amount: extractAmount(lines),
  };
}
