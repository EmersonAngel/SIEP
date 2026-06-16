#!/usr/bin/env node
/**
 * Arranca el stack de desarrollo SIEP:
 *   1. PostgreSQL (Docker)
 *   2. Backend Django (:8091)
 *   3. Frontend Angular (:4200)
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'backend_django');
const FRONTEND = join(ROOT, 'frontend');
const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: opts.stdio ?? 'inherit',
    shell: isWin,
    ...opts,
  });
  if (result.status !== 0 && !opts.allowFail) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function venvPython() {
  return isWin
    ? join(BACKEND, '.venv', 'Scripts', 'python.exe')
    : join(BACKEND, '.venv', 'bin', 'python');
}

function venvPythonVersion() {
  const py = venvPython();
  if (!existsSync(py)) {
    return null;
  }
  const result = spawnSync(py, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  const match = (result.stdout ?? result.stderr ?? '').match(/Python (\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return `${match[1]}.${match[2]}`;
}

function isSupportedPython(version) {
  return version === '3.12' || version === '3.13';
}

function ensureLocalSettings() {
  const local = join(BACKEND, 'psychosim', 'settings', 'local.py');
  const example = join(BACKEND, 'psychosim', 'settings', 'local.example.py');
  if (existsSync(local)) {
    return;
  }
  if (!existsSync(example)) {
    console.error('[siep] Falta backend_django/psychosim/settings/local.example.py');
    process.exit(1);
  }
  copyFileSync(example, local);
  console.log('[siep] Creado psychosim/settings/local.py desde local.example.py');
}

function ensureVenv() {
  const existingVersion = venvPythonVersion();
  if (existingVersion && !isSupportedPython(existingVersion)) {
    console.log(`[siep] .venv usa Python ${existingVersion}; recreando con 3.12/3.13...`);
    rmSync(join(BACKEND, '.venv'), { recursive: true, force: true });
  }

  const py = venvPython();
  if (!existsSync(py)) {
    console.log('[siep] Creando entorno virtual Python (3.12 o 3.13)...');
    const attempts = [
      ['py', ['-3.12', '-m', 'venv', '.venv']],
      ['py', ['-3.13', '-m', 'venv', '.venv']],
      ['python3.12', ['-m', 'venv', '.venv']],
      ['python3.13', ['-m', 'venv', '.venv']],
    ];
    let created = false;
    for (const [cmd, args] of attempts) {
      const result = spawnSync(cmd, args, { cwd: BACKEND, stdio: 'pipe', shell: isWin });
      if (result.status === 0) {
        created = true;
        break;
      }
    }
    if (!created) {
      console.error('[siep] Se requiere Python 3.12 o 3.13 (psycopg2 no soporta 3.14 aún).');
      console.error('[siep] En Windows: py install 3.12');
      process.exit(1);
    }
  }

  console.log('[siep] Instalando dependencias Python...');
  const pip = spawnSync(
    venvPython(),
    ['-m', 'pip', 'install', '-q', '-r', 'requirements.txt'],
    { cwd: BACKEND, stdio: 'pipe', encoding: 'utf8' },
  );
  if (pip.status !== 0) {
    process.stderr.write(pip.stderr ?? pip.stdout ?? '');
    console.error('[siep] Falló pip install. ¿Python 3.12/3.13? Ejecuta: py install 3.12');
    process.exit(pip.status ?? 1);
  }
}

function ensureFrontendDeps() {
  if (existsSync(join(FRONTEND, 'node_modules'))) {
    return;
  }
  console.log('[siep] Instalando dependencias del frontend...');
  run('npm', ['install'], { cwd: FRONTEND });
}

function simulationSchemaReady() {
  const result = spawnSync(
    venvPython(),
    [
      'manage.py',
      'shell',
      '-c',
      "from django.db import connection; c=connection.cursor(); c.execute(\"SELECT to_regclass('public.simulation_cases')\"); raise SystemExit(0 if c.fetchone()[0] else 1)",
    ],
    { cwd: BACKEND, stdio: 'pipe', shell: isWin },
  );
  return result.status === 0;
}

function ensureDevDatabase() {
  if (simulationSchemaReady()) {
    return;
  }
  console.log('[siep] Inicializando esquema del simulador y caso demo...');
  run(venvPython(), ['manage.py', 'bootstrap_dev_db'], { cwd: BACKEND });
}

async function startDb() {
  const existing = spawnSync(
    'docker',
    ['ps', '-a', '--filter', 'name=^psychosim-db$', '--format', '{{.Names}}'],
    { stdio: 'pipe', shell: isWin, encoding: 'utf8' },
  );
  const containerName = (existing.stdout ?? '').trim();

  if (containerName === 'psychosim-db') {
    console.log('[siep] Reutilizando contenedor PostgreSQL existente...');
    run('docker', ['start', 'psychosim-db'], { allowFail: false });
  } else {
    console.log('[siep] Iniciando PostgreSQL (Docker)...');
    const compose = spawnSync('docker', ['compose', 'up', '-d', 'db'], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: isWin,
      encoding: 'utf8',
    });
    if (compose.status !== 0) {
      const output = `${compose.stderr ?? ''}${compose.stdout ?? ''}`;
      if (output.includes('already in use')) {
        console.log('[siep] Contenedor ya existe; arrancándolo...');
        run('docker', ['start', 'psychosim-db']);
      } else {
        process.stderr.write(output);
        process.exit(compose.status ?? 1);
      }
    }
  }

  console.log('[siep] Esperando que PostgreSQL esté listo...');
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const result = spawnSync(
      'docker',
      ['exec', 'psychosim-db', 'pg_isready', '-U', 'psychosim'],
      { stdio: 'pipe', shell: isWin },
    );
    if (result.status === 0) {
      console.log('[siep] PostgreSQL listo en localhost:5433');
      return;
    }
    await sleep(1000);
  }

  console.error('[siep] PostgreSQL no respondió. ¿Docker Desktop está corriendo?');
  process.exit(1);
}

function spawnProc(label, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  child.on('exit', (code) => {
    if (code != null && code !== 0) {
      console.error(`[siep] ${label} terminó con código ${code}`);
    }
  });
  return child;
}

async function main() {
  ensureLocalSettings();
  await startDb();
  ensureVenv();
  ensureDevDatabase();
  ensureFrontendDeps();

  console.log('[siep] Iniciando backend Django (:8091) y frontend Angular (:4200)...');
  console.log('[siep] App → http://localhost:4200  |  API → http://localhost:8091');
  console.log('[siep] Ctrl+C detiene backend y frontend (la BD sigue en Docker)\n');

  const children = [
    spawnProc('backend', venvPython(), ['manage.py', 'runserver', '8091'], BACKEND),
    spawnProc('frontend', 'npm', ['start'], FRONTEND),
  ];

  const shutdown = () => {
    for (const child of children) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[siep]', error);
  process.exit(1);
});
