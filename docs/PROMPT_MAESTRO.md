# PROMPT MAESTRO — SIEP (Django + Angular)

> **Fuente de verdad viva del proyecto.** Última actualización completa: **2026-06-05**.  
> El changelog Java-era detallado vive en el historial git de este archivo y en `PLAN_MAESTRO_EJECUCION_V3.md` / `PROMPT_MIGRACION_DJANGO.md` (marcados HISTÓRICOS).  
> Toda transformación importante debe registrarse en la sección **Historial** al final.

---

## 1. Producto

**SIEP — Sistema de Entrenamiento Psicosocial.**  
Plataforma web académica de la **Corporación Universitaria Empresarial Alexander Von Humboldt** (Programa de Psicología, Armenia, SNIES 101645). Simulación formativa tipo **RPG clínico top-down**: el estudiante explora mapas de casos psicosociales (VBG, feminicidio, NNA, crisis, rutas de protección), dialoga con NPCs, toma decisiones clínicas y es evaluado por competencias — entrenamiento **ético**, no un examen.

> **Marca vs. identificadores técnicos:** la marca visible es **SIEP**; el código conserva `psychosim` / `PsychoSim` por compatibilidad con el esquema Flyway y el frontend (tokens CSS, configuración, seeds).

### Dominio sensible
Contenido clínico real de VBG / feminicidio / NNA. Los repos **deben ser privados** (actualmente son públicos — pendiente corregir). No sembrar datos reales de pacientes en ningún entorno. Reflexiones cifradas en reposo.

---

## 2. Monorepo — estructura real

**Un único repositorio activo:** `Jsua3/psico_project_v2`  
Directorio local: `D:/Sua_Files/IdeaProjects/psico_project_v2/`

> El repo `Jsua3/Proyecto_psicologia` permanece en GitHub como archivo histórico (historial git del frontend pre-monorepo). El backend Spring (`backend/`) allí está CONGELADO y no se toca.

### Árbol de directorios clave

```
psico_project_v2/          ← MONOREPO — único repo activo
  backend_django/           ← código Python activo
    psychosim/settings/     ← base / local / test / production
    apps/                   ← ver §6
    shared/                 ← response.py, permissions.py, exceptions.py, jsonutils.py
    .venv/                  ← entorno virtual (gitignored)
  frontend/                 ← Angular 21 (antes en Proyecto_psicologia/admin-panel/)
    src/app/
      core/                 ← auth, api services, models, guards, config
      features/             ← ver §9
      shared/layout/        ← shell.component, layout base
    src/assets/
      game/maps/            ← Tiled JSON (14 mapas)
      game/scenarios/       ← ScenarioConfig JSON (7 escenas hardcodeadas)
      images/institution/   ← logos, hero images
    proxy.conf.json         ← apunta a Django :8091
    proxy.django.json       ← preset Django :8091
    proxy.spring.json       ← preset Spring :8090 (alternativa)
  docker-compose.yml        ← solo el servicio `db` se usa (Postgres :5433)
  .env.example              ← plantilla de secretos (POSTGRES_PASSWORD, JWT_SECRET…)
  docs/
    PROMPT_MAESTRO.md       ← este archivo
    superpowers/specs/      ← specs por slice
    superpowers/plans/      ← planes de implementación por slice
```

### Principio arquitectónico clave

Django **mapea** las tablas Flyway con `managed = False` y **nunca muta el esquema**.  
El contrato HTTP es **idéntico** al de Spring para que el frontend no requiera cambios.  
**Flyway (Spring) es dueño del esquema** y está congelado — cualquier cambio de esquema es RNF-010 (requiere discusión explícita antes de tocar).

---

## 3. Stack backend (Django)

| Capa | Tecnología |
|---|---|
| Lenguaje | Python 3.12 |
| Framework | Django 5.1 + Django REST Framework 3.15 |
| Auth | `djangorestframework-simplejwt` — claims `userId` (int) + `role` (`ADMIN|PROFESOR|ESTUDIANTE`); expiración 8 h |
| CORS | `django-cors-headers` |
| DB driver | `psycopg2-binary` → PostgreSQL 16 (`psychosim` en `localhost:5433`) |
| Cifrado | `cryptography` — AES-GCM para bitácoras (`reflection_journals`) en reposo |
| Docs API | `drf-spectacular` → OpenAPI 3 + Swagger UI en `/swagger-ui.html` |
| Tests | `pytest` + `pytest-django` contra la BD real (rollback por test; settings `psychosim.settings.test`) |
| Hashers | BCryptSHA256 primero (compatible con Spring/Spring Security) |

