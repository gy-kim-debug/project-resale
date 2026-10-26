/** Currency ledger and calculation results use nearest 100 KRW, halves upward. */
export const MONEY_UNIT = 100;
const MAX_SAFE_UNIT =
  Math.floor(Number.MAX_SAFE_INTEGER / MONEY_UNIT) * MONEY_UNIT;
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER)
    throw Error('금액 범위를 벗어났습니다.');
  const rounded = Math.min(
    MAX_SAFE_UNIT,
    Math.round(Math.abs(amount) / MONEY_UNIT) * MONEY_UNIT,
  );
  return rounded === 0 ? 0 : Math.sign(amount) * rounded;
}
/** Integer ratios round once, with exact intermediates even for large KRW values. */
export function moneyRatio(
  amount: number,
  numerator: number,
  denominator = 100,
): number {
  const divisor = BigInt(denominator) * BigInt(MONEY_UNIT);
  return Number(
    ((BigInt(amount) * BigInt(numerator) + divisor / 2n) / divisor) *
      BigInt(MONEY_UNIT),
  );
}
export const isHundredWon = (amount: number) =>
  Number.isSafeInteger(amount) && amount >= 0 && amount % MONEY_UNIT === 0;
export const positivePrice = (amount: number) =>
  amount > 0 ? Math.max(MONEY_UNIT, roundMoney(amount)) : 0;
