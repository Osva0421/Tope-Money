import { BadRequestException } from '@nestjs/common';

export type StatementTransactionType = 'expense' | 'income';
export type StatementDateFormat = 'DMY' | 'MDY' | 'YMD';

export interface StatementColumnMapping {
  date?: string;
  merchant?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  type?: string;
  reference?: string;
}

export interface NormalizedStatementRow {
  rowNumber: number;
  date: Date;
  merchant: string;
  amount: number;
  type: StatementTransactionType;
  externalReference?: string;
  rawData: Record<string, string>;
}

export interface StatementRowError {
  rowNumber: number;
  message: string;
  rawData: Record<string, string>;
}

interface ParseOptions {
  mapping?: StatementColumnMapping;
  dateFormat?: StatementDateFormat;
  positiveAmountType?: StatementTransactionType;
}

const HEADER_ALIASES: Record<keyof StatementColumnMapping, string[]> = {
  date: ['FECHA', 'DATE', 'FECHA OPERACION', 'FECHA MOVIMIENTO'],
  merchant: [
    'DESCRIPCION',
    'DESCRIPTION',
    'CONCEPTO',
    'COMERCIO',
    'MERCHANT',
    'DETALLE',
    'MOVIMIENTO',
  ],
  amount: ['MONTO', 'AMOUNT', 'IMPORTE', 'CANTIDAD'],
  debit: ['CARGO', 'CARGOS', 'DEBITO', 'DEBIT', 'WITHDRAWAL', 'RETIRO'],
  credit: ['ABONO', 'ABONOS', 'CREDITO', 'CREDIT', 'DEPOSIT', 'DEPOSITO'],
  type: ['TIPO', 'TYPE', 'TIPO MOVIMIENTO'],
  reference: ['REFERENCIA', 'REFERENCE', 'FOLIO', 'ID MOVIMIENTO', 'CLAVE'],
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < firstLine.length; index += 1) {
      if (firstLine[index] === '"') quoted = !quoted;
      else if (!quoted && firstLine[index] === candidate) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function parseDelimitedText(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted)
    throw new BadRequestException('El CSV contiene una comilla sin cerrar');
  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function resolveColumn(
  headers: string[],
  key: keyof StatementColumnMapping,
  explicit?: string,
): number | null {
  const normalizedHeaders = headers.map(normalizeHeader);
  const requested = explicit ? normalizeHeader(explicit) : null;
  if (requested) {
    const index = normalizedHeaders.indexOf(requested);
    if (index < 0) {
      throw new BadRequestException(
        `No se encontró la columna configurada: ${explicit}`,
      );
    }
    return index;
  }

  const aliases = HEADER_ALIASES[key];
  const index = normalizedHeaders.findIndex((header) =>
    aliases.includes(header),
  );
  return index >= 0 ? index : null;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const negative = trimmed.startsWith('-') || /^\(.*\)$/.test(trimmed);
  let normalized = trimmed.replace(/[^0-9,.-]/g, '').replace(/-/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? /\./g : /,/g;
    normalized = normalized
      .replace(thousandsSeparator, '')
      .replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized =
      decimals === 2
        ? normalized.replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    if (decimals !== 2) normalized = normalized.replace(/\./g, '');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

function validUtcDate(year: number, month: number, day: number): Date | null {
  const fullYear = year < 100 ? 2000 + year : year;
  const result = new Date(Date.UTC(fullYear, month - 1, day, 12));
  return result.getUTCFullYear() === fullYear &&
    result.getUTCMonth() === month - 1 &&
    result.getUTCDate() === day
    ? result
    : null;
}

function parseDate(value: string, format: StatementDateFormat): Date | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (iso) return validUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const match = trimmed.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (!match) return null;
  if (format === 'MDY') {
    return validUtcDate(Number(match[3]), Number(match[1]), Number(match[2]));
  }
  if (format === 'YMD') {
    return validUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return validUtcDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

function typeFromLabel(value: string): StatementTransactionType | null {
  const normalized = normalizeHeader(value);
  if (
    [
      'ABONO',
      'CREDITO',
      'CREDIT',
      'DEPOSIT',
      'DEPOSITO',
      'INGRESO',
      'INCOME',
    ].some((token) => normalized.includes(token))
  ) {
    return 'income';
  }
  if (
    ['CARGO', 'DEBITO', 'DEBIT', 'COMPRA', 'GASTO', 'EXPENSE', 'RETIRO'].some(
      (token) => normalized.includes(token),
    )
  ) {
    return 'expense';
  }
  return null;
}

export function parseStatementCsv(
  content: string,
  options: ParseOptions = {},
): { rows: NormalizedStatementRow[]; errors: StatementRowError[] } {
  if (!content.trim())
    throw new BadRequestException('El contenido CSV está vacío');
  if (content.length > 5_000_000)
    throw new BadRequestException('El CSV supera el límite de 5 MB');

  const parsed = parseDelimitedText(
    content.replace(/^\uFEFF/, ''),
    detectDelimiter(content),
  );
  if (parsed.length < 2)
    throw new BadRequestException('El CSV no contiene movimientos');
  if (parsed.length > 10_001)
    throw new BadRequestException(
      'El CSV supera el límite de 10,000 movimientos',
    );

  const headers = parsed[0];
  const indexes = {
    date: resolveColumn(headers, 'date', options.mapping?.date),
    merchant: resolveColumn(headers, 'merchant', options.mapping?.merchant),
    amount: resolveColumn(headers, 'amount', options.mapping?.amount),
    debit: resolveColumn(headers, 'debit', options.mapping?.debit),
    credit: resolveColumn(headers, 'credit', options.mapping?.credit),
    type: resolveColumn(headers, 'type', options.mapping?.type),
    reference: resolveColumn(headers, 'reference', options.mapping?.reference),
  };

  if (indexes.date === null)
    throw new BadRequestException('No se encontró una columna de fecha');
  if (indexes.merchant === null)
    throw new BadRequestException(
      'No se encontró una columna de descripción o comercio',
    );
  if (
    indexes.amount === null &&
    indexes.debit === null &&
    indexes.credit === null
  ) {
    throw new BadRequestException(
      'No se encontró una columna de monto, cargo o abono',
    );
  }

  const rows: NormalizedStatementRow[] = [];
  const errors: StatementRowError[] = [];
  const dateFormat = options.dateFormat ?? 'DMY';
  const positiveAmountType = options.positiveAmountType ?? 'expense';

  for (let index = 1; index < parsed.length; index += 1) {
    const values = parsed[index];
    const rowNumber = index + 1;
    const rawData = Object.fromEntries(
      headers.map((header, column) => [header, values[column] ?? '']),
    );
    const date = parseDate(values[indexes.date] ?? '', dateFormat);
    const merchant = (values[indexes.merchant] ?? '').trim();

    let amount: number | null = null;
    let type: StatementTransactionType | null = null;
    const debit =
      indexes.debit === null ? null : parseAmount(values[indexes.debit] ?? '');
    const credit =
      indexes.credit === null
        ? null
        : parseAmount(values[indexes.credit] ?? '');

    if (debit !== null && debit !== 0) {
      amount = Math.abs(debit);
      type = 'expense';
    } else if (credit !== null && credit !== 0) {
      amount = Math.abs(credit);
      type = 'income';
    } else if (indexes.amount !== null) {
      const signedAmount = parseAmount(values[indexes.amount] ?? '');
      if (signedAmount !== null) {
        amount = Math.abs(signedAmount);
        type = signedAmount < 0 ? 'expense' : positiveAmountType;
      }
    }

    if (indexes.type !== null) {
      type = typeFromLabel(values[indexes.type] ?? '') ?? type;
    }

    const problems: string[] = [];
    if (!date) problems.push('fecha inválida');
    if (!merchant) problems.push('descripción vacía');
    if (amount === null || amount <= 0) problems.push('monto inválido');
    if (!type) problems.push('tipo de movimiento desconocido');

    if (problems.length > 0 || !date || !merchant || amount === null || !type) {
      errors.push({ rowNumber, message: problems.join(', '), rawData });
      continue;
    }

    rows.push({
      rowNumber,
      date,
      merchant,
      amount,
      type,
      externalReference:
        indexes.reference === null
          ? undefined
          : (values[indexes.reference] ?? '').trim() || undefined,
      rawData,
    });
  }

  return { rows, errors };
}