### Settings por entorno

- `base.py` — configuración compartida; defaults de desarrollo (rechazados en prod).
- `local.py` — `DEBUG=True`, CORS open.
- `test.py` — usa BD real con `DATABASES["TEST"]`.
- `production.py` — exige `DJANGO_SECRET_KEY`, `DB_PASSWORD`, `JWT_SECRET` por env; rechaza defaults; `DEBUG=False`; CORS/HTTPS duros.

---

## 4. Stack frontend (Angular)

| Capa | Tecnología |
|---|---|
| Framework | Angular 21 — componentes standalone + Signals |
| UI kit | Angular Material (tema personalizado) |
| Estilo | SCSS; tokens CSS `--psy-*` (paleta azul/teal/lavanda); estética **liquid-glass**; `prefers-reduced-motion` |
| Editor visual | **Konva.js** — canvas del world-editor (`world-editor/`) |
| Runtime juego | **Phaser 3** — mundo jugable (`game-world.component.ts`) |
| HTTP | `HttpClient` + proxy → Django `:8091` (vía `proxy.conf.json`) |
| Tests unitarios | Jest + ts-jest (55–64 specs) |
| Build | ng build (Angular CLI) |
| Escenas Tiled | Tiled JSON cargados por Phaser (tileset Kenney) |

---

## 5. Base de datos (PostgreSQL — Flyway)

BD `psychosim` en `localhost:5433`. Esquema creado y mantenido por Flyway (dentro del Spring FROZEN). Migraciones V1–V8 ya aplicadas en el volumen Docker `postgres_data`.

### Tablas Flyway mapeadas (managed=False en Django)

**Usuarios y grupos**
- `users` — `CustomUser` (id, email, nombre, apellido, role, password_hash BCrypt)
- `grupos` — cohortes académicas (nombre, codigo, profesor_id)
- `grupo_estudiante` — M2M grupos↔usuarios

**Simulación — estructura del caso**
- `simulation_cases` — caso clínico (code `SIM-VBG-001`, title, description)
- `case_versions` — versión jugable (`status`: DRAFT→IN_REVIEW→PUBLISHED→ARCHIVED; `version` int para optimistic-lock; `semantic_version`)
- `simulation_nodes` — nodo del DAG (title, narrative, type, terminal, sensitiveContent, warningMessage, safeExitRequired)
- `decision_options` — aristas del DAG (text, classification: `ADEQUATE|RISKY|INADEQUATE`; prohibitedConduct + prohibitionReason)

**Simulación — runtime del jugador**
- `simulation_attempts_v2` — intento (UUID id, student_id, case_version_id, status: `IN_PROGRESS|COMPLETED|SAFE_EXITED|ABANDONED`, current_node_id, accumulated_score, stress_index, attempt_token, started_at, ended_at)
- `attempt_events` — log de eventos del intento (event_type, node_id, detail, timestamp)
- `reflection_journals` — bitácoras del estudiante (AES-GCM, cifradas en reposo)
- `attempt_world_states` — estado del mundo para el intento (scene_map_id, player_x/y, inventory_json, inspected/viewed/used keys JSON, **flags_json** incl. `syncedNodeId`)

**Mundo explorable**
- `scene_maps` — mapa por nodo (`map_key` apunta a Tiled JSON, title, width, height, theme, spawn_x/y, **ambient_json**: `{cameraZoom, backgroundImage}`)
- `map_objects` — objetos interactuables (type: `PERSON|OBJECT|ROUTE|TOOL|WARNING|EXIT`; x/y/w/h, icon, color, interaction_prompt/text, **decision_option_id**, **tool_code**, **movement_pattern_json** `{pattern, waypoints}`, **metadata_json** `{targetNodeKey, entryX, entryY}` para puertas EXIT, facing)
- `collision_zones` — zonas sólidas (x/y/w/h)
- `dialogue_trees` — árbol de diálogo por objeto (speaker_name, portrait_key, emotion)
- `dialogue_lines` — líneas en orden (display_order, text, emotion, speaker_name)
- `dialogue_choices` — opciones de respuesta (text, **decision_option_id** → ramifica DAG, required_tool_code, effect_json)
- `clinical_tools` — herramientas clínicas del caso (tool_code, label, icon, category, description)

