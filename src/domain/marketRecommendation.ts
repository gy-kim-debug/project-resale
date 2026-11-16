import { MARKETS } from '../content/markets';
import type { MarketDefinition } from '../content/markets';

/** Highest entry price covered by cash; a suggestion, never an access gate. */
export function recommendedMarket(cash: number): MarketDefinition | undefined {
  if (!Number.isSafeInteger(cash) || cash < 0) return;
  return MARKETS.reduce<MarketDefinition | undefined>(
    (best, market) =>
      market.min <= cash && (!best || market.min > best.min) ? market : best,
    undefined,
  );
}
