import { moneyRatio } from './money';
import type { Item } from './game';
import { INSTANT_SALE_PERCENT } from '../content/rules';

/** Exact hundred-won rounding; market trends and asking/purchase prices have no effect. */
export const instantSalePrice = (item: Pick<Item, 'value'>) =>
  moneyRatio(item.value, INSTANT_SALE_PERCENT);