**Evaluación y auditoría**
- `rubrics`, `rubric_criteria`, `rubric_evaluations`, `criterion_scores` — rúbricas instructor
- `publication_checklists` — checklist previo a publicar versión
- `audit_logs` — log de auditoría (Django signals → retención 12 meses; nunca interrumpe operación)

**Legacy (tablas existentes, apps Python removidas en T3.2)**
- `casos`, `escenarios`, `preguntas`, `opciones`, `sesiones_juego`, `respuestas` — quiz ABCD original. **Las tablas existen** (retención de datos) pero **el código Python fue eliminado**. No recrear las apps sin decisión explícita.

---

## 6. Apps Django activas

Post-T3.2 (ramas `feat/retire-legacy-quiz` + `master`):

| App | Descripción |
|---|---|
| `apps.users` | Modelo `CustomUser` (managed=False sobre `users`), login JWT, register, /me |
| `apps.grupos` | Cohortes: listar, crear, agregar/remover estudiantes |
| `apps.simulation` | **Núcleo.** Catálogo de casos, intentos, decisiones, reflexiones, mundo, autoría, trazabilidad instructor |
| `apps.reportes` | Dashboard + reporte de grupo + export CSV — **solo-simulador** (extraído de legacy en T3.2) |
| `apps.progression` | Catálogo de casos publicados para el estudiante; progreso/desbloqueo |

> **`apps.casos` y `apps.sesiones`:** los directorios existen en disco (con `__pycache__/` y `migrations/`) como artefactos de git-rm, pero **no están en `INSTALLED_APPS`** y no tienen archivos Python activos.

---

## 7. Endpoints API (Django master)

```
POST  /api/auth/login
POST  /api/auth/register
GET   /api/auth/me

GET   /api/grupos
POST  /api/grupos
GET   /api/grupos/<id>
POST  /api/grupos/<id>/agregar-estudiante
POST  /api/grupos/<id>/remover-estudiante

GET   /api/reportes/dashboard
GET   /api/reportes/grupo/<id>?caseVersionId=<n>
GET   /api/reportes/grupo/<id>/export?caseVersionId=<n>   ← CSV attachment

# --- Simulación: estudiante ---
GET   /api/simulation/cases
POST  /api/simulation/attempts                  ← iniciar intento
GET   /api/simulation/attempts/<uuid>
POST  /api/simulation/attempts/<uuid>/decisions
GET   /api/simulation/attempts/<uuid>/world
POST  /api/simulation/attempts/<uuid>/world/position
POST  /api/simulation/attempts/<uuid>/world/interact/<key>
POST  /api/simulation/attempts/<uuid>/world/tool
POST  /api/simulation/attempts/<uuid>/enter-room    ← Fase 5 puertas espaciales
POST  /api/simulation/attempts/<uuid>/reflection
GET   /api/simulation/attempts/<uuid>/reflection
POST  /api/simulation/attempts/<uuid>/safe-exit
POST  /api/simulation/attempts/<uuid>/complete

# --- Autoría: admin ---
GET   /api/admin/cases
POST  /api/admin/cases
GET   /api/admin/cases/<id>
PUT   /api/admin/cases/<id>
GET   /api/admin/cases/<id>/versions
POST  /api/admin/cases/<id>/versions
POST  /api/admin/cases/<id>/versions/<vid>/clone
POST  /api/admin/cases/<id>/versions/<vid>/publish
GET/POST/PUT/DELETE  /api/admin/cases/<id>/versions/<vid>/nodes
GET/POST/PUT/DELETE  /api/admin/cases/<id>/versions/<vid>/decisions
GET/POST/PUT/DELETE  /api/admin/cases/<id>/versions/<vid>/maps
GET/POST/PUT/DELETE  /api/admin/cases/<id>/versions/<vid>/objects
GET/POST/PUT/DELETE  /api/admin/cases/<id>/versions/<vid>/tools
POST  /api/admin/cases/<id>/versions/<vid>/world-editor   ← save_world
GET   /api/admin/cases/<id>/versions/<vid>/world          ← world_editor (rooms + availableDecisions)
GET   /api/admin/cases/<id>/versions/<vid>/validate

# --- Instructor ---
GET   /api/instructor/attempts
GET   /api/instructor/attempts/<uuid>/trace
POST  /api/instructor/attempts/<uuid>/rubric-evaluation
```

