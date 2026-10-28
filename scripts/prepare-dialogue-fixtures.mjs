import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/dialogue-engine.mjs',
});
const { newGame } = await import('../work/dialogue-engine.mjs');
const g = newGame(42);
g.cash = 100000000;
g.stats.peakCash = g.cash;
const i = g.board.find((i) => i.marketId === 'street' && i.price > 0);
i.traderId = 'olive33';
i.seller = '올리브';
i.listing.facts.seller = 'ordinary';
await writeFile(
  'work/dialogue-fixture.json',
  JSON.stringify({
    item: i,
    save: {
      version: 2,
      game: g,
      favoriteIds: [],
      selectedMarket: 'street',
      readNotificationIds: [],
    },
  }),
);
