import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/domain/conditionGrades.ts',
    'src/storage/validation.ts',
    'src/content/marketProducts.ts',
    'src/domain/repairPolicy.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/repair-policy-fixture-code',
  outExtension: { '.js': '.mjs' },
});
const { newGame } =
  await import('../work/repair-policy-fixture-code/domain/engine.mjs');
const { assignGrade } =
  await import('../work/repair-policy-fixture-code/domain/conditionGrades.mjs');
const { isGame } =
  await import('../work/repair-policy-fixture-code/storage/validation.mjs');
const { MARKET_PRODUCTS } =
  await import('../work/repair-policy-fixture-code/content/marketProducts.mjs');
const { repairMode } =
  await import('../work/repair-policy-fixture-code/domain/repairPolicy.mjs');
const fixtures = {};
for (const [key, title, category] of [
  ['allowed', '탁상 조명', 'lighting'],
  ['blocked', '문학 전집', 'books'],
]) {
  const g = newGame(42);
  g.story = undefined;
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  g.seed = 0;
  const i = g.board.shift();
  Object.assign(i, {
    title,
    category,
    kind: '생활',
    base: 100000,
    valuationReference: 100000,
    acquiredFor: 50000,
  });
  assignGrade(i, 0.8, 0.5, 0.9);
  i.checked = true;
  g.inventory = [i];
  if (!isGame(g)) throw Error('Invalid ' + key);
  fixtures[key] = { version: 2, game: g, favoriteIds: [] };
}
const policies = Object.entries(MARKET_PRODUCTS).flatMap(([market, products]) =>
  products.map((p) => ({
    market,
    title: p.title,
    category: p.category,
    mode: repairMode(p),
  })),
);
await writeFile('work/repair-policy-fixtures.json', JSON.stringify(fixtures));
await writeFile(
  'work/repair-policy-catalogue.json',
  JSON.stringify(policies, null, 2),
);
process.stdout.write(
  JSON.stringify({
    products: policies.length,
    blocked: policies.filter((p) => p.mode === 'none').length,
    allowed: policies.filter((p) => p.mode !== 'none').length,
  }) + '\n',
);