**Envoltorio estándar:** `{"data": <payload|null>, "message": "<texto>"}`.

---

## 8. Frontend — mapa completo de componentes

### Core

| Archivo | Propósito |
|---|---|
| `core/auth/auth.service.ts` | JWT login/logout/refresh; `currentUser()` signal |
| `core/auth/auth.guard.ts` | Guard de rutas autenticadas |
| `core/auth/token.utils.ts` | Parse/validación de JWT |
| `core/auth/jwt.interceptor.ts` | Adjunta Bearer token a requests |
| `core/api/simulation.service.ts` | Todas las llamadas al simulador (intentos, mundo, decisiones, etc.) |
| `core/api/reporte.service.ts` | Dashboard + reporte de grupo + CSV (sim-only; sin `casoId` desde T3.2) |
| `core/api/grupo.service.ts` | CRUD grupos + enrolamiento |
| `core/api/user-admin.service.ts` | Admin: listar/crear/editar usuarios |
| `core/models/sesion.model.ts` | Tipos TS del reporting (Dashboard, ReporteGrupo, etc.) — sim-only desde T3.2 |
| `core/models/simulation.model.ts` | Tipos del simulador (SimulationAttempt, WorldState, MapObject…) |
| `core/config/brand.config.ts` | Constantes de marca (shortName, fullName, formalName) |
| `core/notifications/notification.service.ts` | Notificaciones toast globales |
| `shared/layout/shell.component.ts` | Shell del portal autenticado (sidenav + topbar + nav por rol) |

### Features

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `features/public/landing.component` | Público (sin auth) |
| `/login` | `features/login/login.component` | Público |
| `/portal/dashboard` | `features/dashboard/dashboard.component` | Todos los roles |
| `/portal/jugar` | `features/simulator/game-menu.component` | ESTUDIANTE / ADMIN |
| `/portal/simulador` | `features/simulator/simulation-catalog.component` | Todos |
| `/portal/simulador/:caseVersionId` | `features/simulator/simulation-play.component` | ESTUDIANTE / ADMIN |
| `/portal/casos/:caseVersionId/editor` | `features/simulator/case-editor.component` | ADMIN |
| `/portal/docente/trazabilidad` | `features/simulator/instructor-trace.component` | PROFESOR / ADMIN |
| `/portal/grupos` | `features/grupos/grupo-list.component` | PROFESOR / ADMIN |
| `/portal/reportes` | `features/reportes/reporte-grupo.component` | PROFESOR / ADMIN |
| `/portal/admin/usuarios` | `features/admin/users.component` | ADMIN |

> ⚠️ **Deuda conocida — Landing page:** el componente `features/public/landing.component` **existe** como archivo y está ruteado en `path: ''` (público, sin auth), pero **no está implementado como landing institucional real**. Actualmente es una estructura básica. **Pendiente: construir la landing pública de SIEP** (presentación del programa, acceso al simulador, info institucional).

### Componentes del simulador (detalle)

