import process from 'node:process';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['tests/engine.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'work/engine.test.mjs',
});
const result = spawnSync(
  process.execPath,
  ['--test', '--test-isolation=none', 'work/engine.test.mjs'],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
