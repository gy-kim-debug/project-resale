import { log } from 'node:console';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['src/domain/engine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/tag-engine.mjs',
});
const { newGame } = await import('../work/tag-engine.mjs');
const found = new Set();
for (let seed = 1; seed <= 1000; seed++) {
  const g = newGame(seed);
  for (const item of g.board.filter(
    (i) => i.price > 0 && (!i.marketId || i.marketId === 'street'),
  )) {
    const info = item.listing;
    const cases = {
      'false-limited': info.tags.includes('limited') && !info.facts.limited,
      'true-limited': info.tags.includes('limited') && info.facts.limited,
      'false-authentic':
        info.tags.includes('authentic') && !info.facts.authentic,
      'true-urgent':
        info.tags.includes('urgent') && info.facts.seller === 'urgent',
      'false-firm':
        info.tags.includes('firm') && info.facts.seller === 'negotiable',
    };
    for (const [name, matches] of Object.entries(cases)) {
      if (!matches || found.has(name)) continue;
      const fixture = globalThis.structuredClone(g);
      fixture.cash = 2000000;
      fixture.stats.peakCash = 2000000;
      fixture.board = [globalThis.structuredClone(item)];
      await writeFile(
        `work/tag-${name}.json`,
        JSON.stringify({ version: 2, game: fixture, favoriteIds: [] }),
      );
      found.add(name);
    }
  }
  if (found.size === 5) break;
}
if (found.size !== 5) throw Error('Missing seeded tag scenarios');
log('Generated five genuine engine tag scenarios');