| Componente | Descripción |
|---|---|
| `simulation-play.component` | Wrapper del juego completo: HUD + canvas Phaser + paneles laterales + diálogos + journal. Orquesta todo el ciclo de un intento. |
| `game-world.component` | Runtime **Phaser 3**: carga mapa Tiled, renderiza NPCs/objetos/colisiones, aplica zoom + fondo autoriado, detecta puertas EXIT → emite `enterRoom`, proximity `E`. |
| `simulation-hud.component` | HUD: progreso, stress, nodo actual, inventario de herramientas. |
| `dialogue-panel.component` | Panel de diálogo NPC: typewriter, opciones de respuesta, cierre. |
| `journal-panel.component` | Bitácora de reflexión del estudiante. |
| `minimap.component` | Minimapa del mapa Tiled actual. |
| `outcome-screen.component` | Pantalla de resultado al completar/salir del intento. |
| `tool-inventory.component` | Inventario de herramientas clínicas desbloqueadas. |
| `supervision-feedback.component` | Panel de retroalimentación del supervisor. |
| `game-menu.component` | Menú de selección de escenario para el estudiante (ScenarioConfig). |
| `simulation-catalog.component` | Catálogo de versiones publicadas para jugar o editar. |
| `instructor-trace.component` | Trazabilidad: intentos, decisiones, rúbricas por instructor. |
| `dag-editor.component` | Editor visual del DAG (nodos + aristas); pestaña "DAG" del case-editor. |
| `case-editor.component` | Shell del editor: tabs DAG / Mundo. Wrapea `dag-editor` + `world-editor`. |
| `world-editor/world-editor.component` | Editor visual Konva del mundo: lienzo, inspector, sidebar. |
| `world-editor/world-editor.store.ts` | Estado del editor: comandos (`UpsertDialogueCommand`, `SetMapAmbientCommand`, etc.), `rooms`, `availableDecisions`, `pathEditMode`. |
| `world-editor/path-edit.util.ts` | Helpers puros de edición de waypoints NPC. |
| `world-editor/room-edit.util.ts` | Helpers puros de edición de salas/puertas. |
| `world-preview.component` | Preview Phaser del mundo en el editor. |
| `audio.service.ts` | Audio: footsteps + UI blips (Kenney CC0). |
| `hud-dock.util.ts` | Utilidades del dock HUD. |
| `scene-motion.util.ts` | Utilidades de movimiento de escena. |

### Configs hardcodeados (ScenarioConfig — coexistencia)

Los siguientes archivos **existen a propósito** y NO se eliminan (ver T3.1 en §13):

```
comisaria-map.config.ts      hospital-map.config.ts
risky-interaction.config.ts  scene-guide.config.ts
scene-objectives.config.ts   scene-map-display.util.ts
kenney-frames.constants.ts
assets/game/scenarios/*.json  (7 JSON: comisaria-familia, urgencias-crisis, etc.)
assets/game/maps/*.json       (14 mapas Tiled)
```

---

## 9. Editor de casos — Fases 1–5 ✅ COMPLETO

Sub-proyecto E: autoría visual + runtime del mundo del caso. Cada fase tuvo su spec → plan → TDD → verify → rama propia.

| Fase | Descripción | Ramas |
|---|---|---|
| 1 — Diálogos + decisiones | Inspector NPC: líneas + opciones de respuesta cableadas a aristas del DAG. `save_world` persiste árboles/líneas/choices; `world_editor` expone `availableDecisions`. | `feat/case-editor-dialogues` |
| 2 — Paths de NPC | Waypoints en lienzo Konva (`movementPattern`: idle/wander/patrol). Runtime ya los reproduce (`AmbientMover`). Sin cambios backend. | `feat/case-editor-npc-paths` |
| 3 — Multi-sala + puertas + zoom + fondo | Salas = nodos; puertas como objetos EXIT con `metadata_json={targetNodeKey,entryX,entryY}`; zoom/fondo en `ambient_json`; switcher de sala en el editor. Sin migración. | `feat/case-editor-multiroom` |
| 4 — Runtime aplica zoom + fondo | `renderWorld` lee `world.map.ambient.cameraZoom` (default 2) y `backgroundImage`. | `feat/case-editor-runtime-ambient` |
| 5 — Puertas espaciales en runtime | Caminar a un EXIT carga la sala destino (no puntuado); desacoplado del nodo DAG vía `flags.syncedNodeId`; `POST /attempts/<id>/enter-room`. Las decisiones siguen rigiendo el DAG y sobrescriben la puerta. | `feat/case-editor-spatial-doors` |

---

## 10. Dos sistemas de mundo (coexistencia)

El runtime tiene **dos caminos** que coexisten **a propósito**:

| Sistema | Descripción | Usado por |
|---|---|---|
| **BD-driven** (`/world` → `renderWorld`) | Autorado con el editor Konva; multi-sala; decisiones; puertas Fase 5. | Casos `SIM-VBG-001` y todos los creados con el editor |
| **ScenarioConfig** (hardcodeado) | `simulation-play` hace `fetch('/assets/game/scenarios/<key>.json')` y `gameWorld.setScenarioConfig(...)`; usa `renderRoom`/`transitionToRoom`/`checkExitTriggers`. | Escenas comisaría/hospital/urgencias (multi-sala intra-nodo) |

