import { SALE_BARGAINING } from './bargaining';
import type { SellerTrait } from '../domain/game';

export type TraderStyle =
  'ordinary' | 'firm' | 'lowball' | 'quick' | 'flexible' | 'patient';
interface TraderStyleRules {
  label: string;
  walkChance: number;
  floorShift: number;
  patienceBonus: number;
  patienceCap: number;
  holdShift: number;
  concessionScale: number;
  buyerOpeningPercent: number | null;
  buyerFixed: boolean;
}
const ordinary: TraderStyleRules = {
  label: '일반 거래',
  walkChance: SALE_BARGAINING.walkChance,
  floorShift: 0,
  patienceBonus: 0,
  patienceCap: 6,
  holdShift: 0,
  concessionScale: 1,
  buyerOpeningPercent: null,
  buyerFixed: false,
};
/** Initial personality tuning; demographics never participate in these rules. */
export const TRADER_STYLES: Record<TraderStyle, TraderStyleRules> = {
  ordinary,
  firm: { ...ordinary, label: '가격 고정', walkChance: 1, buyerFixed: true },
  lowball: {
    ...ordinary,
    label: '큰 폭 흥정',
    walkChance: 0.45,
    floorShift: 0.06,
    holdShift: 0.25,
    concessionScale: 0.7,
    buyerOpeningPercent: 60,
  },
  quick: {
    ...ordinary,
    label: '쿨거래',
    walkChance: 0.6,
    floorShift: -0.03,
    patienceCap: 2,
    holdShift: -0.1,
    concessionScale: 1.3,
    buyerOpeningPercent: 100,
  },
  flexible: {
    ...ordinary,
    label: '유연한 흥정',
    walkChance: 0.15,
    floorShift: -0.04,
    patienceBonus: 1,
    concessionScale: 1.3,
    buyerOpeningPercent: 90,
  },
  patient: {
    ...ordinary,
    label: '신중한 거래',
    walkChance: 0.08,
    patienceBonus: 2,
    buyerOpeningPercent: 80,
  },
};
export interface Trader {
  id: string;
  name: string;
  age: number;
  gender: '남성' | '여성' | '비공개';
  style: TraderStyle;
}
export const TRADERS: Trader[] = [
  { id: 'pine24', name: '솔방울', age: 24, gender: '여성', style: 'ordinary' },
  {
    id: 'moon37',
    name: '달빛상자',
    age: 37,
    gender: '남성',
    style: 'ordinary',
  },
  { id: 'river45', name: '강가', age: 45, gender: '비공개', style: 'ordinary' },
  { id: 'price31', name: '정가주의', age: 31, gender: '남성', style: 'firm' },
  { id: 'square42', name: '네모상자', age: 42, gender: '여성', style: 'firm' },
  { id: 'dot28', name: '마침표', age: 28, gender: '비공개', style: 'firm' },
  { id: 'deal26', name: '알뜰대장', age: 26, gender: '여성', style: 'lowball' },
  {
    id: 'half39',
    name: '반값원정대',
    age: 39,
    gender: '남성',
    style: 'lowball',
  },
  {
    id: 'coin52',
    name: '동전수집가',
    age: 52,
    gender: '비공개',
    style: 'lowball',
  },
  { id: 'cool29', name: '바로거래', age: 29, gender: '남성', style: 'quick' },
  { id: 'wind35', name: '바람개비', age: 35, gender: '여성', style: 'quick' },
  { id: 'fast48', name: '오늘정리', age: 48, gender: '비공개', style: 'quick' },
  { id: 'olive33', name: '올리브', age: 33, gender: '여성', style: 'flexible' },
  {
    id: 'bridge46',
    name: '징검다리',
    age: 46,
    gender: '남성',
    style: 'flexible',
  },
  {
    id: 'round22',
    name: '동그라미',
    age: 22,
    gender: '비공개',
    style: 'flexible',
  },
  { id: 'tea41', name: '차한잔', age: 41, gender: '남성', style: 'patient' },
  {
    id: 'note27',
    name: '기록하는밤',
    age: 27,
    gender: '여성',
    style: 'patient',
  },
  {
    id: 'slow58',
    name: '느린산책',
    age: 58,
    gender: '비공개',
    style: 'patient',
  },
];
export const traderById = (id?: string) => TRADERS.find((t) => t.id === id);
export const isTraderId = (id: unknown): id is string =>
  typeof id === 'string' && !!traderById(id);
function hash(key: string) {
  let n = 2166136261;
  for (const char of key) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function chooseTrader(key: string, seller?: SellerTrait): Trader {
  const styles: TraderStyle[] =
    seller === 'firm'
      ? ['firm']
      : seller === 'urgent' || seller === 'moving'
        ? ['quick']
        : seller === 'negotiable'
          ? ['flexible']
          : seller === 'ordinary'
            ? ['ordinary', 'lowball', 'patient']
            : (Object.keys(TRADER_STYLES) as TraderStyle[]);
  const pool = TRADERS.filter((t) => styles.includes(t.style));
  return pool[hash(key) % pool.length];
}
export function displayTrader(
  id: string | undefined,
  key: string,
  name: string,
): Trader {
  return (
    traderById(id) ?? {
      ...chooseTrader(key, 'ordinary'),
      id: `user${hash(key).toString(36)}`,
      name,
      style: 'ordinary',
    }
  );
}
