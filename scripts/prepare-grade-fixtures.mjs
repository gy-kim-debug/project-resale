import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine';export * from './src/domain/conditionGrades';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/grade-fixture-engine.mjs',
});
const { newGame, assignGrade, isGame } =
  await import('../work/grade-fixture-engine.mjs');
function seedFor(success, drop) {
  for (let seed = 0; seed < 1000000; seed += 17) {
    const a = (Math.imul(1664525, seed) + 1013904223) >>> 0,
      b = (Math.imul(1664525, a) + 1013904223) >>> 0;
    if (
      (success ? a / 4294967296 < 0.6 : a / 4294967296 >= 0.6) &&
      (!drop || b / 4294967296 < 0.2)
    )
      return seed;
  }
  throw Error('seed');
}
const data = {};
for (const kind of [
  'success',
  'failure',
  'F',
  'SSS',
  'legacy',
  'experienced',
]) {
  const g = newGame(42);
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  const i = g.board.shift();
  i.base = 100000;
  i.valuationReference = 100000;
  i.acquiredFor = 50000;
  assignGrade(i, kind === 'F' ? 0.99 : kind === 'SSS' ? 0.001 : 0.8, 0.5, 0.9);
  i.checked = false;
  g.seed = seedFor(kind !== 'failure', kind === 'failure');
  g.inventory = [i];
  if (kind === 'experienced')
    g.marketExperience = { street: 650, computers: 50, instruments: 20 };
  if (kind === 'legacy') {
    delete i.stateGrade;
    delete i.repairDifficulty;
    delete i.repairCeiling;
    i.value = 73100;
    i.condition = '사용감';
    i.repaired = true;
  }
  if (!isGame(g)) throw Error('Invalid fixture ' + kind);
  data[kind] = {
    version: 2,
    game: g,
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
  };
}
await writeFile('work/grade-fixtures.json', JSON.stringify(data));
