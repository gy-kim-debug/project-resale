import type { MarketId } from '../domain/game';

/** Developer initial balance. Shared engine, distinct market behavior. */
export interface BargainingMarket {
  opening: readonly [number, number];
  floorShift: number;
  patienceBonus: number;
  holdShift: number;
  concessionScale: number;
  tactic: 'flexible' | 'precise' | 'gradual' | 'decisive' | 'patient';
  lowballRatio: number;
  lowballWalkChance: number;
}
export const BARGAINING_MARKETS: Record<
  Exclude<MarketId, 'auction' | 'aircraft'>,
  BargainingMarket
> = {
  street: {
    opening: [70, 85],
    floorShift: 0,
    patienceBonus: 0,
    holdShift: 0,
    concessionScale: 1,
    tactic: 'flexible',
    lowballRatio: 0,
    lowballWalkChance: 0,
  },
  computers: {
    opening: [80, 90],
    floorShift: 0.04,
    patienceBonus: 0,
    holdShift: 0,
    concessionScale: 0.7,
    tactic: 'precise',
    lowballRatio: 0.82,
    lowballWalkChance: 0.35,
  },
  instruments: {
    opening: [70, 85],
    floorShift: 0,
    patienceBonus: 1,
    holdShift: 0,
    concessionScale: 1,
    tactic: 'gradual',
    lowballRatio: 0,
    lowballWalkChance: 0,
  },
  cars: {
    opening: [65, 85],
    floorShift: -0.02,
    patienceBonus: 0,
    holdShift: 0,
    concessionScale: 1.1,
    tactic: 'decisive',
    lowballRatio: 0,
    lowballWalkChance: 0,
  },
  property: {
    opening: [75, 90],
    floorShift: 0.025,
    patienceBonus: 1,
    holdShift: 0.15,
    concessionScale: 0.7,
    tactic: 'patient',
    lowballRatio: 0,
    lowballWalkChance: 0,
  },
};
export const SALE_BARGAINING = { maxRounds: 2, walkChance: 0.3 };
