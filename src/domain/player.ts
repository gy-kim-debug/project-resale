import {
  DEFAULT_PLAYER,
  HAIRSTYLES,
  OUTFITS,
  SKINS,
  type PlayerProfile,
} from '../content/player';
export function isPlayer(value: unknown): value is PlayerProfile {
  if (
    !value ||
    typeof value !== 'object' ||
    !('nickname' in value) ||
    !('appearance' in value)
  )
    return false;
  const { nickname, appearance } = value;
  if (
    typeof nickname !== 'string' ||
    nickname !== nickname.trim().normalize('NFKC') ||
    !/^[\p{L}\p{N} _.-]{1,12}$/u.test(nickname)
  )
    return false;
  return (
    !!appearance &&
    typeof appearance === 'object' &&
    'hair' in appearance &&
    typeof appearance.hair === 'string' &&
    Object.hasOwn(HAIRSTYLES, appearance.hair) &&
    'outfit' in appearance &&
    typeof appearance.outfit === 'string' &&
    Object.hasOwn(OUTFITS, appearance.outfit) &&
    'skin' in appearance &&
    typeof appearance.skin === 'string' &&
    Object.hasOwn(SKINS, appearance.skin)
  );
}
export const playerOf = (game: { player?: PlayerProfile }) =>
  game.player ?? DEFAULT_PLAYER;
