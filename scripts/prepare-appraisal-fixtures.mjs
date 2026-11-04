import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/appraisal-fixture-engine.mjs',
});
const { newGame, isGame } =
  await import('../work/appraisal-fixture-engine.mjs');
const data = {};
for (const kind of ['gain', 'loss', 'zero', 'large']) {
  const g = newGame(42);
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  const item = g.board.shift();
  item.acquiredFor = 10000;
  item.base = 30000;
  item.valuationReference = 10000;
  item.checked = false;
  item.value = kind === 'loss' ? 4000 : 30000;
  item.condition = kind === 'loss' ? '고장' : '양호';
  item.defect =
    kind === 'loss'
      ? '작동하지 않는 부분과 비정상 구성이 확인됐습니다.'
      : '특별한 결함은 발견되지 않았습니다.';
  if (item.listing) item.listing.facts.authentic = kind !== 'loss';
  if (kind === 'zero') {
    item.value = 0;
    item.acquiredFor = 0;
    item.condition = '고장';
    item.defect = '재사용이 어려운 상태입니다.';
  }
  if (kind === 'large') {
    item.value = 900000000000000;
    item.base = item.value;
    item.valuationReference = 300000000000000;
    item.acquiredFor = 800000000000000;
    item.checked = true;
  }
  g.inventory = [item];
  if (!isGame(g)) throw Error('Invalid ' + kind);
  data[kind] = {
    version: 2,
    game: g,
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
  };
}
await writeFile('work/appraisal-fixtures.json', JSON.stringify(data));
