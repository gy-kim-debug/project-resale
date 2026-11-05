import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine';export * from './src/domain/story';export * from './src/domain/debt';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/settlement-fixture-engine.mjs',
});
const {
  newGame,
  execute,
  enableStory,
  mandatoryPrincipal,
  interestAmount,
  storyLines,
  isGame,
} = await import('../work/settlement-fixture-engine.mjs');
function run(g, c) {
  const r = execute(g, c);
  if (!r.ok) throw Error(r.message);
  return r.game;
}
let g = enableStory(newGame(42));
g.cash = 20000000;
g.stats.peakCash = g.cash;
const data = {};
for (let week = 1; week <= 2; week++) {
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  if (!isGame(g)) throw Error('invalid fixture');
  data['week' + week] = {
    data: {
      version: 2,
      game: globalThis.structuredClone(g),
      favoriteIds: [],
      selectedMarket: 'street',
      readNotificationIds: [],
    },
    fee: interestAmount(g),
  };
  g = run(g, { type: 'payInterest' });
  while (g.story.active.step < storyLines(g).length - 1)
    g = run(g, { type: 'storyNext' });
  g = run(g, { type: 'storyChoice', choice: 'end' });
  while (g.story.active.step < storyLines(g).length - 1)
    g = run(g, { type: 'storyNext' });
  g = run(g, { type: 'storyChoice', choice: 'continue' });
}
await writeFile('work/settlement-fixtures.json', JSON.stringify(data));
