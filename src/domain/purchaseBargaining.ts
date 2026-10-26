import { roundMoney, moneyRatio } from './money';
import type { Item, MarketId } from './game';
import { BARGAINING_MARKETS } from '../content/bargaining';
import { sellerProfile } from './listingTags';

export const bargainingMarket = (marketId?: MarketId) =>
  BARGAINING_MARKETS[
    marketId && marketId !== 'auction' && marketId !== 'aircraft'
      ? marketId
      : 'street'
  ];
export function openingPurchaseOffers(
  price: number,
  marketId?: MarketId,
): number[] {
  if (marketId === 'auction' || price === 0) return [];
  return [
    ...new Set(
      bargainingMarket(marketId).opening.map((percent) =>
        moneyRatio(price, percent),
      ),
    ),
  ].filter((p) => p > 0 && p < price);
}
export function purchaseProfile(item: Item) {
  const seller = sellerProfile(item);
  const market = bargainingMarket(item.marketId);
  const firm = item.listing?.facts.seller === 'firm';
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    ...seller,
    floorMin: firm ? 1 : clamp(seller.floorMin + market.floorShift),
    floorMax: firm ? 1 : clamp(seller.floorMax + market.floorShift),
    patienceMin: Math.min(6, seller.patienceMin + market.patienceBonus),
    patienceMax: Math.min(6, seller.patienceMax + market.patienceBonus),
    holdChance: firm ? 1 : clamp(seller.holdChance + market.holdShift),
  };
}
/** Uses visible price movement and round count only; hidden item value never enters. */
export function purchaseApproach(item: Item, price: number, round: number) {
  const market = bargainingMarket(item.marketId);
  const previous = item.purchaseBargain?.previousOffer ?? 0;
  const current = item.negotiatedPrice ?? item.price;
  const progress =
    previous > 0 && current > previous
      ? (price - previous) / (current - previous)
      : 0;
  const favorable =
    market.tactic === 'precise'
      ? price / current >= 0.9
      : market.tactic === 'gradual'
        ? previous > 0 && progress > 0 && progress <= 0.5
        : market.tactic === 'decisive'
          ? previous > 0 && progress >= 0.65
          : market.tactic === 'patient'
            ? round >= 3
            : false;
  const bonus = favorable
    ? market.tactic === 'precise'
      ? 0.4
      : market.tactic === 'patient'
        ? 0.8
        : 0.5
    : 0;
  return {
    favorable,
    concessionScale: market.concessionScale + bonus,
    holdReduction: favorable ? 0.15 : 0,
  };
}
export const canPurchaseOffer = (item: Item) =>
  item.marketId !== 'auction' &&
  item.price > 0 &&
  !item.chatSettled &&
  item.negotiation !== 'accepted' &&
  !(item.negotiation === 'rejected' && !item.purchaseBargain) &&
  (!item.purchaseBargain ||
    item.purchaseBargain.rounds < item.purchaseBargain.patience);

/** Visible counteroffers only: hidden item value never enters bargaining. */
export function nextPurchaseOffers(
  current: number,
  previous: number,
): number[] {
  const gap = current - previous;
  return [
    ...new Set(
      [0.25, 0.5, 0.75].map((share) => roundMoney(previous + gap * share)),
    ),
  ].filter((price) => price > previous && price < current);
}
