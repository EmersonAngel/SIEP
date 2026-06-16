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

## Comandos útiles

```powershell
# Tests backend
cd backend_django
./.venv/Scripts/python.exe -m pytest -q

# Tests frontend
cd frontend
npm test -- --watch=false

# Build de producción
cd frontend
npm run build
```

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
