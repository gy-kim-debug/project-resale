import type { Item } from './game';
import { INSTANT_SALE_PERCENT } from '../content/rules';

/** Exact won rounding; market trends and asking/purchase prices have no effect. */
export const instantSalePrice = (item: Pick<Item, 'value'>) =>
  Number((BigInt(item.value) * BigInt(INSTANT_SALE_PERCENT)) / 100n);
