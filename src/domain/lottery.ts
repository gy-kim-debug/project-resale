/** Six distinct numbers from 1..45; draw order is preserved for the reveal. */
export const validLottoNumbers = (v: unknown): v is number[] =>
  Array.isArray(v) &&
  v.length === 6 &&
  new Set(v).size === 6 &&
  v.every((n) => Number.isSafeInteger(n) && n >= 1 && n <= 45);
function sample(next: (max: number) => number, count: number) {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1),
    numbers: number[] = [];
  for (let i = 0; i < count; i++)
    numbers.push(pool.splice(next(pool.length), 1)[0]);
  return numbers;
}
export const autoLottoNumbers = (next: (max: number) => number) =>
  sample(next, 6).sort((a, b) => a - b);
export function drawLottoNumbers(next: (max: number) => number) {
  const numbers = sample(next, 7);
  return { winning: numbers.slice(0, 6), bonus: numbers[6] };
}
export function lottoRank(numbers: number[], winning: number[], bonus: number) {
  const matches = numbers.filter((n) => winning.includes(n)).length;
  return matches === 6
    ? 1
    : matches === 5
      ? numbers.includes(bonus)
        ? 2
        : 3
      : matches === 4
        ? 4
        : matches === 3
          ? 5
          : 0;
}
