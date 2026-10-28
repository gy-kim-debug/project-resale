import { SALE_FLOW } from '../content/saleFlow';

/** Current market value affects demand; hunger, health and fatigue do not exist. */
export function saleInquiryChance(price: number, marketValue: number): number {
  const ratio = marketValue > 0 ? price / marketValue : Infinity;
  return (
    SALE_FLOW.priceBands.find((band) => ratio <= band.maxRatio)?.chance ??
    SALE_FLOW.overpricedChance
  );
}
