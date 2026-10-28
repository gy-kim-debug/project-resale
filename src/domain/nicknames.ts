import { NICKNAME_WORDS } from '../content/nicknames';

/** Local seeded generator; never consumes the game's economic RNG. */
export function generateNickname(seed: number): string {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(values: readonly T[]) =>
    values[Math.floor(next() * values.length)];
  const prefix = pick(NICKNAME_WORDS.prefixes);
  const noun = pick(NICKNAME_WORDS.nouns);
  const number = Math.floor(next() * 100)
    .toString()
    .padStart(2, '0');
  switch (Math.floor(next() * 4)) {
    case 0:
      return `${prefix}${noun}`;
    case 1:
      return `${noun}${number}`;
    case 2:
      return `${prefix}${noun}${number}`;
    default:
      return `${noun}의${pick(NICKNAME_WORDS.places)}`;
  }
}
