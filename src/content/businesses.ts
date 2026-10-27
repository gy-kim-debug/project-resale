/** Initial content/balance, not a promised final economy. */
export const BUSINESSES = [
  { id: 'stand', name: '중고 판매대', cost: 100000, income: 20000 },
  { id: 'vending', name: '자동판매기', cost: 500000, income: 100000 },
  { id: 'online', name: '온라인 판매점', cost: 3000000, income: 600000 },
  { id: 'unmanned', name: '무인 매장', cost: 30000000, income: 6000000 },
  { id: 'rental', name: '소형 임대 점포', cost: 300000000, income: 60000000 },
] as const;
export type BusinessId = (typeof BUSINESSES)[number]['id'];
export const businessDefinition = (id: string) =>
  BUSINESSES.find((b) => b.id === id);
