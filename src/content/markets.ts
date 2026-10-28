import { MARKET_PRODUCTS } from './marketProducts';
import type { ProductCategory } from './productCategories';
import type { Kind, MarketId, Item } from '../domain/game';
export interface MarketProduct {
  category?: ProductCategory;
  min?: number;
  max?: number;
  title: string;
  kind: Kind;
  description: string;
}
export interface MarketDefinition {
  id: MarketId;
  name: string;
  min: number;
  max: number;
  products: MarketProduct[];
}
function active(
  id: Exclude<MarketId, 'aircraft'>,
  name: string,
): MarketDefinition {
  const products = MARKET_PRODUCTS[id];
  return {
    id,
    name,
    products,
    min: Math.min(...products.map((p) => p.min!)),
    max: Math.max(...products.map((p) => p.max!)),
  };
}
const MARKET_DEFINITIONS: MarketDefinition[] = [
  active('street', '중고 장터'),
  active('computers', '전자상가'),
  active('instruments', '악기시장'),
  active('cars', '중고차시장'),
  active('property', '부동산 시장'),
  active('auction', '고가 경매시장'),
  // Only retained to validate and sell already-owned assets from old saves.
  {
    id: 'aircraft',
    name: '비행기 시장',
    min: 2000000000,
    max: 10000000000,
    products: [
      '경량 항공기',
      '프로펠러 훈련기',
      '소형 비즈니스기',
      '터보프롭 항공기',
      '중형 비즈니스기',
      '화물 항공기',
    ].map((title) => ({
      title,
      kind: '항공기' as const,
      description: '기존 보유 항공기',
    })),
  },
];
export const MARKETS = MARKET_DEFINITIONS.filter(
  (market) => market.id !== 'aircraft',
);
export const isActiveMarketId = (value: unknown): value is MarketId =>
  MARKETS.some((market) => market.id === value);
export const MARKET_LISTING_COUNT = 12;
export const LEGACY_BOARD_LIMIT =
  MARKET_DEFINITIONS.length * MARKET_LISTING_COUNT + 1;
export const marketOf = (item: Pick<Item, 'marketId'>): MarketId =>
  item.marketId ?? 'street';
export const marketDefinition = (id: MarketId) =>
  MARKET_DEFINITIONS.find((market) => market.id === id)!;
export const isMarketId = (value: unknown): value is MarketId =>
  MARKET_DEFINITIONS.some((market) => market.id === value);
