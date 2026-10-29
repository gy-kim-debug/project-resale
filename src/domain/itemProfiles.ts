import { VALUATION_RULES } from '../content/valuation';
import { ITEM_PROFILES } from '../content/itemProfiles';
import type { Condition, Kind } from './game';

export function generatedCondition(kind: Kind, roll: number): Condition {
  const profile = ITEM_PROFILES[kind];
  return roll < profile.brokenChance
    ? '고장'
    : roll < profile.wornCutoff
      ? '사용감'
      : '양호';
}
export function conditionValuePercent(
  kind: Kind,
  condition: Condition,
): number {
  const p = ITEM_PROFILES[kind];
  return condition === '고장'
    ? p.brokenValuePercent
    : condition === '사용감'
      ? p.wornValuePercent
      : 100;
}
export function rarityBoostPercent(kind: Kind, roll: number): number {
  return Math.min(
    ITEM_PROFILES[kind].maxRarityPercent,
    roll >= 1 - VALUATION_RULES.jackpotChance
      ? VALUATION_RULES.jackpotPercent
      : roll >= 1 - VALUATION_RULES.jackpotChance - VALUATION_RULES.modestChance
        ? VALUATION_RULES.modestPercent
        : 100,
  );
}

export function conditionLabel(kind: Kind, condition: Condition): string {
  if (kind === '부동산')
    return condition === '고장'
      ? '큰 하자'
      : condition === '사용감'
        ? '수선 필요'
        : '양호';
  if (condition === '고장') {
    if (kind === '자동차') return '정비 필요';
    if (kind === '악기') return '연주 불가';
    if (kind === '가구' || kind === '수집품') return '파손';
  }
  return condition;
}
