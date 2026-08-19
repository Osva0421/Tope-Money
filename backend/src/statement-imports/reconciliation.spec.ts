import { merchantSimilarity, normalizeMerchant } from './reconciliation';

describe('statement reconciliation helpers', () => {
  it('removes common bank noise from merchant descriptions', () => {
    expect(normalizeMerchant('Compra TDC OXXO 12345')).toBe('OXXO');
  });

  it('matches a bank description with the manually entered merchant', () => {
    expect(
      merchantSimilarity('COMPRA STARBUCKS 9981', 'Starbucks Reforma'),
    ).toBeGreaterThan(0.8);
  });
});
