# PROMPT MAESTRO — SIEP (Django)

> **Fuente de verdad viva del proyecto.** Reescrito el **2026-06-05** para reflejar la realidad actual: el backend corre en **Python/Django**, no en Java/Spring. La versión Java-era de este documento (con su changelog completo) queda en el **historial git** de este archivo y en los docs archivados (`PLAN_MAESTRO_EJECUCION_V3.md`, `PROMPT_MIGRACION_DJANGO.md`, marcados como HISTÓRICOS).
>
> Toda transformación importante (backend, frontend, BD, seguridad, UX) debe registrarse en la sección **Historial** al final.

## 1. Producto

**SIEP — Sistema de Entrenamiento Psicosocial.** Plataforma web académica de la **Corporación Universitaria Empresarial Alexander Von Humboldt** (Programa de Psicología, Armenia, SNIES 101645). Simulación formativa tipo **RPG clínico top-down**: el estudiante explora escenas de casos psicosociales (sensibles y no sensibles), dialoga, toma decisiones y es evaluado por competencias — entrenamiento **ético**, no un examen.

> **Marca vs. identificadores técnicos:** la marca visible es **SIEP**; el código conserva `psychosim` / `com.psychosim` por compatibilidad con el esquema y el frontend.

## 2. Estado actual (arquitectura real)

| Pieza | Realidad |
|---|---|
| **Backend activo** | `psico_project_v2/backend_django` — **Django 5.1 + DRF**. Repo GitHub `Jsua3/psico_project_v2`. |
| **Frontend** | `psicologia_proyecto/admin-panel` — **Angular 21** (standalone + Signals), **Konva** (editor visual), **Phaser 3** (runtime del juego). Repo `Jsua3/Proyecto_psicologia`. |
| **Backend Spring** (`psicologia_proyecto/backend`, Java 21) | **CONGELADO — es respaldo. NO se toca.** Sigue siendo dueño del **esquema** vía Flyway (V1–V8). |
| **Base de datos** | PostgreSQL 16, BD `psychosim` en `localhost:5433`. Esquema creado por Flyway (Spring). |
| **Docs/specs/plans** | viven en `psico_project_v2/docs/` y `docs/superpowers/{specs,plans}/`. |

**Principio clave:** Django **mapea** las tablas Flyway con `managed = False` y **nunca** muta el esquema. El contrato HTTP es **idéntico** al de Spring para que el frontend no requiera cambios.

## 3. Stack backend (Django)

| Capa | Tecnología |
|---|---|
| Lenguaje | Python 3.12 |
| Framework | Django 5.1 + Django REST Framework 3.15 |
| Auth | `djangorestframework-simplejwt` (claims `userId`, `role`; expiración 8h) |
| CORS | `django-cors-headers` |
| DB driver | `psycopg2-binary` → PostgreSQL (misma BD que Spring) |
| Cifrado | `cryptography` (AES-GCM) para bitácoras en reposo |
| Docs API | `drf-spectacular` (OpenAPI 3 + Swagger) |
| Tests | `pytest` + `pytest-django` contra la BD real (rollback por test) |

**Estructura:** `backend_django/`
- `psychosim/settings/{base,local,test,production}.py` — settings por entorno; secretos por variables de entorno.
- `apps/`: `users`, `casos` (legacy), `grupos`, `sesiones` (legacy + reportes), `simulation` (núcleo del simulador), `progression` (catálogo/desbloqueo).
- Cada app: `models/` (managed=False), `services/` (lógica), `views/`, `serializers/`, `tests/`.
- `shared/`: `response.py` (`api_ok`/`api_error` → `{"data":…, "message":…}`), `permissions.py` (`IsAdmin`/`IsProfesorOrAdmin`/`IsEstudianteOrAdmin`), `exceptions.py`.

## 4. Dominio (tablas Flyway mapeadas)

