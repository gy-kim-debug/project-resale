import type { Kind, ListingTag, SellerTrait } from '../domain/game';

/** Initial tuning, not user-confirmed numerical balance. */
export const TAG_RULES = {
  truthChance: 0.85,
  unclaimedAuthenticChance: 0.9,
  limitedValuePercent: 150,
  discontinuedValuePercent: 125,
  vintageValuePercent: 115,
  replicaValuePercent: 8,
  urgentAskPercent: 90,
  normalLifetimeActions: 3,
  shortLifetimeActions: 2,
};
export const TAG_LABELS: Record<ListingTag, string> = {
  household: '생활용품',
  digital: '디지털기기',
  furniture: '가구',
  collectible: '수집품',
  limited: '한정판',
  discontinued: '단종품',
  vintage: '빈티지',
  authentic: '정품주장',
  replica: '레플리카',
  urgent: '급처',
  moving: '이사정리',
  firm: '가격고정',
  negotiable: '네고환영',
};
export const KIND_TAGS: Record<Kind, ListingTag> = {
  생활: 'household',
  디지털: 'digital',
  가구: 'furniture',
  수집품: 'collectible',
};
export const FEATURE_TAGS: ListingTag[] = [
  'limited',
  'discontinued',
  'vintage',
  'authentic',
  'authentic',
  'authentic',
  'replica',
];
export const SELLER_TAGS: SellerTrait[] = [
  'urgent',
  'moving',
  'firm',
  'negotiable',
];
export const SELLER_PROFILES: Record<
  SellerTrait,
  {
    floorMin: number;
    floorMax: number;
    patienceMin: number;
    patienceMax: number;
    holdChance: number;
    concessionMin: number;
    concessionMax: number;
  }
> = {
  ordinary: {
    floorMin: 0.78,
    floorMax: 0.9,
    patienceMin: 4,
    patienceMax: 6,
    holdChance: 0.25,
    concessionMin: 0.15,
    concessionMax: 0.3,
  },
  urgent: {
    floorMin: 0.65,
    floorMax: 0.78,
    patienceMin: 5,
    patienceMax: 6,
    holdChance: 0.1,
    concessionMin: 0.25,
    concessionMax: 0.4,
  },
  moving: {
    floorMin: 0.72,
    floorMax: 0.85,
    patienceMin: 4,
    patienceMax: 6,
    holdChance: 0.15,
    concessionMin: 0.2,
    concessionMax: 0.35,
  },
  firm: {
    floorMin: 1,
    floorMax: 1,
    patienceMin: 4,
    patienceMax: 4,
    holdChance: 1,
    concessionMin: 0,
    concessionMax: 0,
  },
  negotiable: {
    floorMin: 0.7,
    floorMax: 0.84,
    patienceMin: 5,
    patienceMax: 6,
    holdChance: 0.1,
    concessionMin: 0.2,
    concessionMax: 0.35,
  },
};
