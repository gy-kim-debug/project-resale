import type { MarketId } from '../domain/game';
export const SPECIAL_RULES = { chance: 0.18 };
export const SPECIAL_LISTINGS = {
  clearance: {
    name: '폐업 정리',
    pricePercent: 80,
    markets: [
      'street',
      'computers',
      'instruments',
      'cars',
      'property',
    ] as MarketId[],
    description: '폐업 정리로 내놓습니다. 빠르게 거래할 분을 찾습니다.',
  },
  collector: {
    name: '소장품 출품',
    pricePercent: 100,
    markets: ['street', 'computers', 'instruments'] as MarketId[],
    description:
      '오랫동안 보관한 소장품입니다. 가치를 알아보는 분께 판매합니다.',
  },
  unverified: {
    name: '미확인 특가',
    pricePercent: 70,
    markets: ['street', 'computers', 'instruments', 'cars'] as MarketId[],
    description:
      '작동 여부를 확인하지 못했습니다. 정상 작동은 보증하지 않습니다.',
  },
} as const;
export type SpecialListingId = keyof typeof SPECIAL_LISTINGS;
export const isSpecialListingId = (id: unknown): id is SpecialListingId =>
  typeof id === 'string' && Object.hasOwn(SPECIAL_LISTINGS, id);
