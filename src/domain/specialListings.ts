import { chooseTrader } from '../content/traders';
import { ACTION_TICK, type Item } from './game';
import { TAG_RULES } from '../content/listingTags';
import {
  SPECIAL_LISTINGS,
  type SpecialListingId,
} from '../content/specialListings';
import { moneyRatio } from './money';
import { openingPurchaseOffers } from './purchaseBargaining';

export function specialAsking(item: Item, id: SpecialListingId, min: number) {
  return Math.max(
    min,
    moneyRatio(item.price, SPECIAL_LISTINGS[id].pricePercent),
  );
}
export function applySpecialListing(
  original: Item,
  id: SpecialListingId,
  min: number,
): Item {
  if (
    !original.listing ||
    original.special ||
    original.price === 0 ||
    original.auction ||
    original.chat ||
    original.purchaseBargain ||
    original.negotiation !== 'none' ||
    !SPECIAL_LISTINGS[id].markets.includes(original.marketId ?? 'street')
  )
    throw Error('새 일반 매물에만 특별 매물을 적용할 수 있습니다.');
  const item = structuredClone(original);
  item.special = id;
  item.description = SPECIAL_LISTINGS[id].description;
  item.price = specialAsking(item, id, min);
  if (id === 'collector' && item.listing!.facts.authentic) {
    item.base = moneyRatio(item.base, 200);
    item.value = moneyRatio(item.value, 200);
  }
  if (id === 'clearance') {
    if (!['urgent', 'moving'].includes(original.listing!.facts.seller))
      item.expires = Math.max(
        0,
        item.expires -
          (TAG_RULES.normalLifetimeActions - TAG_RULES.shortLifetimeActions) *
            ACTION_TICK,
      );
    item.listing!.facts.seller = 'urgent';
    if (item.traderId) {
      const trader = chooseTrader(item.id, 'urgent');
      item.traderId = trader.id;
      item.seller = trader.name;
    }
    item.listing!.tags = [...item.listing!.tags.slice(0, 2), 'urgent'];
  }
  item.offers = openingPurchaseOffers(item.price, item.marketId);
  return item;
}
