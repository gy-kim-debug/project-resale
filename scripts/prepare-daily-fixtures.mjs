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
const { enableStory, storyLines, storyChoices } =
  await import('../work/daily-fixtures/domain/story.mjs');
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
for (let week = 1; week <= 5; week++) {
  run({ type: 'startSettlement' });
  run({ type: 'repay', amount: 50000 * 2 ** (week - 1) });
  run({ type: 'payInterest' });
  while (chart.story.active)
    run(
      chart.story.active.step < storyLines(chart).length - 1
        ? { type: 'storyNext' }
        : { type: 'storyChoice', choice: storyChoices(chart)[0].id },
    );
}
if (!isGame(chart)) throw Error('Invalid chart fixture');
await writeFile(
  'work/daily-chart-fixture.json',
  JSON.stringify({ version: 2, game: chart, favoriteIds: [] }),
);
process.stdout.write('Synthetic daily and six-week chart fixtures ready.\n');
