import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/special-business-engine.mjs',
});
const { newGame } = await import('../work/special-business-engine.mjs');
const found = new Map();
for (let seed = 1; seed <= 500 && found.size < 3; seed++) {
  const game = newGame(seed);
  game.cash = 2000000;
  game.stats.peakCash = game.cash;
  for (const item of game.board.filter(
    (i) => i.marketId === 'street' && i.special,
  ))
    if (!found.has(item.special))
      found.set(item.special, {
        id: item.id,
        special: item.special,
        save: { version: 2, game, favoriteIds: [] },
      });
}
if (found.size !== 3) throw Error('Missing special listing fixtures');
await writeFile(
  'work/special-business-cases.json',
  JSON.stringify([...found.values()]),
);