- **Legacy:** `users`, `casos`, `escenarios`, `preguntas`, `opciones`, `grupos`, `grupo_estudiante`, `sesiones_juego`, `respuestas`.
- **Simulación core:** `simulation_cases`, `case_versions` (estado `DRAFT→IN_REVIEW→PUBLISHED→ARCHIVED`, `version` para optimistic-lock), `simulation_nodes`, `decision_options` (clasif. `ADEQUATE|RISKY|INADEQUATE`), `simulation_attempts_v2` (UUID), `attempt_events`, `reflection_journals` (cifrada), `attempt_world_states` (incl. `flags_json`).
- **Mundo:** `scene_maps` (1 por nodo, con `ambient_json` = zoom/fondo), `map_objects` (tipos `PERSON|OBJECT|ROUTE|TOOL|WARNING|EXIT`; `movement_pattern_json`, `metadata_json` = puertas, `decision_option_id`), `collision_zones`, `dialogue_trees`, `dialogue_lines`, `dialogue_choices` (`decision_option_id`), `clinical_tools`.
- **Evaluación/auditoría:** `rubrics`, `rubric_criteria`, `rubric_evaluations`, `criterion_scores`, `publication_checklists`, `audit_logs`.

## 5. Contrato API (idéntico a Spring)

- **Envoltorio:** toda respuesta `{"data": <payload|null>, "message": <texto>}`.
- **JWT:** claims `userId` (id) + `role` (`ADMIN|PROFESOR|ESTUDIANTE`).
- **Códigos:** 200/201, 400 validación, 401 no auth, 403 sin rol, 404 no encontrado, 409 conflicto de edición.
- **Módulos:** `/api/auth` (login/register/me) · `/api/casos` · `/api/grupos` · `/api/sesiones` · `/api/reportes` (dashboard/grupo/export CSV) · `/api/simulation` (cases, attempts, decisions, reflections, world, world-state, interactions, tools/use, safe-exit, **enter-room**) · `/api/admin/cases` (editor, CRUD nodos/decisiones/mapas/objetos/diálogos/herramientas, checklist, publish, clone-version, world-editor/world/validate) · `/api/instructor` (attempts recientes, trace, rubric-evaluation).

## 6. Reglas críticas / invariantes (NO romper)

- Versión `DRAFT` no es jugable; `PUBLISHED` no se modifica destructivamente (se **clona y versiona**).
- Decisión `prohibitedConduct=true` ⇒ `prohibitionReason` no vacío + penalización drástica inmutable.
- Intento finalizado **bloquea** la bitácora; **salida segura** siempre alcanzable (guarda estado + recursos).
- Bitácoras **cifradas** en reposo (AES-GCM); analíticas agregadas **anonimizan** por defecto.
- Auditoría persistente (Django signals → `audit_logs`, retención 12 meses, nunca interrumpe la operación).
- **RNF-010:** Django no toma posesión del esquema (`managed=False`); **cualquier cambio de esquema se discute antes** (Flyway/Spring es el dueño y está congelado).
- **No** persistir contenido sensible en claro ni en `localStorage`.

## 7. Frontend (identidad + stack)

- Angular 21 standalone + Signals; Angular Material; SCSS con tokens `--psy-*` (paleta serena azul/teal/lavanda); estética **liquid-glass**; soporte completo `prefers-reduced-motion`.
- **Konva** = editor visual de mundo (pestaña "Mundo" de `case-editor.component.ts` → `world-editor/`). **Phaser 3** = runtime jugable (`game-world.component.ts`).
- Proxy `admin-panel/proxy.conf.json` → Django `:8091` (los dos `proxy.{django,spring}.json` permiten alternar backend).

## 8. Editor de casos (sub-proyecto E) — Fases 1–5 ✅ COMPLETO

Autoría visual + runtime del mundo del caso. Cada fase: spec → plan → TDD → verify → rama propia (ver `docs/superpowers/`).

1. **Diálogos + decisiones inline** — clic en NPC → líneas + opciones de respuesta cableadas a aristas del DAG. (`save_world` persiste árboles/líneas/choices; `world_editor` expone `availableDecisions`.)
2. **Paths de NPC** — waypoints en el lienzo (`movementPattern` idle/wander/patrol); el runtime ya los reproduce (`AmbientMover`).
3. **Multi-sala + puertas + zoom + fondo** — varias salas (=nodos), puertas (`EXIT.metadata`=`{targetNodeKey,entryX,entryY}`), zoom/fondo por sala (`scene_maps.ambient_json`), switcher in-editor. Sin migración.
4. **Runtime aplica zoom + fondo** — `renderWorld` lee `world.map.ambient.cameraZoom`/`backgroundImage`.
5. **Puertas espaciales en runtime** — caminar a un `EXIT` carga la sala destino (no puntuado), desacoplado del nodo DAG vía `flags.syncedNodeId`; endpoint `POST /attempts/<id>/enter-room`. Las decisiones siguen rigiendo el DAG y sobre-escriben la puerta.

