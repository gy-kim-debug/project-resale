import { roundMoney } from './money';
import type { Game, Item } from './game';
import { marketValue } from './engine';

/** Older snapshots retain the exact agreed price; free finds have price zero. */
export const acquisitionCost = (item: Item) =>
  roundMoney(item.acquiredFor ?? item.negotiatedPrice ?? item.price);

export function compareItem(g: Game, item: Item) {
  const cost = acquisitionCost(item);
  const value = item.checked ? marketValue(g, item) : null;
  return { cost, value, difference: value === null ? null : value - cost };
}
