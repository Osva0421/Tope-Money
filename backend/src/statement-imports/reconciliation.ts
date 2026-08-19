const NOISE_TOKENS = new Set([
  'COMPRA',
  'PAGO',
  'CARGO',
  'ABONO',
  'TARJETA',
  'TDC',
  'POS',
  'SPEI',
  'TRANSACCION',
]);

export function normalizeMerchant(value: string): string {
  const tokens = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter(
      (token) =>
        token.length > 1 && !/^\d+$/.test(token) && !NOISE_TOKENS.has(token),
    );
  return tokens.join(' ') || value.trim().toUpperCase();
}

function editSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
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

export function merchantSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeMerchant(left);
  const normalizedRight = normalizeMerchant(right);
  if (normalizedLeft === normalizedRight) return 1;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
    return 0.95;

  const leftTokens = normalizedLeft.split(' ');
  const rightTokens = normalizedRight.split(' ');
  const shorter =
    leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longer = shorter === leftTokens ? rightTokens : leftTokens;
  const scores = shorter.map((token) =>
    Math.max(...longer.map((candidate) => editSimilarity(token, candidate))),
  );
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
