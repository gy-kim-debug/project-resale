import { VALUATION_RULES } from '../content/valuation';
import { moneyRatio } from './money';
import type { Item } from './game';
/** Independent stable draw: no new economic RNG draws, no appraisal rerolls. */
export function referenceValue(price: number, key: string): number {
  let hash = 2166136261;
  for (const c of key) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const { referenceMinPercent: min, referenceMaxPercent: max } =
    VALUATION_RULES;
  return Math.max(
    100,
    moneyRatio(price, min + ((hash >>> 0) % (max - min + 1))),
  );
}
export function capValue(value: number, reference?: number): number {
  return reference === undefined
    ? value
    : Math.min(value, moneyRatio(reference, VALUATION_RULES.maxBonusPercent));
}
/** Apply tag/rarity/case bonuses together, round once, and preserve downward multipliers. */
export function generatedBase(
  reference: number,
  feature: number,
  rarity: number,
  variant: number,
): number {
  const percent = Math.min(
    VALUATION_RULES.maxBonusPercent * 10000,
    feature * rarity * variant,
  );
  return Math.max(100, moneyRatio(reference, percent, 1000000));
}
export function boostedBase(
  item: Pick<Item, 'base' | 'valuationReference'>,
  percent: number,
): number {
  return capValue(moneyRatio(item.base, percent), item.valuationReference);
}
