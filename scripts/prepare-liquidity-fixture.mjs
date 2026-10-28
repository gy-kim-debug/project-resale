import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/liquidity-ui-engine.mjs',
});
const { newGame, execute } = await import('../work/liquidity-ui-engine.mjs');
let fixture;
for (let seed = 1; seed <= 100; seed++) {
  const game = newGame(seed);
  const item = game.board.shift();
  item.checked = true;
  item.value = 100000;
  item.base = 100000;
  item.acquiredFor = 10000;
  game.inventory.push(item);
  let next = execute(game, { type: 'post', id: item.id, price: 1000 });
  if (!next.ok) throw Error(next.message);
  for (let n = 0; n < 2; n++) {
    next = execute(next.game, { type: 'job', id: 'warehouse' });
    if (!next.ok) throw Error(next.message);
  }
  if (next.game.inquiries.length) {
    fixture = { version: 2, game, favoriteIds: [] };
    break;
  }
}
if (!fixture) throw Error('No deterministic inquiry fixture found');
await writeFile('work/liquidity-ui.json', JSON.stringify(fixture));
