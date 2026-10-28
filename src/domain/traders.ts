import { traderById, TRADER_STYLES } from '../content/traders';
import type { Item, Inquiry } from './game';
import { moneyRatio } from './money';

export const traderStyle = (
  entity: Pick<Item, 'traderId'> | Pick<Inquiry, 'traderId'>,
) => traderById(entity.traderId)?.style;
export const buyerWalkChance = (q: Inquiry) =>
  TRADER_STYLES[traderStyle(q) ?? 'ordinary'].walkChance;
export function buyerTerms(
  traderId: string,
  asking: number,
  max: number,
  opening: number,
) {
  const rules = TRADER_STYLES[traderById(traderId)?.style ?? 'ordinary'];
  const cap = Math.min(asking, max);
  const price =
    rules.buyerOpeningPercent === null
      ? opening
      : Math.max(100, moneyRatio(cap, rules.buyerOpeningPercent));
  return { price, max: rules.buyerFixed ? price : max };
}
