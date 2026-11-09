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
    'tests/eventDepth.test.ts',
    'tests/avatars.test.ts',
    'tests/appraisal.test.ts',
    'tests/conditionGrades.test.ts',
    'tests/intro.test.ts',
    'tests/settlementEvents.test.ts',
    'tests/resumeSession.test.ts',
    'tests/retiredIncome.test.ts',
    'tests/daily.test.ts',
    'tests/stockActions.test.ts',
    'tests/chats.test.ts',
  ],
  bundle: true,
  external: ['react', 'react-dom/server'],
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
    'work/test-bundles/eventDepth.test.mjs',
    'work/test-bundles/avatars.test.mjs',
    'work/test-bundles/appraisal.test.mjs',
    'work/test-bundles/conditionGrades.test.mjs',
    'work/test-bundles/intro.test.mjs',
    'work/test-bundles/settlementEvents.test.mjs',
    'work/test-bundles/resumeSession.test.mjs',
    'work/test-bundles/retiredIncome.test.mjs',
    'work/test-bundles/daily.test.mjs',
    'work/test-bundles/stockActions.test.mjs',
    'work/test-bundles/chats.test.mjs',
  ],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
