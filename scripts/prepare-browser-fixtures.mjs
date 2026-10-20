import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/browser-engine.mjs',
});
const { newGame, execute } = await import('../work/browser-engine.mjs');
const rich = newGame(31);
rich.cash = 50_000;
rich.stats.peakCash = 50_000;
const empty = newGame(31);
empty.satiety = 0;
empty.health = 20;
const death = newGame(31);
death.satiety = 1;
death.health = 1;
const clear = newGame(31);
clear.cash = 10_000_000_000;
clear.stats.peakCash = clear.cash;
const pending = newGame(31);
pending.cash = 50_000;
pending.stats.peakCash = 50_000;
pending.inventory.push(pending.board.shift());
let p = execute(pending, {
  type: 'post',
  id: pending.inventory[0].id,
  price: 1,
}).game;
for (let n = 0; n < 10 && !p.inquiries.length; n++)
  p = execute(p, { type: 'wait' }).game;
for (const [name, game] of Object.entries({
  rich,
  empty,
  death,
  clear,
  pending: p,
}))
  await writeFile(
    'work/' + name + '.json',
    JSON.stringify({ version: 2, game, favoriteIds: [] }),
  );
