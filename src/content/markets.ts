import type { Kind, MarketId, Item } from '../domain/game';
export interface MarketProduct {
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
const products = (kind: Kind, titles: string[]): MarketProduct[] =>
  titles.map((title) => ({
    title,
    kind,
    description: '보관 중인 자산을 판매합니다. 가격 협의 가능합니다.',
  }));
const MARKET_DEFINITIONS: MarketDefinition[] = [
  {
    id: 'street',
    name: '중고 장터',
    min: 10000,
    max: 500000,
    products: [
      {
        title: '탁상 조명',
        kind: '생활',
        description: '사용하던 조명입니다. 정리하며 판매합니다.',
      },
      {
        title: '기계식 키보드',
        kind: '디지털',
        description: '사용하던 키보드를 판매합니다.',
      },
      {
        title: '원목 의자',
        kind: '가구',
        description: '보관 중인 의자를 내놓습니다.',
      },
      {
        title: '빈티지 라디오',
        kind: '수집품',
        description: '오래 보관한 라디오입니다.',
      },
      {
        title: '입문용 카메라',
        kind: '디지털',
        description: '취미로 사용하던 카메라입니다.',
      },
      {
        title: '소장 피규어',
        kind: '수집품',
        description: '보관하던 소장품을 판매합니다.',
      },
    ],
  },
  {
    id: 'computers',
    name: '컴퓨터시장',
    min: 800000,
    max: 1200000,
    products: products('디지털', [
      '조립 데스크톱',
      '게이밍 노트북',
      '미니 PC',
      '사무용 워크스테이션',
      '크리에이터 노트북',
      '소형 서버',
    ]),
  },
  {
    id: 'instruments',
    name: '악기시장',
    min: 1500000,
    max: 10000000,
    products: products('악기', [
      '일렉트릭 기타',
      '색소폰',
      '디지털 피아노',
      '어쿠스틱 기타',
      '신시사이저',
      '첼로',
    ]),
  },
  {
    id: 'cars',
    name: '중고차시장',
    min: 10000000,
    max: 80000000,
    products: products('자동차', [
      '경차',
      '중형 세단',
      '패밀리 SUV',
      '수입 세단',
      '전기차',
      '승합차',
    ]),
  },
  {
    id: 'property',
    name: '부동산 시장',
    min: 100000000,
    max: 1000000000,
    products: products('부동산', [
      '소형 오피스텔',
      '구축 아파트',
      '소형 상가',
      '연립주택',
      '전원주택',
      '도심 아파트',
    ]),
  },
  {
    id: 'auction',
    name: '고가 경매시장',
    min: 1000000000,
    max: 10000000000,
    products: products('수집품', [
      '근현대 회화',
      '천연 다이아몬드',
      '희귀 도자기',
      '고급 기계식 시계',
      '앤티크 조각상',
      '희귀 보석 목걸이',
    ]).map((product) => ({
      ...product,
      description: '개인 컬렉션에서 출품된 작품입니다.',
    })),
  },
  {
    id: 'aircraft',
    name: '비행기 시장',
    min: 2000000000,
    max: 10000000000,
    products: products('항공기', [
      '경량 항공기',
      '프로펠러 훈련기',
      '소형 비즈니스기',
      '터보프롭 항공기',
      '중형 비즈니스기',
      '화물 항공기',
    ]),
  },
];
// Retired market definitions are retained solely to read and sell existing assets.
export const MARKETS = MARKET_DEFINITIONS.filter(
  (market) => market.id !== 'aircraft',
);
export const isActiveMarketId = (value: unknown): value is MarketId =>
  MARKETS.some((market) => market.id === value);
export const LEGACY_BOARD_LIMIT = MARKET_DEFINITIONS.length * 8 + 1;
export const marketOf = (item: Pick<Item, 'marketId'>): MarketId =>
  item.marketId ?? 'street';
export const marketDefinition = (id: MarketId) =>
  MARKET_DEFINITIONS.find((m) => m.id === id)!;
export const isMarketId = (value: unknown): value is MarketId =>
  MARKET_DEFINITIONS.some((m) => m.id === value);
