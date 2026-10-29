import process from 'node:process';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'tests/engine.test.ts',
    'tests/actions.test.ts',
    'tests/traders.test.ts',
    'tests/catalog.test.ts',
    'tests/dialogue.test.ts',
    'tests/valuation.test.ts',
    'tests/player-slots.test.ts',
    'tests/amountChoices.test.ts',
    'tests/story.test.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/test-bundles',
  outExtension: { '.js': '.mjs' },
});
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-isolation=none',
    'work/test-bundles/engine.test.mjs',
    'work/test-bundles/actions.test.mjs',
    'work/test-bundles/traders.test.mjs',
    'work/test-bundles/catalog.test.mjs',
    'work/test-bundles/dialogue.test.mjs',
    'work/test-bundles/valuation.test.mjs',
    'work/test-bundles/player-slots.test.mjs',
    'work/test-bundles/amountChoices.test.mjs',
    'work/test-bundles/story.test.mjs',
  ],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
