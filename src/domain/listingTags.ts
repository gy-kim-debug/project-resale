import { MARKET_PRICING } from '../content/market';
import type { Item, Kind, ListingInfo, ListingTag, SellerTrait } from './game';
import {
  FEATURE_TAGS,
  KIND_TAGS,
  SELLER_TAGS,
  TAG_RULES,
  SELLER_PROFILES,
} from '../content/listingTags';

export function createListingInfo(
  kind: Kind,
  random: () => number,
  free = false,
): ListingInfo {
  const feature = FEATURE_TAGS[Math.floor(random() * FEATURE_TAGS.length)];
  const truth = random() < TAG_RULES.truthChance;
  const facts: ListingInfo['facts'] = {
    authentic:
      feature === 'authentic'
        ? truth
        : feature === 'replica'
          ? !truth
          : random() < TAG_RULES.unclaimedAuthenticChance,
    limited: feature === 'limited' && truth,
    discontinued: feature === 'discontinued' && truth,
    vintage: feature === 'vintage' && truth,
    seller: 'ordinary',
  };
  const tags: ListingTag[] = [KIND_TAGS[kind], feature];
  if (!free) {
    const seller = SELLER_TAGS[Math.floor(random() * SELLER_TAGS.length)];
    const trueSeller = random() < TAG_RULES.truthChance;
    tags.push(seller as ListingTag);
    facts.seller = trueSeller
      ? seller
      : seller === 'firm'
        ? 'negotiable'
        : seller === 'negotiable'
          ? 'firm'
          : 'ordinary';
  }
  return { tags, facts };
}
export function sellerProfile(item: Item) {
  return SELLER_PROFILES[item.listing?.facts.seller ?? 'ordinary'];
}
export function listingValuePercent(info: ListingInfo): number {
  const f = info.facts;
  if (!f.authentic) return TAG_RULES.replicaValuePercent;
  if (f.limited) return TAG_RULES.limitedValuePercent;
  if (f.discontinued) return TAG_RULES.discontinuedValuePercent;
  if (f.vintage) return TAG_RULES.vintageValuePercent;
  return 100;
}
/** Findings are revealed only by appraisal in UI and result logs. */
export function listingFindings(item: Item): string[] {
  if (!item.listing) return [];
  const { facts, tags } = item.listing;
  const findings = [facts.authentic ? '진품' : '가품'];
  if (tags.includes('limited'))
    findings.push(facts.limited ? '한정판 확인' : '일반판 · 한정판 아님');
  if (tags.includes('discontinued'))
    findings.push(facts.discontinued ? '단종품 확인' : '단종품 아님');
  if (tags.includes('vintage'))
    findings.push(facts.vintage ? '빈티지 확인' : '빈티지 아님');
  return findings;
}
export function tagIsTrue(
  tag: ListingTag,
  facts: ListingInfo['facts'],
): boolean {
  if (tag === 'authentic') return facts.authentic;
  if (tag === 'replica') return !facts.authentic;
  if (tag === 'limited' || tag === 'discontinued' || tag === 'vintage')
    return facts[tag];
  if (['urgent', 'moving', 'firm', 'negotiable'].includes(tag))
    return facts.seller === (tag as SellerTrait);
  return true;
}

export function listingAskPrice(price: number, info?: ListingInfo): number {
  if (price === 0 || info?.facts.seller !== 'urgent') return price;
  const step = MARKET_PRICING.priceStep;
  return Math.max(
    step,
    Math.floor((price * TAG_RULES.urgentAskPercent) / 100 / step) * step,
  );
}
