#!/usr/bin/env node
/**
 * Prueba HTTP end-to-end contra el backend vivo (localhost:8091 por defecto).
 * Requiere stack levantado con usuarios demo (npm run up / bootstrap_dev_db).
 *
 * Uso: npm run test:api:e2e
 *      SIEP_API_BASE=http://127.0.0.1:8091/api npm run test:api:e2e
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = (process.env.SIEP_API_BASE ?? 'http://localhost:8091/api').replace(/\/$/, '');

const DEMO_USERS = {
  ADMIN: { email: 'admin@psychosim.edu.co', password: 'Admin123!' },
  PROFESOR: { email: 'profesora@psychosim.edu.co', password: 'Profesor123!' },
  ESTUDIANTE: { email: 'estudiante@psychosim.edu.co', password: 'Estudiante123!' },
};

const failures = [];

function fail(name, detail) {
  failures.push({ name, detail });
  console.error(`  FAIL  ${name}: ${detail}`);
}

function pass(name) {
  console.log(`  OK    ${name}`);
}

async function request(method, path, { token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

async function login(role) {
  const creds = DEMO_USERS[role];
  const res = await request('POST', '/auth/login', { body: creds });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`login ${role} -> ${res.status} ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data.token,
    user: res.data.data.user,
  };
}

function expectStatus(name, actual, expected) {
  const ok = Array.isArray(expected)
    ? expected.includes(actual)
    : actual === expected;
  if (ok) {
    pass(name);
  } else {
    fail(name, `esperado ${expected}, recibido ${actual}`);
  }
}

async function ensureServer() {
  try {
    const res = await request('GET', '/auth/me');
    if (res.status === 401) {
      return true;
    }
    if (res.status >= 500) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[siep] No se pudo conectar a ${API_BASE}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`[siep] API e2e — base ${API_BASE}`);

  if (!(await ensureServer())) {
    console.error('[siep] Levanta el backend (npm run up) antes de ejecutar esta prueba.');
    process.exit(1);
  }

  // Sin token / token inválido
  expectStatus('GET /auth/me sin token -> 401', (await request('GET', '/auth/me')).status, 401);
  expectStatus(
    'GET /auth/me token inválido -> 401',
    (await request('GET', '/auth/me', { token: 'token-invalido.e2e' })).status,
    401,
  );
  expectStatus(
    'GET /simulation/cases sin token -> 401',
    (await request('GET', '/simulation/cases')).status,
    401,
  );

  // Login por rol
  const tokens = {};
  for (const role of Object.keys(DEMO_USERS)) {
    try {
      const session = await login(role);
      tokens[role] = session.token;
      if (session.user.role !== role) {
        fail(`login ${role}`, `rol en respuesta ${session.user.role}`);
      } else {
        pass(`login ${role}`);
      }
    } catch (err) {
      fail(`login ${role}`, err.message);
    }
  }

  if (!tokens.ADMIN || !tokens.PROFESOR || !tokens.ESTUDIANTE) {
    console.error('[siep] Faltan credenciales demo. Ejecuta: manage.py bootstrap_dev_db');
    process.exit(1);
  }

  // Matriz de permisos
  expectStatus(
    'ESTUDIANTE GET /simulation/cases -> 200',
    (await request('GET', '/simulation/cases', { token: tokens.ESTUDIANTE })).status,
    200,
  );
  expectStatus(
    'ESTUDIANTE GET /reportes/dashboard -> 403',
    (await request('GET', '/reportes/dashboard', { token: tokens.ESTUDIANTE })).status,
    403,
  );
  expectStatus(
    'ESTUDIANTE GET /admin/cases -> 403',
    (await request('GET', '/admin/cases', { token: tokens.ESTUDIANTE })).status,
    403,
  );
  expectStatus(
    'PROFESOR GET /reportes/dashboard -> 200',
    (await request('GET', '/reportes/dashboard', { token: tokens.PROFESOR })).status,
    200,
  );
  expectStatus(
    'PROFESOR GET /admin/cases -> 403',
    (await request('GET', '/admin/cases', { token: tokens.PROFESOR })).status,
    403,
  );
  expectStatus(
    'ADMIN GET /admin/cases -> 200',
    (await request('GET', '/admin/cases', { token: tokens.ADMIN })).status,
    200,
  );
  expectStatus(
    'ADMIN GET /admin/users -> 200',
    (await request('GET', '/admin/users', { token: tokens.ADMIN })).status,
    200,
  );
  expectStatus(
    'PROFESOR GET /instructor/attempts/recent -> 200',
    (await request('GET', '/instructor/attempts/recent', { token: tokens.PROFESOR })).status,
    200,
  );
  expectStatus(
    'ESTUDIANTE GET /instructor/attempts/recent -> 403',
    (await request('GET', '/instructor/attempts/recent', { token: tokens.ESTUDIANTE })).status,
    403,
  );

  const loginBad = await request('POST', '/auth/login', {
    body: { email: DEMO_USERS.ADMIN.email, password: 'wrong-password' },
  });
  expectStatus('POST /auth/login credenciales inválidas -> 401', loginBad.status, 401);

  console.log('');
  if (failures.length) {
    console.error(`[siep] ${failures.length} fallo(s) en la matriz API.`);
    process.exit(1);
  }
  console.log('[siep] Matriz API e2e: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
