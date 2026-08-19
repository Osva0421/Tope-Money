import { BadRequestException } from '@nestjs/common';
import { parseStatementCsv } from './csv-statement.parser';

describe('parseStatementCsv', () => {
  it('parses Spanish semicolon-separated debit and credit columns', () => {
    const result = parseStatementCsv(
      [
        'Fecha;Descripción;Cargo;Abono;Referencia',
        '18/08/2026;"CAFÉ, CENTRAL";1.250,50;;ABC-1',
        '17/08/2026;NÓMINA;;20.000,00;ABC-2',
      ].join('\n'),
    );

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        merchant: 'CAFÉ, CENTRAL',
        amount: 1250.5,
        type: 'expense',
        externalReference: 'ABC-1',
      }),
      expect.objectContaining({
        rowNumber: 3,
        merchant: 'NÓMINA',
        amount: 20000,
        type: 'income',
      }),
    ]);
    expect(result.rows[0].date.toISOString()).toContain('2026-08-18');
  });

  it('uses signed amounts and an explicit type column', () => {
    const result = parseStatementCsv(
      [
        'date,description,amount,type',
        '2026-08-18,OXXO,-85.40,expense',
        '2026-08-15,DEPÓSITO,500.00,income',
      ].join('\n'),
      { dateFormat: 'YMD' },
    );

    expect(result.rows.map(({ amount, type }) => ({ amount, type }))).toEqual([
      { amount: 85.4, type: 'expense' },
      { amount: 500, type: 'income' },
    ]);
  });

  it('keeps invalid rows as reviewable errors', () => {
    const result = parseStatementCsv(
      [
        'Fecha,Concepto,Importe',
        '31/02/2026,TIENDA,100.00',
        '18/08/2026,,50.00',
      ].join('\n'),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        message: expect.stringContaining('fecha inválida'),
      }),
      expect.objectContaining({
        rowNumber: 3,
        message: expect.stringContaining('descripción vacía'),
      }),
    ]);
  });

  it('rejects files without required financial columns', () => {
    expect(() => parseStatementCsv('Fecha,Concepto\n18/08/2026,OXXO')).toThrow(
      BadRequestException,
    );
  });
});
