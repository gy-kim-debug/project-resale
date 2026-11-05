import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine';export * from './src/domain/story';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/retired-income-fixture-engine.mjs',
});
const { newGame, enableStory, isGame } =
  await import('../work/retired-income-fixture-engine.mjs');
const g = enableStory(newGame(42));
g.cash = 1238000;
g.stats.peakCash = g.cash;
g.stats.earned = 38000;
const i = g.board.find((i) => i.marketId === 'street' && i.stateGrade === 'B');
g.board = g.board.filter((x) => x.id !== i.id);
i.acquiredFor = 0;
i.price = 0;
i.offers = [];
g.inventory = [i];
g.board.push({ ...g.board[0], id: 'old-free-gift', price: 0, offers: [] });
g.logs.push({
  id: ++g.serial,
  minute: 0,
  text: '창고 분류 완료. 38,000 원을 받았습니다.',
  category: 'activity',
});
if (!isGame(g)) throw Error('invalid fixture');
await writeFile(
  'work/retired-income-fixture.json',
  JSON.stringify({
    version: 2,
    game: g,
    favoriteIds: [],
    readNotificationIds: [],
    selectedMarket: 'street',
  }),
);
