import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/app/eventPreview';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/event-depth-fixture-engine.mjs',
});
const { createEventPreview, isGame } =
  await import('../work/event-depth-fixture-engine.mjs');
const samples = {};
for (const kind of ['reservation', 'appointment', 'scam']) {
  const game = createEventPreview(kind);
  if (!isGame(game)) throw Error('Invalid ' + kind);
  samples[kind] = {
    version: 2,
    game,
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
  };
}
await writeFile('work/event-depth-fixtures.json', JSON.stringify(samples));
