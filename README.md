# SIEP — Sistema de Entrenamiento Psicosocial

Plataforma web académica de la **Corporación Universitaria Empresarial Alexander Von Humboldt** (Programa de Psicología, Armenia, SNIES 101645).

Simulación formativa tipo **RPG clínico top-down**: el estudiante explora mapas de casos psicosociales (VBG, feminicidio, NNA, crisis, rutas de protección), dialoga con NPCs, toma decisiones clínicas y es evaluado por competencias.

## Estructura del monorepo

```
psico_project_v2/
  backend_django/    ← API Django 5.1 + DRF (Python 3.12)
  frontend/          ← App Angular 21 (Signals + Phaser 3 + Konva.js)
  docker-compose.yml ← Servicio PostgreSQL 16 para desarrollo local
  docs/
    PROMPT_MAESTRO.md   ← Fuente de verdad del proyecto
```

## Requisitos previos

- **Docker Desktop** (para la base de datos)
- **Python 3.12 o 3.13** (en Windows: `py install 3.12`)
- **Node 18+** / npm

## Arranque rápido

Desde la raíz del monorepo, un solo comando levanta **PostgreSQL + Django + Angular**:

```powershell
npm run up
```

El script:
1. Inicia PostgreSQL en Docker (`localhost:5433`)
2. Crea `.venv` e instala dependencias Python si hace falta
3. Genera `local.py` de desarrollo si no existe
4. Arranca el backend en `http://localhost:8091` (Swagger: `/swagger-ui.html`)
5. Arranca el frontend en `http://localhost:4200` (proxy automático a la API)

Para detener backend y frontend: `Ctrl+C`. La base de datos sigue en Docker; para pararla:

```powershell
npm run down
```

### Arranque manual (opcional)

```powershell
docker compose up -d db
cd backend_django && ./.venv/Scripts/python.exe manage.py runserver 8091
cd frontend && npm install && npm start
```

## Credenciales demo

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@psychosim.edu.co` | `Admin123!` |
| PROFESOR | `profesora@psychosim.edu.co` | `Profesor123!` |
| ESTUDIANTE | `estudiante@psychosim.edu.co` | `Estudiante123!` |

## Simulador (estudiante)

El estudiante **solo ve casos asignados a su grupo** por un docente. En una BD local vacía también faltan las tablas del simulador (el esquema original venía de Flyway/Spring).

`npm run up` detecta una BD sin simulador y ejecuta el bootstrap automáticamente. Si necesitas repetirlo a mano:

```powershell
cd backend_django
./.venv/Scripts/python.exe manage.py bootstrap_dev_db
```

Eso crea el esquema, el caso `SIM-VBG-001`, el grupo demo `DEMO1` y asigna el caso al estudiante demo.

## Grupos — importar estudiantes por Excel

En **Portal → Grupos → Gestionar**, puedes cargar un archivo `.xlsx` o `.csv` con todos los estudiantes del grupo.

**Formato recomendado (plantilla institucional):**

| N° | Nombres | Apellidos | Correo institucional | Contraseña temporal |
|---|---|---|---|---|
| 1 | Sofía | García Pérez | sofia.garcia01@institucion.edu.co | DaTe9590! |

También acepta columnas en minúsculas (`nombre`, `apellido`, `email`, `password`). La columna **N°** es opcional y se ignora.

El sistema:
- crea cuentas `ESTUDIANTE` que no existan
- asigna al grupo los correos válidos
- reutiliza usuarios existentes con el mismo email
- reporta filas con error sin detener el resto

Usa **Descargar plantilla** en la pantalla para obtener un CSV compatible con Excel.

## Comandos útiles

Desde la raíz del monorepo (entrada única para CI local):

```powershell
npm run check:backend      # manage.py check
npm run test:backend       # pytest -q
npm run test:api:e2e       # matriz HTTP contra localhost:8091 (requiere npm run up)
npm run test:frontend      # Jest Angular
npm run build:frontend     # build de producción
```

```powershell
# Tests backend (manual)
cd backend_django
./.venv/Scripts/python.exe -m pytest -q

# Tests frontend (manual)
cd frontend
npm test -- --watch=false

# Build de producción
cd frontend
npm run build
```

### Prueba e2e HTTP de la API

Con el stack levantado (`npm run up`) y usuarios demo en la BD:

```powershell
npm run test:api:e2e
```

Valida login real (ADMIN / PROFESOR / ESTUDIANTE), acceso sin token, token inválido y permisos por rol en endpoints críticos.

## API REST — rutas reales

Base URL: `http://localhost:8091/api` (Swagger: `http://localhost:8091/swagger-ui.html`).

El enunciado histórico del proyecto usaba prefijos en español (`/api/simulacion`, `/api/usuarios`, `/api/casos`). **El backend Django actual usa rutas en inglés**, alineadas con el frontend:

| Módulo (enunciado histórico) | Ruta real Django | Notas |
|---|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/access-request` | JWT con claims `userId` + `role` |
| Usuarios (admin) | `GET/POST /api/admin/users`, `PUT /api/admin/users/:id` | No existe `/api/usuarios` |
| Solicitudes de acceso | `GET /api/admin/access-requests`, `PATCH /api/admin/access-requests/:id/status` | Público: `POST /api/auth/access-request` |
| Grupos | `GET/POST /api/grupos`, `POST /api/grupos/:id/estudiantes` | |
| Importar estudiantes | `POST /api/grupos/:id/estudiantes/import` | No `/api/grupos/:id/importar-estudiantes` |
| Asignar casos a grupo | `GET/POST/DELETE /api/grupos/:id/casos` | Requiere `grupo_case_version` |
| Casos (authoring) | `GET/POST /api/admin/cases` (sin slash final), `.../api/admin/cases/:id/...` | No existe `/api/casos` público |
| Simulación estudiante | `GET /api/simulation/cases`, `POST /api/simulation/attempts`, `.../decisions`, `.../reflections` | No `/api/simulacion/...` |
| Instructor / trazabilidad | `GET /api/instructor/attempts/recent`, `GET /api/instructor/attempts/:id/trace`, `.../rubric-evaluation` | Solo PROFESOR/ADMIN |
| Reportes | `GET /api/reportes/dashboard`, `GET /api/reportes/grupo/:id`, `.../export` | Estudiante → 403 |

Ver también el informe QA: [`docs/qa-api-siep.md`](docs/qa-api-siep.md).

## Documentación completa

Ver [`docs/PROMPT_MAESTRO.md`](docs/PROMPT_MAESTRO.md) para la arquitectura completa, endpoints, componentes, esquema de BD y decisiones de diseño.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, Django 5.1, DRF, JWT, PostgreSQL 16 |
| Frontend | Angular 21 (Signals), Phaser 3, Konva.js, Angular Material |
| Base de datos | PostgreSQL 16 (esquema gestionado por Flyway) |
| Auth | JWT (simplejwt) — claims `userId` + `role` |
| Cifrado | AES-GCM para bitácoras de reflexión |
