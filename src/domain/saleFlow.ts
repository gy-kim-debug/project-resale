import { ITEM_PROFILES } from '../content/itemProfiles';
import type { Kind } from './game';
import { SALE_FLOW } from '../content/saleFlow';

/** Current market value affects demand; hunger, health and fatigue do not exist. */
export function saleInquiryChance(
  price: number,
  marketValue: number,
  kind?: Kind,
): number {
  const ratio = marketValue > 0 ? price / marketValue : Infinity;
  const base =
    SALE_FLOW.priceBands.find((band) => ratio <= band.maxRatio)?.chance ??
    SALE_FLOW.overpricedChance;
  return kind
    ? Math.min(
        0.95,
        Math.max(0.01, (base * ITEM_PROFILES[kind].demandPercent) / 100),
      )
    : base;
}
