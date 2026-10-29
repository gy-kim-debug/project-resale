import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/choice-engine.mjs',
});
const { newGame, execute } = await import('../work/choice-engine.mjs');
const save = (game) => ({
  version: 2,
  game,
  favoriteIds: [],
  selectedMarket: 'street',
  readNotificationIds: [],
});
let g = newGame(42);
g.cash = 100000000;
g.stats.peakCash = g.cash;
const found = execute(g, { type: 'scavenge' });
if (!found.ok) throw Error(found.message);
const free = save(found.game);
const item = g.board.find((i) => i.marketId === 'street' && i.price > 0);
let r = execute(g, { type: 'buy', id: item.id });
if (!r.ok) throw Error(r.message);
g = r.game;
r = execute(g, { type: 'post', id: item.id, price: 10000 });
if (!r.ok) throw Error(r.message);
g = r.game;
// A valid controlled buyer fixture gives each visible counteroffer a supported range.
const sale = g.sales[0];
g.inquiries = [
  {
    id: 'choice-buyer',
    saleId: sale.id,
    traderId: 'olive33',
    name: '올리브',
    price: 1000,
    max: 10000,
    rounds: 0,
  },
];
await writeFile(
  'work/choice-fixtures.json',
  JSON.stringify({ free, pending: save(g) }),
);
