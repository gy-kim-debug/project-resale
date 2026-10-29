import process from 'node:process';
/** Reproducible valuation-only audit. Does not read or write any player's save. */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const beforeSha = '2b28b448b345839b8659d74447fe28be79d6b7ce';
await mkdir('work/valuation-before-source', { recursive: true });
execFileSync(
  'git',
  ['archive', '--output=work/valuation-before.tar', beforeSha, 'src'],
  { stdio: 'ignore' },
);
execFileSync(
  'tar',
  ['-xf', 'work/valuation-before.tar', '-C', 'work/valuation-before-source'],
  { stdio: 'ignore' },
);
await build({
  entryPoints: ['work/valuation-before-source/src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/valuation-before.mjs',
});
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/valuation-after.mjs',
});
const before = await import('../work/valuation-before.mjs'),
  after = await import('../work/valuation-after.mjs');
const samples = { before: [], after: [] };
let paired = 0,
  capBreaches = 0,
  referenceBreaches = 0;
for (let seed = 1; seed <= 1000; seed++) {
  const old = before.newGame(seed),
    current = after.newGame(seed);
  for (const [name, engine, g] of [
    ['before', before, old],
    ['after', after, current],
  ])
    for (const i of g.board) {
      if (
        i.valuationReference &&
        (i.base > i.valuationReference * 3 ||
          i.value > i.valuationReference * 3 ||
          engine.marketValue({ ...g, marketFactor: 115, trend: i.kind }, i) >
            i.valuationReference * 3)
      )
        capBreaches++;
      if (!i.price || i.marketId === 'auction') continue;
      samples[name].push({
        kind: i.kind,
        ratio: i.value / i.price,
        instant: i.value * 0.6 > i.price,
        special: !!i.special,
      });
      if (name === 'after') {
        const previous = old.board.find((p) => p.id === i.id);
        if (previous?.title === i.title && previous.price === i.price) paired++;
        if (
          !i.special &&
          (i.valuationReference < i.price * 0.8 - 50 ||
            i.valuationReference > i.price * 1.3 + 50)
        )
          referenceBreaches++;
      }
    }
}
function stats(rows) {
  const v = rows.map((x) => x.ratio).sort((a, b) => a - b);
  const percent = (fn) =>
    +((rows.filter(fn).length / rows.length) * 100).toFixed(2);
  return {
    count: rows.length,
    median: +v[Math.floor(v.length * 0.5)].toFixed(2),
    p95: +v[Math.floor(v.length * 0.95)].toFixed(2),
    value2x: percent((x) => x.ratio >= 2),
    value3x: percent((x) => x.ratio >= 3),
    value5x: percent((x) => x.ratio >= 5),
    belowAsking: percent((x) => x.ratio < 1),
    instantSaleProfit: percent((x) => x.instant),
    max: +v.at(-1).toFixed(2),
  };
}
const result = {
  beforeSha,
  seeds: 1000,
  scope:
    '60,000 paid non-auction listings per version, before bargaining/fees/repair/buyer matching; initial boards only. Instant sale comparison is potential gross price, not completed profit.',
  pairedListings: paired,
  capBreaches,
  referenceBreaches,
  before: stats(samples.before),
  after: stats(samples.after),
  byKind: Object.fromEntries(
    [...new Set(samples.after.map((x) => x.kind))].map((kind) => [
      kind,
      {
        before: stats(samples.before.filter((x) => x.kind === kind)),
        after: stats(samples.after.filter((x) => x.kind === kind)),
      },
    ]),
  ),
};
if (capBreaches || referenceBreaches || paired !== 60000)
  throw Error('Valuation invariants failed: ' + JSON.stringify(result));
await writeFile(
  'docs/design/economy/VALUATION_AUDIT.json',
  JSON.stringify(result, null, 2) + '\n',
);
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
