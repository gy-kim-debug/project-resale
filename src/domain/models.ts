/** Integer KRW. All future arithmetic must validate Number.isSafeInteger. */
export type Won = number;
export type Category = '전체' | '디지털' | '생활' | '수집품' | '가구';
export interface Listing {
  id: string;
  title: string;
  category: Exclude<Category, '전체'>;
  price: Won;
  symbol: string;
  condition: string;
  seller: string;
  description: string;
  clue: string;
  tag?: string;
}
export interface Player {
  cash: Won;
  principal: Won;
  interest: Won;
  hunger: number;
  fatigue: number;
  health: number;
  day: number;
}
export const initialPlayer: Readonly<Player> = {
  cash: 0,
  principal: 10_000_000_000,
  interest: 0,
  hunger: 20,
  fatigue: 15,
  health: 100,
  day: 1,
};
export function formatWon(value: Won): string {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError('금액은 0 이상의 안전한 정수여야 합니다.');
  return `${value.toLocaleString('ko-KR')}원`;
}
