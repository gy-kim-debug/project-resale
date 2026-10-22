import type { Kind } from '../domain/game';

/** Initial balance proposal: category-adjusted reference values, not guaranteed resale prices. */
export const CATEGORY_PRICING: Record<
  Kind,
  { valuePercent: number; examples: string }
> = {
  생활: { valuePercent: 80, examples: '조명·주방 도구·생활 잡화' },
  디지털: { valuePercent: 120, examples: '키보드·카메라·오디오·노트북' },
  가구: { valuePercent: 100, examples: '의자·수납장·소파' },
  수집품: { valuePercent: 140, examples: '라디오·피규어·시계·미술품' },
  악기: { valuePercent: 100, examples: '기타·피아노·색소폰' },
  자동차: { valuePercent: 100, examples: '세단·SUV·전기차' },
  부동산: { valuePercent: 100, examples: '아파트·오피스텔·상가' },
  항공기: { valuePercent: 100, examples: '경량기·훈련기·비즈니스기' },
};
export const MARKET_PRICING = {
  askMinPercent: 35,
  askMaxPercent: 70,
  priceStep: 1000,
  giveawayMin: 50_000,
  giveawayMax: 150_000,
  scavengeMin: 5_000,
  scavengeMax: 20_000,
  scavengeRare: 80_000,
  scavengeCommonChance: 0.97,
};
export const TIERS = [
  { threshold: 0, base: 100_000, name: '동네 생활용품' },
  { threshold: 200_000, base: 300_000, name: '소형 중고품' },
  { threshold: 500_000, base: 600_000, name: '가전·취미용품' },
  { threshold: 2_000_000, base: 3_000_000, name: '전문 장비' },
  { threshold: 10_000_000, base: 30_000_000, name: '빈티지·한정품' },
  { threshold: 100_000_000, base: 300_000_000, name: '고가 수집품' },
  { threshold: 1_000_000_000, base: 3_000_000_000, name: '희귀 경매품' },
  { threshold: 5_000_000_000, base: 15_000_000_000, name: '최상위 컬렉션' },
];
