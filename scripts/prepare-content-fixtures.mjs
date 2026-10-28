import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/content/markets.ts',
    'src/content/productCategories.ts',
    'src/content/itemCases.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/content-qa',
  outExtension: { '.js': '.mjs' },
});
const { newGame } = await import('../work/content-qa/domain/engine.mjs');
const { MARKETS } = await import('../work/content-qa/content/markets.mjs');
const { PRODUCT_CATEGORIES } =
  await import('../work/content-qa/content/productCategories.mjs');
const { ITEM_CASES } = await import('../work/content-qa/content/itemCases.mjs');
const game = newGame(42);
game.cash = 1000000000000;
game.stats.peakCash = game.cash;
await writeFile(
  'work/content-fixtures.json',
  JSON.stringify({
    save: {
      version: 2,
      game,
      favoriteIds: [],
      selectedMarket: 'street',
      readNotificationIds: [],
    },
    markets: MARKETS,
    categories: PRODUCT_CATEGORIES,
    cases: ITEM_CASES,
  }),
);
