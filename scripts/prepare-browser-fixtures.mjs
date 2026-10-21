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

// Real purchases for acquisition-cost and appraisal UI checks.
let comparison = newGame(31);
comparison.cash = 100_000;
comparison.stats.peakCash = comparison.cash;
for (let n = 0; n < 3; n++) {
  const id = comparison.board[0].id;
  comparison = execute(comparison, {
    type: 'offer',
    id,
    price: comparison.board[0].offers[1],
  }).game;
  comparison = execute(comparison, { type: 'buy', id }).game;
  if (n !== 1) comparison = execute(comparison, { type: 'check', id }).game;
}
comparison.satiety = 100;
comparison.fatigue = 100;
// Keep one old snapshot shape to verify fallback to its actual agreement.
delete comparison.inventory[2].acquiredFor;
await writeFile(
  'work/inventory-comparison.json',
  JSON.stringify({ version: 2, game: comparison, favoriteIds: [] }),
);

const counter = globalThis.structuredClone(p);
counter.sales[0].price = 1000;
counter.inventory[0].value = 10000;
counter.inventory[0].base = 10000;
counter.inventory[0].condition = '양호';
counter.inventory[0].checked = true;
counter.inquiries[0].price = 100;
counter.inquiries[0].max = 500;
counter.inquiries[0].rounds = 0;
counter.inquiries[0].chat = [
  { speaker: 'other', text: '100 원에 거래할 수 있을까요?' },
];
await writeFile(
  'work/seller-counter.json',
  JSON.stringify({ version: 2, game: counter, favoriteIds: [] }),
);
