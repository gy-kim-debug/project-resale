import process from 'node:process';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/content/traders.ts',
    'src/content/collection.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/profile-qa',
  outExtension: { '.js': '.mjs' },
});
const { newGame, execute } =
  await import('../work/profile-qa/domain/engine.mjs');
const { traderById } = await import('../work/profile-qa/content/traders.mjs');
const { ITEM_CODEX, codexKey } =
  await import('../work/profile-qa/content/collection.mjs');
let game, firm, flex;
for (let seed = 1; seed < 100; seed++) {
  game = newGame(seed);
  firm = game.board.find(
    (i) => i.marketId === 'street' && traderById(i.traderId)?.style === 'firm',
  );
  flex = game.board.find(
    (i) =>
      i.marketId === 'street' && traderById(i.traderId)?.style === 'flexible',
  );
  if (firm && flex) break;
}
if (!firm || !flex) throw Error('fixture missing');
game.cash = 10000000;
game.stats.peakCash = 10000000;
const save = (g) => ({
  version: 2,
  game: g,
  favoriteIds: [],
  selectedMarket: 'street',
  readNotificationIds: [],
});
const purchased = execute(game, { type: 'buy', id: flex.id });
if (!purchased.ok) throw Error(purchased.message);
let selling = execute(purchased.game, {
  type: 'post',
  id: flex.id,
  price: 100,
}).game;
for (let n = 0; n < 5 && !selling.inquiries.length; n++)
  selling = execute(selling, { type: 'wait' }).game;
if (!selling.inquiries.length) throw Error('no buyer');
await writeFile(
  'work/profile-fixtures.json',
  JSON.stringify({
    initial: save(game),
    inquiries: save(selling),
    firm,
    flex,
    key: codexKey(flex),
    codexSize: ITEM_CODEX.filter((e) => !e.legacy).length,
  }),
);
process.stdout.write(
  JSON.stringify({
    entries: ITEM_CODEX.filter((e) => !e.legacy).length,
    firm: firm.seller,
    flex: flex.seller,
    buyers: selling.inquiries.map((q) => q.name),
  }) + '\n',
);
