#!/usr/bin/env node
/**
 * Ejecuta manage.py o pytest en backend_django con el Python del .venv.
 * Uso: node scripts/run-backend.mjs check
 *      node scripts/run-backend.mjs pytest -q
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'backend_django');
const isWin = process.platform === 'win32';

const py = isWin
  ? join(BACKEND, '.venv', 'Scripts', 'python.exe')
  : join(BACKEND, '.venv', 'bin', 'python');

if (!existsSync(py)) {
  console.error('[siep] No existe backend_django/.venv. Ejecuta: npm run up');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('[siep] Uso: node scripts/run-backend.mjs <manage.py-args...>');
  process.exit(1);
}

const isPytest = args[0] === 'pytest';
const cmd = isPytest ? py : py;
const cmdArgs = isPytest
  ? ['-m', 'pytest', ...args.slice(1)]
  : [join(BACKEND, 'manage.py'), ...args];

const result = spawnSync(cmd, cmdArgs, {
  cwd: BACKEND,
  stdio: 'inherit',
  shell: isWin,
});

process.exit(result.status ?? 1);