## 9. Cómo correr (Windows)

```bash
# BD (desde psicologia_proyecto) — requiere Docker Desktop
docker compose up -d db                         # Postgres :5433, BD psychosim (volumen ya sembrado por Flyway)

# Backend Django (desde backend_django)
./.venv/Scripts/python.exe -m pytest            # suite contra BD real (rollback por test)
./.venv/Scripts/python.exe manage.py runserver 8091

# Frontend (desde admin-panel) — proxy ya apunta a :8091
npm start            # ng serve :4200
npm run build        # build prod
npx jest             # unit
```

- **Credenciales demo (Flyway):** ADMIN `admin@psychosim.edu.co`/`Admin123!` · DOCENTE `profesora@psychosim.edu.co`/`Profesor123!` · ESTUDIANTE `estudiante@psychosim.edu.co`/`Estudiante123!`.
- **Caso jugable:** `SIM-VBG-001` = `caseVersionId` **1** (6 nodos, 12 decisiones, 6 salas).
- `gh` (GitHub CLI) **no** está instalado → PRs por URL web.

## 10. Seguridad (estado verificado 2026-06-05)

- ✅ Sin secretos reales ni datos de usuario en git; `.gitignore` cubre `.env`/`*.log`/`.venv`/`node_modules`/`dist`. Logs no versionados.
- ✅ `production.py` exige `DJANGO_SECRET_KEY`/`DB_PASSWORD`/`JWT_SECRET` por entorno y **rechaza** los defaults dev; DEBUG off, CORS/HTTPS endurecidos.
- ⚠️ `settings/base.py` y `docker-compose.yml` traen **defaults dev** (a mover a `.env`/`.env.example` en limpieza). Cifrado de bitácoras = `REFLECTION_ENCRYPTION_KEY` (cae al `JWT_SECRET`): en prod debe ser fuerte y privado.
- ⚠️ Cuentas demo sembradas: no sembrar/rotar en producción. Repos recomendados **privados** (dominio clínico sensible).

## 11. Disciplina de trabajo

- **Loop por slice:** `brainstorming` (intent + spec) → `writing-plans` → `executing-plans` (TDD; build + screenshots para Phaser/Konva) → `verify` en vivo → `finishing-a-development-branch`. Una rama por slice.
- **TDD:** test que falla → mínima implementación → verde → commit. Verificar (`pytest` + `npm run build`/`jest`) antes de declarar algo hecho.
- **No reescribir lo que funciona; extender.** No tocar Spring. Ante cambios de esquema o de contrato: **detenerse y consultar** (RNF-010).
- Commits descriptivos, una rama nueva por trabajo (no en `master`/default). Co-author en commits de agente.

## 12. Historial (compacto)

> El changelog Java-era detallado (V1–V8, motor hexagonal, editor en Spring, Kenney/Tiled, Fases 1–8 del simulador serio) está en el **historial git** de este archivo (commits previos al 2026-06-05) y en `PLAN_MAESTRO_EJECUCION_V3.md` (HISTÓRICO). Detalle por slice reciente en `docs/superpowers/specs/` + `plans/`.

- **2026-05 (Java/Spring):** landing institucional, login, portal; motor DAG hexagonal (V4–V6); MVP jugable top-down (Phaser); editor administrativo + CRUD + DAG visual SVG; auditoría AOP; WorldValidationService + WorldDefinition v2 (V7); Testcontainers (Fase 8); motor Kenney + mapas Tiled.
- **2026-05-30 → 06-03 (Migración a Django):** se construyó `backend_django` replicando 1:1 el contrato Spring (auth, casos, grupos, sesiones, reportes, simulación, autoría, instructor, auditoría por signals). Frontend Angular intacto; solo se reapuntó el proxy a `:8091`. Roadmap del simulador descompuesto en sub-proyectos F–I.
- **2026-06-03 → 06-05 (Editor de casos, Fases 1–5):** diálogos+decisiones inline; paths de NPC; multi-sala+puertas+zoom+fondo (autoría); runtime aplica zoom+fondo; puertas espaciales jugables. Verificado (pytest 129/129, jest, ng build, smokes en vivo) y pusheado en ramas `feat/case-editor-*`.
- **2026-06-05:** auditoría de seguridad de commits (sin filtraciones reales); reescritura de este PROMPT MAESTRO a la realidad Django.
