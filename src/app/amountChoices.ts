import { MONEY_UNIT, moneyRatio, roundMoney } from '../domain/money';
export interface AmountPreset {
  label: string;
  amount: number | null;
}
/** Only visible amounts enter UI choices; unknown values never become price hints. */
export function selectableAmounts(
  presets: AmountPreset[],
  min: number,
  max: number,
) {
  const seen = new Set<number>();
  return presets.flatMap((p) => {
    if (p.amount === null || !Number.isSafeInteger(p.amount) || p.amount < 0)
      return [];
    const amount = roundMoney(p.amount);
    if (amount < min || amount > max || seen.has(amount)) return [];
    seen.add(amount);
    return [{ label: p.label, amount }];
  });
}
export function repaymentPresets(
  available: number,
  required: number,
): AmountPreset[] {
  return [
    ...(required > 0 && required <= available
      ? [{ label: '남은 의무 원금', amount: required }]
      : []),
    ...[10, 25, 50, 75, 100].map((percent) => ({
      label: percent === 100 ? '상환 가능액 전부' : `상환 가능액 ${percent}%`,
      amount: moneyRatio(available, percent),
    })),
  ];
}
export function listingPresets(
  currentValue: number | null,
  purchaseCost: number,
  marketMin: number,
): AmountPreset[] {
  if (currentValue !== null && currentValue > 0)
    return [
      { label: '현재 가치', amount: currentValue },
      ...[60, 80, 120, 150, 200].map((percent) => ({
        label: `현재 가치 ${percent}%`,
        amount: moneyRatio(currentValue, percent),
      })),
      ...(purchaseCost > 0 ? [{ label: '매입가', amount: purchaseCost }] : []),
    ];
  if (currentValue === 0)
    return [
      { label: '최소 가격', amount: MONEY_UNIT },
      ...(purchaseCost > 0 ? [{ label: '매입가', amount: purchaseCost }] : []),
    ];
  if (purchaseCost > 0)
    return [
      { label: '매입가', amount: purchaseCost },
      ...[60, 80, 120, 150, 200].map((percent) => ({
        label: `매입가 ${percent}%`,
        amount: moneyRatio(purchaseCost, percent),
      })),
    ];
  return [50, 100, 200, 500, 1000].map((percent) => ({
    label: '희망 가격',
    amount: moneyRatio(marketMin, percent),
  }));
}
