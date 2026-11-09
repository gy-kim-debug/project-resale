import process from 'node:process';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/domain/story.ts',
    'src/domain/daily.ts',
    'src/storage/validation.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/daily-fixtures',
  outExtension: { '.js': '.mjs' },
});
const { newGame, execute } =
  await import('../work/daily-fixtures/domain/engine.mjs');
const { enableStory } = await import('../work/daily-fixtures/domain/story.mjs');
const { dailyState } = await import('../work/daily-fixtures/domain/daily.mjs');
const { isGame } =
  await import('../work/daily-fixtures/storage/validation.mjs');
let g = enableStory(newGame(5));
g.daily = dailyState(g);
// Legacy purchase: browser checks its one-time principal refund and removal.
g.businesses = [{ id: 'stand', purchasedWeek: 1 }];
g.cash = 5000000;
g.stats.peakCash = g.cash;
// Force a wallet encounter on the first walk; RNG remains ordinary afterwards.
for (let seed = 0; ; seed++) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  if (next / 4294967296 < 0.05) {
    g.daily.seed = seed;
    break;
  }
}
if (!isGame(g)) throw Error('Invalid daily fixture');
await writeFile(
  'work/daily-fixture.json',
  JSON.stringify({ version: 2, game: g, favoriteIds: [] }),
);
let chart = enableStory(newGame(7));
chart.cash = 50000000;
chart.stats.peakCash = chart.cash;
function run(command) {
  const r = execute(chart, command);
  if (!r.ok) throw Error(r.message);
  chart = r.game;
}
for (let action = 0; action < 5; action++) run({ type: 'dailyWork' });
if (!isGame(chart)) throw Error('Invalid chart fixture');
await writeFile(
  'work/daily-chart-fixture.json',
  JSON.stringify({ version: 2, game: chart, favoriteIds: [] }),
);
const legacy = newGame(11);
legacy.interestWeek = 3;
legacy.minute = 3 * 20 * 480;
legacy.marketDay = Math.floor(legacy.minute / 1440) + 1;
legacy.cash = 5000000;
legacy.stats.peakCash = legacy.cash;
legacy.daily = dailyState(legacy);
delete legacy.daily.stockTick;
delete legacy.daily.stockSeed;
for (const stock of legacy.daily.stocks) {
  const price = stock.history[0].price;
  stock.history = [
    { week: 2, price: price - 1000 },
    { week: 3, price: price - 500 },
    { week: 4, price },
  ];
}
legacy.daily.stocks[0].quantity = 3;
legacy.daily.stocks[0].cost = 60000;
if (!isGame(legacy)) throw Error('Invalid legacy weekly stock fixture');
await writeFile(
  'work/weekly-stock-legacy-fixture.json',
  JSON.stringify({ version: 2, game: legacy, favoriteIds: [] }),
);
process.stdout.write('Synthetic daily and six-quote chart fixtures ready.\n');
