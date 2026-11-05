import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine';export * from './src/domain/story';export * from './src/app/settlementPreview';export * from './src/content/player';export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/resume-fixture-engine.mjs',
});
const {
  newGame,
  enableStory,
  createSettlementPreview,
  DEFAULT_PLAYER,
  isGame,
} = await import('../work/resume-fixture-engine.mjs');
const newer = enableStory(
  newGame(43, { ...DEFAULT_PLAYER, nickname: '다른슬롯' }),
);
newer.cash = 900000;
newer.stats.peakCash = newer.cash;
const weekly = createSettlementPreview(
  { ...DEFAULT_PLAYER, nickname: '이어가는중' },
  'rain',
  3,
);
weekly.story.active.weeklyReply = 'ask';
weekly.story.active.step = 1;
const wrap = (game) => {
  if (!isGame(game)) throw Error('Invalid fixture');
  return {
    version: 2,
    game,
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
  };
};
await writeFile(
  'work/resume-fixtures.json',
  JSON.stringify({ newer: wrap(newer), weekly: wrap(weekly) }),
);
