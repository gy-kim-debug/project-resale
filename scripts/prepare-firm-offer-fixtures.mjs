import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  stdin: {
    contents:
      "export * from './src/domain/engine'; export * from './src/storage/validation'; export * from './src/content/traders';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/firm-offer-engine.mjs',
});
const { newGame, execute, isGame, traderById } =
  await import('../work/firm-offer-engine.mjs');
const g = newGame(42);
g.cash = 5000000;
g.stats.peakCash = g.cash;
const item = g.board.find((i) => i.marketId === 'street' && !i.special);
item.listing.tags[2] = 'firm';
item.listing.facts.seller = 'firm';
item.traderId = 'price31';
item.seller = traderById('price31').name;
const fixtures = {};
for (let seed = 0; seed < 10000 && Object.keys(fixtures).length < 3; seed++) {
  g.seed = seed;
  const r = execute(g, { type: 'offer', id: item.id, price: item.offers[0] });
  if (!r.ok || !isGame(r.game)) throw Error(r.message);
  const after = r.game.board.find((i) => i.id === item.id);
  const outcome =
    after.negotiation === 'accepted'
      ? 'accepted'
      : after.purchaseBargain.walked
        ? 'walked'
        : 'held';
  fixtures[outcome] ??= {
    save: { version: 2, game: structuredClone(g), favoriteIds: [] },
    itemId: item.id,
    offer: item.offers[0],
    asking: item.price,
    seedAfter: r.game.seed,
  };
}
if (Object.keys(fixtures).length !== 3) throw Error('Missing firm outcomes');
await writeFile('work/firm-offer-fixtures.json', JSON.stringify(fixtures));
console.log(
  'Firm offer outcomes prepared: ' + Object.keys(fixtures).join(', '),
);