**¿Por qué coexisten?** Las escenas ScenarioConfig tienen **varias salas espaciales dentro de UN nodo clínico** (ej. comisaría: sala-espera → consultorio → supervisor). El modelo BD es **1 `scene_map` por nodo (UNIQUE)**. Converger exigiría (a) cambiar el esquema (Flyway, Spring FROZEN, RNF-010) o (b) romper el grafo clínico. → **T3.1 cerrado como coexistencia justificada.** No eliminar sin decisión explícita de modelo multi-sala-por-nodo.

---

## 11. Cómo correr (Windows — monorepo)

```powershell
# 1. Levantar BD (desde raíz del monorepo) — requiere Docker Desktop
cd D:/Sua_Files/IdeaProjects/psico_project_v2
docker compose up -d db
# → Postgres en localhost:5433, BD psychosim; volumen postgres_data ya tiene Flyway V1-V8 + seeds

# 2. Backend Django (desde backend_django/)
cd D:/Sua_Files/IdeaProjects/psico_project_v2/backend_django
./.venv/Scripts/python.exe -m pytest -q          # suite completa (rollback por test)
./.venv/Scripts/python.exe manage.py check       # verificar config
./.venv/Scripts/python.exe manage.py runserver 8091   # servidor dev (DJANGO_SETTINGS_MODULE=psychosim.settings.local)

# 3. Frontend Angular (desde frontend/)
cd D:/Sua_Files/IdeaProjects/psico_project_v2/frontend
npm install              # primera vez o tras cambios en package.json
npm start                # ng serve → http://localhost:4200 (proxy a :8091)
npm run build            # build de producción
npm test -- --watch=false    # jest unit tests
```

