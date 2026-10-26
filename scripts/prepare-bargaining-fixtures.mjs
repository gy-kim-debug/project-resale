import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/market-bargaining-engine.mjs',
});
const { newGame, execute } =
  await import('../work/market-bargaining-engine.mjs');
const cases = [];
for (const marketId of [
  'street',
  'computers',
  'instruments',
  'cars',
  'property',
]) {
  let found;
  for (let seed = 1; seed <= 500 && !found; seed++) {
    const initial = newGame(seed);
    initial.cash = 100000000000;
    initial.stats.peakCash = initial.cash;
    for (const item of initial.board.filter(
      (i) =>
        i.marketId === marketId &&
        i.price > 0 &&
        i.listing?.facts.seller === 'ordinary',
    )) {
      let current = structuredClone(initial);
      let changed = false;
      let ok = true;
      for (let round = 0; round < 2; round++) {
        const live = current.board.find((i) => i.id === item.id);
        if (
          !live.offers.length ||
          live.chatSettled ||
          live.negotiation === 'accepted'
        ) {
          ok = false;
          break;
        }
        const result = execute(current, {
          type: 'offer',
          id: item.id,
          price: live.offers[0],
        });
        current = result.game;
        const reply = current.board.find((i) => i.id === item.id);
        if (
          !result.ok ||
          reply.purchaseBargain.walked ||
          reply.negotiation === 'accepted'
        ) {
          ok = false;
          break;
        }
        changed ||=
          reply.negotiatedPrice < (live.negotiatedPrice ?? live.price);
      }
      if (ok && changed) {
        found = {
          marketId,
          id: item.id,
          save: { version: 2, game: initial, favoriteIds: [] },
        };
        break;
      }
    }
  }
  if (!found) throw Error(`Missing multi-round case for ${marketId}`);
  cases.push(found);
}
await writeFile('work/market-bargaining-cases.json', JSON.stringify(cases));
console.log('Prepared five real generated market negotiation cases');
