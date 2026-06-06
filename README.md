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
- **Python 3.12** con virtualenv en `backend_django/.venv/`
- **Node 18+** / npm

## Arranque rápido

### 1. Base de datos (PostgreSQL)

```powershell
docker compose up -d db
```

Postgres disponible en `localhost:5433`, base de datos `psychosim`.

### 2. Backend Django

```powershell
cd backend_django
./.venv/Scripts/python.exe manage.py runserver 8091
```

API disponible en `http://localhost:8091`. Docs en `http://localhost:8091/swagger-ui.html`.

### 3. Frontend Angular

```powershell
cd frontend
npm install
npm start
```

App disponible en `http://localhost:4200` (proxy automático a la API en `:8091`).

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
