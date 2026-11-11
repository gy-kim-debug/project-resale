import {
  HAIRSTYLES,
  OUTFITS,
  SKINS,
  type PlayerAppearance,
} from '../content/player';
import type { Trader } from '../content/traders';

/** Stable visual choices only. Never consumes the simulation RNG or changes saves. */
export function traderAppearance(
  trader: Pick<Trader, 'id' | 'gender'>,
): PlayerAppearance {
  let hash = 0;
  for (const char of trader.id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const hairs = Object.keys(HAIRSTYLES) as PlayerAppearance['hair'][];
  const colors = Object.keys(OUTFITS) as PlayerAppearance['outfit'][];
  const skins = Object.keys(SKINS) as PlayerAppearance['skin'][];
  return {
    avatar:
      trader.gender === '여성'
        ? 'female'
        : trader.gender === '남성'
          ? 'male'
          : hash % 2
            ? 'female'
            : 'male',
    hair: hairs[hash % hairs.length],
    clothing: 'jacket',
    outfit: colors[Math.floor(hash / 5) % colors.length],
    skin: skins[Math.floor(hash / 30) % skins.length],
  };
}
