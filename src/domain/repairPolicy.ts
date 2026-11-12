import type { Item, Kind } from './game';
import { MARKET_PRODUCTS } from '../content/marketProducts';
import {
  CATEGORY_REPAIR_MODE,
  PRODUCT_REPAIR_OVERRIDES,
  type RepairMode,
} from '../content/repairPolicies';

const categories = new Map(
  Object.values(MARKET_PRODUCTS)
    .flat()
    .map((p) => [`${p.kind}:${p.title}`, p.category]),
);
const legacyModes: Record<Kind, RepairMode> = {
  생활: 'general',
  디지털: 'electronics',
  가구: 'furniture',
  수집품: 'restoration',
  악기: 'instrument',
  자동차: 'vehicle',
  부동산: 'building',
  항공기: 'general',
};
/** Deterministic content lookup: no RNG, no new save flags and no UI labels. */
export function repairMode(
  item: Pick<Item, 'title' | 'kind' | 'category'>,
): RepairMode {
  if (Object.hasOwn(PRODUCT_REPAIR_OVERRIDES, item.title))
    return PRODUCT_REPAIR_OVERRIDES[item.title];
  const category =
    item.category ?? categories.get(`${item.kind}:${item.title}`);
  return category ? CATEGORY_REPAIR_MODE[category] : legacyModes[item.kind];
}
