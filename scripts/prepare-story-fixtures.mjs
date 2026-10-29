import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents: `export * from './src/domain/engine'; export * from './src/domain/story'; export * from './src/storage/validation';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/story-fixture-engine.mjs',
});
const { newGame, execute, enableStory, beforeTrade, storyLines, isGame } =
  await import('../work/story-fixture-engine.mjs');
const data = {};
const save = (g) => ({
  version: 2,
  game: g,
  favoriteIds: [],
  selectedMarket: 'street',
  readNotificationIds: [],
});
const base = () => {
  const g = enableStory(newGame(42));
  g.cash = 100000000;
  g.stats.peakCash = g.cash;
  g.minute = 1440;
  g.weekActions = 3;
  for (const i of g.board) i.expires = g.minute + 8 * 480;
  return g;
};
for (const kind of ['missing', 'model', 'memory', 'regular', 'bundle']) {
  const g = base();
  g.story.contacts = [...new Set(g.board.map((i) => i.seller))];
  const item = g.board.find((i) => i.marketId === 'street' && i.price > 0);
  for (let seed = 1; seed < 10000; seed++) {
    g.seed = seed;
    const scene = beforeTrade(g, { type: 'buy', id: item.id });
    if (scene?.kind === kind) {
      const r = execute(g, { type: 'buy', id: item.id });
      if (!r.ok) throw Error(r.message);
      data[kind] = save(r.game);
      break;
    }
  }
  if (!data[kind]) throw Error('Missing event: ' + kind);
}
{
  const g = base();
  const item = g.board.shift();
  item.acquiredFor = 10000;
  g.inventory.push(item);
  g.sales.push({
    id: 'story-sale',
    itemId: item.id,
    price: 10000,
    created: g.minute,
    expires: g.minute + 4800,
    nextCheck: g.minute + 4800,
  });
  g.inquiries.push({
    id: 'story-buyer',
    saleId: 'story-sale',
    name: '구매자',
    price: 10000,
    max: 12000,
    rounds: 0,
  });
  for (let seed = 1; seed < 10000; seed++) {
    g.seed = seed;
    if (beforeTrade(g, { type: 'accept', id: 'story-buyer' })) {
      const r = execute(g, { type: 'accept', id: 'story-buyer' });
      if (!r.ok) throw Error(r.message);
      data.rehaggle = save(r.game);
      break;
    }
  }
}
{
  const g = base();
  const item = g.board.shift();
  item.acquiredFor = 10000;
  g.inventory.push(item);
  const second = g.board.shift();
  second.acquiredFor = 10000;
  g.inventory.push(second);
  g.story.active = {
    targets: [item.id, second.id],
    kind: 'competitor',
    step: 0,
    target: item.id,
    price: 14000,
    name: '거래상',
  };
  data.competitor = save(g);
  const contact = globalThis.structuredClone(g);
  contact.story.active = {
    kind: 'regular',
    step: 0,
    target: item.id,
    name: item.seller,
  };
  data.regularCall = save(contact);
}
{
  const g = base();
  g.story.active = { kind: 'creditor', step: 0 };
  data.creditor = save(g);
  for (const kind of ['success', 'failure']) {
    const g = base();
    g.status = kind === 'success' ? 'cleared' : 'bankrupt';
    if (kind === 'success') g.principal = 0;
    g.story.active = { kind, step: 0 };
    data[kind] = save(g);
  }
  const poor = globalThis.structuredClone(data.bundle);
  poor.game.cash = 0;
  data.poorBundle = poor;
}
for (const [key, d] of Object.entries(data)) {
  if (!isGame(d.game)) throw Error('Invalid fixture ' + key);
  storyLines(d.game);
}
await writeFile('work/story-fixtures.json', JSON.stringify(data));
process.stdout.write(
  'Validated ' + Object.keys(data).length + ' story fixtures\n',
);