### Credenciales demo (sembradas por Flyway)

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@psychosim.edu.co` | `Admin123!` |
| PROFESOR | `profesora@psychosim.edu.co` | `Profesor123!` |
| ESTUDIANTE | `estudiante@psychosim.edu.co` | `Estudiante123!` |

### Caso jugable de referencia

`SIM-VBG-001` → `caseVersionId = 1` (6 nodos, 12 decisiones, 6 salas, caso comisaría).

### Proxy alternativo

Para usar Spring en lugar de Django: cambiar `proxy.conf.json` por el contenido de `proxy.spring.json` (apunta a `:8090`).

### gh CLI

**No está instalado** → crear PRs por URL web de GitHub.

---

## 12. Seguridad (estado verificado 2026-06-05)

✅ **Sin secretos reales en git.** `.gitignore` cubre `.env`, `*.log`, `.venv`, `node_modules`, `dist`, `.angular`. Logs de servidor no versionados.

✅ **`production.py` exige y rechaza defaults de desarrollo.** `DJANGO_SECRET_KEY`, `DB_PASSWORD`, `JWT_SECRET` deben ser provistas por variable de entorno; debug off; CORS/HTTPS endurecidos.

✅ **Defaults de dev en `base.py`** son intencionalmente débiles para que el dev funcione sin `.env`; `production.py` los rechaza. `.env.example` documenta las variables necesarias.

✅ **Cifrado de bitácoras AES-GCM** en `reflection_journals`. Clave = `REFLECTION_ENCRYPTION_KEY` (cae al `JWT_SECRET` si no se provee). En producción debe ser clave distinta, fuerte y privada.

⚠️ **Repos `Jsua3/*` actualmente PÚBLICOS** (`"private": false` confirmado). **Deben volverse privados** (Settings → Danger Zone → Make private) — dominio clínico sensible.

⚠️ **Cuentas demo** sembradas por Flyway: nunca usar/mantener en producción.

---

## 13. Estado de ramas (2026-06-05)

### Backend — `Jsua3/psico_project_v2`

| Rama | Estado |
|---|---|
| `master` | **Rama principal.** Incluye: docs completos (specs/plans/prompts), T3.2 (retiro quiz), cleanup Tier 1+2, `shared/jsonutils`. **No tiene código de features** (código va en ramas feature). |
| `feat/case-editor-*` (5 ramas) | Código del editor Fases 1-5 — pusheadas, mergeadas a master (la PR #1 ya está mergeada; las demás por hacer). |
| `feat/retire-legacy-quiz` | T3.2: extracción `apps.reportes` + borrado `apps.casos`/`sesiones`. **Mergeada en `origin/master`.** |
| `chore/cleanup-django` | Cleanup Tier 1+2: borrado `client/`, `engine/`, `desktop.ini`, dedupe jsonutils. Mergeada. |

### Frontend — `Jsua3/Proyecto_psicologia`

| Rama | Estado |
|---|---|
| `origin/main` | Línea **ACT1-4**: auth overhaul, gestión usuarios admin, dashboard rediseñado (html/scss/ts separados), instructor-trace grande (~1242 líneas), notificaciones, login Phaser. **Rama canónica del usuario.** |
| `feat/case-editor-*` (5 ramas) | Código del editor Fases 1-5 — pusheadas. |
| `feat/retire-legacy-quiz` | T3.2 del frontend (quiz UI removido, sim-only). Pusheada como PR. |
| `integrate/case-editor-into-main` | **PR de integración** (pusheada, PR abierta). Une la línea del editor + cleanup + T3.2 **con `origin/main` (ACT) como base**. Verificado: ng build OK, jest 64/64. Conflictos resueltos. Fast-forward cuando el usuario la mergee. |
| `chore/cleanup-django` | Cleanup Tier 1+2 del frontend. Pusheada. |
| `main` (local) | 16 commits "living-world" sin pushear (feat: camera-follow, audio, multi-room, NPCs, etc.) — **no incluidos en la integración**, pendiente de reconciliar por separado. |

---

## 14. Cleanup Tier 3 (decisiones tomadas)

| Sub-proyecto | Estado | Notas |
|---|---|---|
| **T3.1** ScenarioConfig → BD | **Coexistencia justificada — no se converge.** | Muro del modelo: salas intra-nodo vs. 1 `scene_map`/nodo (UNIQUE). Ver §10. |
| **T3.2** Quiz legacy `casos`/`sesiones` | **✅ HECHO** (`feat/retire-legacy-quiz`, mergeado en backend master). | Extraído `apps.reportes` sim-only; borradas apps quiz; tablas intactas. pytest 107, jest 55/64, ng build, smoke. |
| **T3.3** Retiro Spring backend | **DIFERIDO** hasta validar Django en PRODUCCIÓN. | Flyway (dueño del esquema) vive en Spring. Requiere plan de ownership de esquema antes de tocar. **NO tocar `psicologia_proyecto/backend/`.** |

Roadmap completo: `docs/superpowers/2026-06-05-cleanup-tier3-roadmap.md`.

---

## 15. Deudas conocidas y próximos pasos

| Prioridad | Ítem | Estado |
|---|---|---|
| ✅ Resuelta | **Landing page** — implementada completamente en `frontend/src/app/features/public/` (HTML + SCSS + TS) | HECHO |
| ✅ Resuelta | **Monorepo** — frontend consolidado en `psico_project_v2/frontend/` | HECHO |
| 🔴 Alta | **Repos privados** — `Jsua3/psico_project_v2` y `Jsua3/Proyecto_psicologia` actualmente públicos (`"private": false`). Hacer privados en GitHub Settings → Danger Zone. | PENDIENTE (manual) |
| 🟡 Media | **Reconciliar commits `main` local** del frontend (16 commits "living-world": camera-follow, audio, multi-room, NPCs) con `origin/main` del repo archivado. Ahora se gestiona desde el monorepo. | PENDIENTE |
| 🟡 Media | **T3.3** (retiro Spring): diferido; retomar cuando Django esté en producción + plan de schema-ownership. | DIFERIDO |
| 🟢 Baja | Carpetas huérfanas `apps/casos/` y `apps/sesiones/` en disco (solo tienen `__pycache__/` y `migrations/`). Pueden eliminarse con `git rm -r`. | BAJA |
| 🟢 Baja | Warnings NG8107 pre-existentes en `dialogue-panel.component.ts` (no bloquean build). | BAJA |

---

## 16. Reglas de oro (invariantes)

1. **Spring `backend/` CONGELADO.** No se toca, no se modifica, no se elimina. Es el respaldo de seguridad y dueño de Flyway.
2. **RNF-010.** Cualquier cambio de esquema se discute **antes** de implementarse. Django usa `managed=False`. No crear migraciones Django que alteren tablas de dominio.
3. **No romper el flujo del estudiante ni los tests verdes.** Extender, no reescribir lo que funciona.
4. **Versiones publicadas** no se modifican destructivamente — se clonan y versionan.
5. **Bitácoras cifradas** en reposo. No persistir contenido sensible en claro ni en `localStorage`.
6. **Salida segura** siempre alcanzable para el estudiante.
7. **Auditoría persistente** (Django signals → `audit_logs`; 12 meses; nunca interrumpe la operación).

---

## 17. Disciplina de trabajo

**Loop por slice (una rama por trabajo):**
1. `superpowers:brainstorming` — intent + diseño + spec (`docs/superpowers/specs/YYYY-MM-DD-*.md`)
2. `superpowers:writing-plans` — plan de implementación (`docs/superpowers/plans/YYYY-MM-DD-*.md`)
3. `superpowers:executing-plans` — TDD: test falla → mínima impl → verde → commit
4. Verificar: `pytest -q` + `ng build` + jest + smoke en vivo
5. `superpowers:finishing-a-development-branch` — PR o merge

**TDD estricto.** Test que falla → mínima implementación → verde → commit. Verificar siempre antes de declarar algo hecho. `pytest` + `ng build` + jest como gates.

**Commits:** descriptivos, co-author `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Docs a `master`; código en rama feature.

**Ante cambios de esquema o contrato API: detenerse y consultar** (RNF-010).

---

## 18. Historial (compacto)

> Changelog Java-era detallado (V1–V8, hexagonal, Tiled, Testcontainers, etc.) en git history de este archivo y en `PLAN_MAESTRO_EJECUCION_V3.md` (HISTÓRICO).

| Fecha | Evento |
|---|---|
| 2026-05 (Java) | Landing institucional, login, portal; motor DAG hexagonal V4–V6; MVP jugable top-down Phaser; editor admin + DAG SVG; auditoría AOP; WorldValidationService + WorldDefinition v2 V7; Testcontainers Fase 8; motor Kenney + Tiled. |
| 2026-05-30 → 06-03 | **Migración Django.** `backend_django` construido replicando 1:1 el contrato Spring (auth, casos, grupos, sesiones, reportes, simulación, autoría, instructor, auditoría signals). Frontend intacto; proxy re-apuntado a `:8091`. |
| 2026-06-03 → 06-05 | **Editor de casos Fases 1–5** completas: diálogos+decisiones inline; paths NPC; multi-sala+puertas+zoom+fondo; runtime zoom+fondo; puertas espaciales jugables (`enter-room`). pytest 129/129, jest, ng build, smokes. |
| 2026-06-05 | **Seguridad de git** auditada (sin filtraciones). **PROMPT_MAESTRO** re-escrito a Django (primer borrador). **Cleanup Tier 1+2** ejecutado (borrado `client/` JavaFX, `engine/` muerto, dedupe `shared/jsonutils`, assets huérfanos). |
| 2026-06-05 | **Cleanup Tier 3:** T3.1 cerrado como coexistencia justificada; **T3.2** ejecutado (retiro quiz, extracción `apps.reportes` sim-only, frontend sim-only); T3.3 diferido. pytest 107, jest 64, ng build, smoke. |
| 2026-06-05 | **Integración frontend** `integrate/case-editor-into-main`: línea del editor + T3.2 integrada sobre `origin/main` (ACT); conflictos resueltos; PR abierta. ng build OK, jest 64/64. |
| 2026-06-05 | **Este PROMPT_MAESTRO** reescrito con mapa completo del sistema (componentes, rutas, apps, endpoints, deudas, ramas). Deuda de landing identificada por el usuario. |
| 2026-06-06 | **Consolidación monorepo.** Frontend Angular (`Proyecto_psicologia/admin-panel/`) movido a `psico_project_v2/frontend/`. Docker-compose y .env.example en raíz. `Jsua3/Proyecto_psicologia` permanece como archivo histórico. Landing page marcada como completada. PROMPT_MAESTRO actualizado para reflejar estructura monorepo. |
