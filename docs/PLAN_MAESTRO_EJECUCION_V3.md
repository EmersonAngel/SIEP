# PSYCHOSIM — PLAN MAESTRO DE EJECUCIÓN V3

### "Clinical-grade, Undertale-tier" · Documento-biblia autocontenido

> **Propósito de este documento:** ser el plan rector ejecutable de la versión robusta de **SIEP — Sistema de Entrenamiento Psicosocial**.
> Está escrito para que **un agente en frío (sin memoria de la conversación previa) lo pueda aplicar a la perfección**.
> Contiene todo el contexto del codebase, convenciones, comandos, contratos, criterios de aceptación y orden de ejecución.

---

## 0. CÓMO USAR ESTE DOCUMENTO (bootstrap para agente en frío)

### 0.1 Orden de lectura obligatorio antes de tocar código
1. **Este documento** (de principio a fin).
2. `docs/PROMPT_MAESTRO.md` — contrato vivo + historial de cambios aplicados.
3. `C:\Users\<usuario>\.claude\projects\...\memory\project_psychosim.md` — memoria del proyecto (si existe).
4. Los archivos clave listados en §1.3 antes de modificar cada capa.

### 0.2 Entorno (Windows)
- **Working dir:** `D:\Sua_Files\IdeaProjects\psicologia_proyecto`
- **OS:** Windows. Hay PowerShell y Bash disponibles. Para búsquedas usar las tools dedicadas (Glob/Grep), no `find`/`grep` crudos.
- **Backend:** Spring Boot en `http://localhost:8090` (el `8080` está ocupado por un `httpd` local).
- **Frontend:** Angular en `http://localhost:4200`, con `admin-panel/proxy.conf.json` apuntando a `8090`.
- **Base de datos:** PostgreSQL local (producción/dev) + H2 en memoria (tests con perfil `test`).

### 0.3 Comandos canónicos
```bash
# Backend (desde backend/)
cd backend && mvn test                 # corre TODA la suite (baseline actual: 29 tests, 0 fallos)
cd backend && mvn compile -q           # compila rápido
cd backend && mvn spring-boot:run      # levanta backend en :8090

# Frontend (desde admin-panel/)
cd admin-panel && npm run build        # ng build — debe terminar con 0 errores
cd admin-panel && npm test             # jest (unit)
cd admin-panel && npx playwright test  # E2E (requiere backend+frontend arriba)
cd admin-panel && npm start            # ng serve con proxy a :8090
```

### 0.4 Credenciales demo (sembradas por Flyway)
| Rol | Email | Password |
|---|---|---|
| ADMIN | `admin@psychosim.edu.co` | `Admin123!` |
| DOCENTE | `profesora@psychosim.edu.co` | `Profesor123!` |
| ESTUDIANTE | `estudiante@psychosim.edu.co` | `Estudiante123!` |

### 0.5 Verificación de estado inicial (correr ANTES de empezar cada sesión)
```bash
cd backend && mvn test           # esperado: BUILD SUCCESS, 29 tests, 0 failures
cd admin-panel && npm run build  # esperado: 0 errores de compilación
```
Si el baseline no está verde, **arregla eso primero**; no construyas sobre un árbol roto.

### 0.6 Reglas de oro (NO ROMPER)
- ❌ **Nunca** rompas el flujo de juego del estudiante existente ni los tests en verde.
- ❌ **Nunca** elimines/reescribas desde cero código que funciona (`dag-editor.component.ts`, motor V6, auditoría AOP, diarios cifrados). Se **extiende**, no se tira.
- ❌ **Nunca** modifiques destructivamente una versión `PUBLISHED`: se clona y versiona.
- ❌ **Nunca** persistas contenido sensible en claro ni en `localStorage`.
- ✅ **Siempre** anota operaciones sensibles nuevas con `@Auditable` (ver §1.4).
- ✅ **Siempre** la salida segura debe ser alcanzable.
- ✅ **Siempre** documenta cada fase terminada en `PROMPT_MAESTRO.md` (ver §9).
- ✅ **Siempre** verifica con `mvn test` + `npm run build` antes de declarar una fase completa.

---

## 1. CONTEXTO DEL CODEBASE (estado verificado)

### 1.1 Stack real
| Capa | Versión/Tecnología |
|---|---|
| Backend | Spring Boot **3.5.14**, Java **21**, Virtual Threads activos |
| Seguridad | Spring Security 6 + JWT (JJWT 0.12.6), `@PreAuthorize` por rol |
| Persistencia | JPA/Hibernate + PostgreSQL 16 + Flyway (V1–V6) |
| AOP | `spring-boot-starter-aop` (auditoría implementada) |
| Tests backend | JUnit 5 + `spring-boot-starter-test` + H2 (perfil `test`) + **Testcontainers 1.19.8 ya en `pom.xml`** (postgresql + junit-jupiter, scope test) |
| API docs | Springdoc OpenAPI 2.8.17 |
| Frontend | Angular **21.2.14** standalone, Material 21.2.12, CDK |
| Juego | **Phaser 3.90.0** (ya instalado) |
| Estado UI | Angular **Signals** |
| Tests frontend | **Jest 30** (unit) + **Playwright 1.60** (E2E) |
| **Falta instalar** | `konva`, `howler` (+`@types/howler`), `phaser3-rex-plugins` |

### 1.2 Arquitectura hexagonal (paquetes backend `com.psychosim.simulation`)
```
domain/model/        → entidades de dominio puras (SimulationNode, DecisionOption, SimulationCaseVersion,
                       SimulationAttempt, AttemptEvent, DecisionClassification, CasePublicationStatus...)
domain/service/      → SimulationEngine (transiciones DAG, penalización conductas prohibidas)
application/         → SimulationGameService, SimulationWorldService, InstructorSimulationService,
                       SimulationAuthoringService, ReflectionCryptoService
application/port/in/ → StudentSimulationUseCase, *Command
application/port/out/→ AuditTrailPort, CaseGraphRepositoryPort, ReflectionCipherPort,
                       SimulationAttemptRepositoryPort
infrastructure/persistence/ → *Entity + *JpaRepository (JPA adapters)
infrastructure/audit/       → Auditable, SimulationAuditAspect, AuditLogAdapter, AuditLogCleanupScheduler
web/                 → SimulationGameController, InstructorSimulationController,
                       SimulationAuthoringController, SimulationDtos (todos los DTOs como records)
```

### 1.3 Esquema de base de datos (migraciones en `backend/src/main/resources/db/migration/`)
- **V1** init schema · **V2** seed roles · **V3** seed caso legacy
- **V4** `simulation_hexagonal_foundation`: `simulation_cases`, `case_versions`, `simulation_nodes`, `decision_options`, `simulation_attempts_v2`, `attempt_events`, `reflection_journals`, `rubrics`, `rubric_criteria`, `rubric_evaluations`, `publication_checklists`, **`audit_logs`**
- **V5** `seed_playable_simulation_case`: caso `SIM-VBG-001` v`1.0.0`, 6 nodos, 12 decisiones
- **V6** `configurable_serious_game_world` (tablas y columnas clave):

| Tabla | Columnas clave |
|---|---|
| `scene_maps` | id, case_version_id→case_versions, **node_id→simulation_nodes (UNIQUE: 1 mapa por nodo)**, map_key, title, width(960), height(540), theme('clinical-soft'), spawn_x(145), spawn_y(430), ambient_json |
| `map_objects` | id, scene_map_id, object_key, label, **object_type ∈ {PERSON,OBJECT,ROUTE,TOOL,WARNING,EXIT}**, position_x/y (px), width/height, color_hex, icon, short_code, collision, visible, interaction_prompt, interaction_text, **decision_option_id→decision_options**, tool_code, unlock_condition_json |
| `collision_zones` | id, scene_map_id, zone_key, label, position_x/y, width, height |
| `dialogue_trees` | id, scene_map_id, map_object_id, tree_key, speaker_name, portrait_key, emotion |
| `dialogue_lines` | id, dialogue_tree_id, display_order, speaker_name, text, emotion |
| `dialogue_choices` | id, dialogue_tree_id, choice_key, text, **decision_option_id→decision_options**, required_tool_code, effect_json, display_order |
| `clinical_tools` | id, case_version_id, tool_code, label, icon, category, description |
| `attempt_world_states` | **attempt_id UUID PK**→simulation_attempts_v2, scene_map_id, player_x/y, inventory_json, inspected_object_keys_json, viewed_dialogue_keys_json, used_tool_keys_json, flags_json |
| `criterion_scores` | id, rubric_evaluation_id, rubric_criterion_id, score, comment, evidence_json |
| `audit_logs` | id, actor_id (nullable FK), actor_role, action, resource_type, resource_id, context_json, ip_address, user_agent, occurred_at, retention_until |

> ⚠️ Muchas tablas usan `ON DELETE CASCADE`. Tenerlo en cuenta al validar borrados concurrentes.

### 1.4 Convenciones del proyecto (respetarlas SIEMPRE)
- **DTOs**: Java `record` dentro de `web/SimulationDtos.java`. TS equivalentes en `admin-panel/src/app/core/models/simulation.model.ts`.
- **Respuestas REST**: envueltas en `ApiResponse<T>` (`shared/ApiResponse.java`); el método helper es `ApiResponse.ok(...)` y `ApiResponse.ok("mensaje", data)`.
- **Servicio HTTP frontend**: `admin-panel/src/app/core/api/simulation.service.ts`, métodos retornan `Observable<T>` desempaquetando `ApiResponse` con `.pipe(map(r => r.data))`.
- **Seguridad**: endpoints admin con `@PreAuthorize("hasRole('ADMIN')")`; instructor con `hasRole('DOCENTE')`/`ADMIN`; juego con el estudiante dueño del intento.
- **Auditoría**: anotar métodos de servicio con `@Auditable(action="...", resourceType="...", resourceIdParamIndex=N)` (índice 0 por defecto; usar 1 cuando el id de recurso es el 2º parámetro). El aspecto persiste tras `proceed()`, en transacción `REQUIRES_NEW`, null-safe.
- **Tests de integración**: `@SpringBootTest @ActiveProfiles("test")`; H2; usar repos reales. Para `@Modifying` queries añadir `@Transactional` al test. El `actor_id` de `audit_logs` es nullable → en tests no pasar FK de usuario inexistente.
- **Timestamps en tests con H2**: truncar a milisegundos (`Instant.now().truncatedTo(ChronoUnit.MILLIS)`) — H2 redondea sub-microsegundos.
- **Estados de caso** (`CasePublicationStatus`): `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED`.

### 1.5 Inventario de endpoints existentes
**Juego** `/api/simulation`: `GET /cases` · `POST /attempts` · `GET /attempts/{id}` · `POST /attempts/{id}/decisions` · `POST /attempts/{id}/reflections` · `GET /attempts/{id}/world` · `PATCH /attempts/{id}/world-state` · `POST /attempts/{id}/interactions/{key}` · `POST /attempts/{id}/tools/use` · `POST /attempts/{id}/safe-exit`
**Instructor** `/api/instructor`: `GET /attempts/recent` · `GET /attempts/{id}/trace` · `GET/POST /attempts/{id}/rubric-evaluation`
**Admin authoring** `/api/admin/cases`: `GET /{id}/editor` · `POST /{id}/publish` · `POST /{id}/clone-version` · CRUD completo de nodes/decisions/maps/objects/dialogues/tools · `PUT /{id}/checklist`

### 1.6 Componentes frontend del simulador (`admin-panel/src/app/features/simulator/`)
`simulation-catalog` · `simulation-play` · `game-world` (Phaser host) · `simulation-hud` · `dialogue-panel` · `tool-inventory` · `journal-panel` · `supervision-feedback` · `instructor-trace` · `case-editor` (CRUD 7 tabs) · `dag-editor` (SVG DAG)

> ⚠️ Regla de juego clave ya implementada: `SimulationGameService.startAttempt()` llama a `requirePublishedCaseVersion()` → **el runtime de estudiante RECHAZA versiones DRAFT**. Esto es la base de la Decisión #1 (preview efímero).

---

## 2. NORTE Y PRINCIPIOS

### 2.1 Qué significa "a la altura de Undertale" aquí
No es copiar Undertale; es alcanzar su **nivel de oficio** aplicado a simulación clínica. Cinco varas de medir:
1. **Game-feel**: moverse/interactuar se siente delicioso — sub-pixel, input buffering, tweens, partículas, screen-shake con criterio.
2. **Narrativa con peso**: typewriter, "voz" por personaje, expresiones, tags `[shake]/[wave]/[pause]/[speed]`, decisiones con consecuencia real.
3. **Identidad audiovisual original**: pixel-art institucional + música adaptativa por leitmotiv. **Cero assets robados.**
4. **Decisiones que importan**: emergen del mundo (diálogo/entorno/herramienta), no de un ABCD. Estrés y feedback diegéticos.
5. **Lo que Undertale NO tiene** (el flex): fidelidad clínica, salida segura siempre alcanzable, accesibilidad total y trazabilidad ética.

### 2.2 Principios de arquitectura (no negociables)
- **Backend manda, frontend expresa intención.** El frontend renderiza y envía intención; el backend valida y responde.
- **Un contrato, una verdad: `WorldDefinition`.** Konva edita, Phaser juega, ambos hablan **píxeles**.
- **No se tira código que funciona.** Se construye sobre lo existente.
- **Vertical slice antes que escala.** Una escena al 100% define el listón antes de multiplicar.
- **Calidad como gate, no como deseo.** CI con presupuestos de rendimiento, a11y y tests de DB real.

---

## 3. STACK DE EXCELENCIA + INSTALACIÓN

| Capa | Tecnología | Por qué | Comando de instalación |
|---|---|---|---|
| Runtime 2D | Phaser 3.90 (WebGL) | maduro, WebGL, ecosistema enorme | ya instalado |
| Físicas | Arcade Physics | top-down con zonas rectangulares | incluido en Phaser |
| UI/Texto in-game | phaser3-rex-plugins (rexUI) | mejor toolkit de diálogo/typing/BBCode | `npm i phaser3-rex-plugins` |
| Audio | Howler.js | audio sprites, fades, loops sin gap | `npm i howler && npm i -D @types/howler` |
| Editor de mundo | Konva + Angular Signals | mejor canvas 2D editable; Signals sin NgRx | `npm i konva` |
| Tipografía | Bitmap/MSDF fonts (Phaser BitmapText) | texto pixel nítido a escala | assets, sin dep nueva |
| Arte | Aseprite (externo) | estándar pixel-art, exporta spritesheet+JSON | herramienta de autoría |
| Tests DB | Testcontainers (PostgreSQL real) | detecta lo que H2 oculta | **ya en `pom.xml`** |
| E2E + visual | Playwright | cross-browser, visual regression | ya instalado |
| a11y/perf CI | axe-core + Lighthouse CI | gates objetivos | `npm i -D @axe-core/playwright` |

> `allowedCommonJsDependencies` en `admin-panel/angular.json` ya cubre `phaser`. Añadir ahí `howler` y `konva` si el build emite warnings de CommonJS.

---

## 4. DECISIONES CERRADAS (las 5 que estaban abiertas)

| # | Tema | Decisión definitiva |
|---|---|---|
| 1 | **Preview vs DRAFT** | `GET /api/admin/cases/{id}/world-preview` devuelve el `WorldDefinition` del DRAFT y monta el **runtime Phaser real en modo efímero**: sin crear `SimulationAttempt`, sin `attempt_events`, sin auditoría de juego, scoring solo en memoria. Resuelve la colisión con `requirePublishedCaseVersion` y no contamina analíticas ni panel docente. |
| 2 | **`revision` vs `@Version`** | Bloqueo a nivel de **agregado**: un único `@Version` en `case_versions`. Todo edit del mundo pasa por esa raíz. El DTO expone `revision = version`. Conflicto → "Este caso cambió en otra sesión". |
| 3 | **Cuándo valida** | **Continua** (revalidación ligera tras cada save → tab Validación) **+ on-demand** (botón Validar) **+ gate duro en publish**. Nunca solo al final. |
| 4 | **Límites de rendimiento** | Enforced en **backend** (`WorldValidationService`) como gate de publicación. El editor da warning temprano; el backend lo hace cumplir. |
| 5 | **Coordenadas** | **Un solo sistema: píxeles** (coherente con V6 `position_x/y INTEGER`). El grid/snap de Konva es ayuda visual, no espacio en tiles. Garantiza WYSIWYG. |

---

## 5. ROADMAP POR FASES (grado-ejecución)

> Cada fase trae: **Objetivo · Archivos · Detalle técnico · Pruebas · Criterios de aceptación · Verificación.**
> Trabajar fase por fase. No abrir una fase nueva sin la anterior verde.

### FASE 1 — Blindaje backend + dominio de validación
**Objetivo:** garantizar integridad y seguridad de autoría ANTES de tocar el editor visual.

**Archivos a crear/modificar:**
- Crear `domain/service/WorldValidationService.java` — **servicio de dominio puro** (sin Spring), recibe un agregado de mundo y devuelve `WorldValidationResult` (lista de errores/warnings tipados).
- Crear `web/SimulationDtos` records: `WorldValidationState`, `WorldValidationIssue(severity, code, message, entityRef)`.
- Modificar `application/SimulationAuthoringService.java`:
  - `ensureDraft(caseVersionId)`: lanza si estado ∈ {PUBLISHED, IN_REVIEW, ARCHIVED}.
  - `requireNodeInVersion / requireDecisionInVersion / requireMapInVersion / requireObjectInVersion / requireToolInVersion / requireDialogueInVersion`.
  - Reforzar `publish()` para invocar `WorldValidationService` y bloquear si hay errores.
  - Anotar todos los métodos mutadores nuevos con `@Auditable`.
- Modificar `infrastructure/persistence/CaseVersionEntity.java`: añadir `@Version private Long version;` (bloqueo optimista).
- Crear migración `V7__world_authoring_hardening.sql` (ver Fase 2 — se hace junta).

**Detalle técnico — reglas de `WorldValidationService` (gate de publish):**
- DAG: exactamente **1 nodo inicial**, **≥1 nodo terminal**, **sin ciclos** (reusar lógica de `SimulationEngine` si aplica).
- Pertenencia: todo mapa/objeto/decisión/herramienta/diálogo pertenece al mismo `caseVersionId`.
- Geometría: `spawn` dentro del mapa; cada objeto y zona de colisión dentro de `[0,width]×[0,height]`.
- Ética: toda decisión `prohibitedConduct=true` tiene `prohibitionReason` no vacío.
- Salida segura configurada.
- **Límites (Decisión #4):** máx **250** objetos, **300** colisiones, **100** triggers por mapa; mapa ≤ **2560×1920 px**; warning de diálogos desde **50** por mapa.

**Pruebas (`backend/src/test/.../application/` y `.../domain/service/`):**
- `WorldValidationServiceTest` (unit puro, sin Spring): ciclo detectado, sin nodo inicial, doble inicial, sin terminal, objeto fuera de mapa, decisión prohibida sin razón, exceso de límites.
- `SimulationAuthoringHardeningTest` (`@SpringBootTest`): editar versión PUBLISHED lanza; `clone-version` permite; pertenencia cruzada rechazada.

**Criterios de aceptación:** no se puede mutar un caso no-DRAFT; publish bloquea con grafo/geometría inválida; auditoría registra cada acción.
**Verificación:** `cd backend && mvn test` (todos verdes, incluidos los nuevos).

---

### FASE 2 — Contrato `WorldDefinition v2` + V7 mínimo
**Objetivo:** un contrato único versionado entre backend, editor y juego.

**Archivos a crear/modificar:**
- `V7__world_authoring_hardening.sql`:
  ```sql
  ALTER TABLE case_versions ADD COLUMN version BIGINT NOT NULL DEFAULT 0;          -- @Version
  ALTER TABLE case_versions ADD COLUMN world_schema_version INTEGER NOT NULL DEFAULT 2;
  ALTER TABLE map_objects ADD COLUMN z_index INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE map_objects ADD COLUMN facing VARCHAR(16) NOT NULL DEFAULT 'down';
  ALTER TABLE map_objects ADD COLUMN movement_pattern_json TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE map_objects ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
  -- NO crear tablas actors/layers todavía (NPCs = object_type='PERSON'; capas implícitas).
  ```
- Backend: records en `SimulationDtos` para `WorldDefinition`, `SceneMapDefinition`, `WorldObject`, `CollisionZone`, `DialogueTree`, `ClinicalTool`, `SafeExitConfig`, `WorldValidationState`.
- Frontend: interfaces equivalentes en `simulation.model.ts`.
- Endpoint `GET /api/admin/cases/{caseVersionId}/world-editor` → ensambla `WorldDefinition` desde V6/V7.
- Endpoint `PUT /api/admin/cases/{caseVersionId}/world` → guarda borrador con chequeo de `revision` (conflicto si difiere) — `@Auditable`.
- Endpoint `POST /api/admin/cases/{caseVersionId}/world/validate` → corre `WorldValidationService` y devuelve `WorldValidationState`.

**Contrato (forma canónica, píxeles):**
```ts
WorldDefinition {
  schemaVersion: number; caseVersionId: number; revision: number; nodeId: number;
  map: SceneMapDefinition;          // width,height,theme,spawnX,spawnY,ambient
  objects: WorldObject[];           // PERSON|PROP|TOOL_TARGET|EXIT|TRIGGER|NOTE|RESOURCE (mapea object_type V6)
  collisionZones: CollisionZone[];
  dialogues: DialogueTree[];
  clinicalTools: ClinicalTool[];
  safeExit: SafeExitConfig;
  validation: WorldValidationState;
}
```
- **NPCs/actores:** NO hay `actors[]` separado; el front los deriva con `objects.filter(o => o.type === 'PERSON')`.
- **Decisiones:** SOLO se vinculan por `map_objects.decision_option_id` y `dialogue_choices.decision_option_id`. **Cero `DecisionBinding[]` paralelo.**

**Pruebas:**
- `WorldDefinitionMappingTest`: round-trip `WorldDefinition → JSON → WorldDefinition` estable (Jackson `ObjectMapper`).
- Conflicto optimista: dos `PUT /world` con `revision` desfasada → el 2º responde 409.

**Criterios de aceptación:** el contrato carga y guarda sin pérdida; `revision` protege contra ediciones concurrentes.
**Verificación:** `mvn test` + prueba HTTP manual del `world-editor`.

---

### FASE 3 — 🌟 GOLDEN VERTICAL SLICE (define el listón)
**Objetivo:** llevar **una escena** de `SIM-VBG-001` a calidad Undertale, sobre datos ya publicados (no depende del editor).

**Archivos a crear (frontend, `features/simulator/engine/`):**
- `game-feel.system.ts` — `GameFeelSystem`: sub-pixel movement, input buffering (cola de inputs ~120ms), aceleración/fricción, animaciones idle/walk por dirección, partículas, screen-shake parametrizable.
- `audio.director.ts` — `AudioDirector` (Howler): música por **capas/stems** con crossfade según `stressIndex`; SFX por interacción; "voice blips" por personaje. API: `setStress(0..100)`, `playSfx(key)`, `speak(speakerId)`.
- `dialogue.director.ts` — `DialogueDirector` (rexUI): typewriter con timing por carácter, expresiones de retrato, tags `[shake]/[wave]/[pause]/[speed]`, skippable, **captions** sincronizadas.
- `pipelines/stress-vignette.pipeline.ts` — pipeline WebGL: viñeta de estrés + color-grade emocional sutil. **Respetar `prefers-reduced-motion`** (desactiva shake/shimmer/pulsos).
- Integrar todo en `game-world.component.ts` (host Phaser existente) sin romper el fallback accesible.

**Detalle técnico:**
- Coordenadas en **píxeles** (coherente con `world-editor`/`/world`).
- Toda animación bajo flag `prefers-reduced-motion`.
- Hitbox del jugador < sprite. Cámara suave con límites de mapa.
- Música arranca silenciosa y sube de intensidad con el estrés (capas aditivas, no cambio de pista).

**Pruebas (Playwright + Jest):**
- E2E: login estudiante → iniciar `SIM-VBG-001` → canvas WebGL **no blanco** → movimiento → interacción `E` → diálogo con typewriter visible → herramienta → salida segura.
- Jest unit: `GameFeelSystem` (input buffering, clamp de cámara), `DialogueDirector` (parser de tags).

**Criterios de aceptación (= Definition of Done de §6):** 60fps, feedback audio+visual por interacción, diálogo con typewriter/voz/expresiones, música adaptativa, reduced-motion OK, 0 errores de consola.
**Verificación:** `npm run build` + `npx playwright test` (escena slice) + revisión humana del "feel".

---

### FASE 4 — Editor de mundo MVP (Konva + Signals)
**Objetivo:** autoría visual del mundo sobre lo existente, sin sobre-alcance.

**Archivos:**
- Mejorar `dag-editor.component.ts` (NO reemplazar): drag de nodos + persistencia de posición (`positionX/Y`), validación visual, resaltado de rutas prohibidas, errores de grafo.
- Crear `features/simulator/world-editor/world-editor.component.ts` (Konva) + `world-editor.store.ts` (Signals + command stack).
- Comandos undo/redo: `PlaceObjectCommand`, `MoveObjectCommand`, `ResizeZoneCommand`, `DeleteObjectCommand`, `UpdateInspectorCommand`, `LinkDialogueCommand`, `LinkDecisionCommand`.
- Integrar como tab "Mundo" en `case-editor.component.ts` (que ya tiene tabs).

**Funciones MVP:** grid/zoom/pan/snap; seleccionar/mover/redimensionar; crear objeto/persona/colisión/trigger; definir spawn y salida segura; inspector lateral liquid-glass; guardar borrador; botón Validar.
**Fuera de MVP:** multiselección avanzada, capas personalizadas, subida de assets.

**Guardado y concurrencia (Decisión #2):**
- Autosave con **debounce** → `PUT /world` con `revision`.
- Borrador local en **IndexedDB** (no localStorage; sin contenido sensible persistido largo).
- En conflicto 409: **conservar cambios locales**, mostrar "Este caso cambió en otra sesión" + opción recargar/comparar. **Nunca descartar trabajo en silencio.**

**Pruebas (Playwright):** abrir editor → crear objeto → mover → dibujar colisión → vincular diálogo/decisión → guardar borrador → validar (muestra issues).
**Criterios de aceptación:** se puede componer un mundo y guardarlo como borrador; undo/redo consistente; conflicto manejado sin pérdida.
**Verificación:** `npm run build` + Playwright editor.

---

### FASE 5 — Preview real (efímero, draft-safe)
**Objetivo:** vista previa con fidelidad total y sin contaminar datos.

**Archivos:**
- Backend: `GET /api/admin/cases/{id}/world-preview` (Decisión #1) — devuelve `WorldDefinition` del DRAFT; **no** crea attempt ni eventos.
- Frontend: tab "Vista previa" monta el **mismo runtime Phaser** (engine de Fase 3) alimentado por `world-preview`, en modo efímero (scoring en memoria, sin persistencia).

**Criterios de aceptación:** mismas coordenadas/objetos/colisiones/spawn/cámara que el juego real; previsualizar un DRAFT NO crea filas en `simulation_attempts_v2`/`attempt_events`/`audit_logs` de juego.
**Verificación:** Playwright (preview de un DRAFT) + consulta a DB confirmando 0 attempts nuevos.

---

### FASE 6 — Profundidad clínica
**Objetivo:** que herramientas, estrés y decisiones sean diegéticos y pedagógicos.

- Herramientas (`PAP`, `SPIKES`, `RISK_METER`, `VBG_ROUTE`, `JOURNAL`) con objetivos válidos y feedback contextual (backend valida pertinencia y registra evento; reusa `POST /tools/use`).
- **Estrés como sistema audiovisual**: `AudioDirector.setStress()` + pipeline de viñeta. Nunca lenguaje estigmatizante.
- Decisiones emergen desde diálogo/entorno/herramienta (vía `decision_option_id`).

**Criterios de aceptación:** usar la herramienta correcta en el objetivo correcto da feedback positivo y baja estrés; la incorrecta sube estrés sin estigmatizar.
**Verificación:** Playwright recorriendo la ruta óptima del caso + revisión clínica humana del contenido.

---

### FASE 7 — 🏅 Accesibilidad y ética (la ventaja sobre Undertale)
**Objetivo:** excelencia inclusiva y segura.

- Teclado completo; **ruta narrativa para lector de pantalla** (reusar/extender el fallback accesible por tarjetas existente).
- Captions de audio; contraste **AA**; **salida segura siempre alcanzable** sin importar el estrés.
- Trigger/content warnings (ya en dominio) y **revisión ética como gate de publicación**.

**Criterios de aceptación:** todo el juego es jugable solo con teclado y narrable por lector de pantalla; axe sin violaciones críticas.
**Verificación:** Playwright + `@axe-core/playwright` (0 violaciones críticas).

---

### FASE 8 — Quality Gates (CI que no perdona)
**Objetivo:** confianza de producción automatizada.

- **Testcontainers (Postgres real)** — usar la dependencia ya presente. Crear `*ContainerIT` con `@Testcontainers`+`@Container PostgreSQLContainer`:
  - migraciones V4–V7 aplican limpio;
  - pertenencia por versión; edición bloqueada en PUBLISHED; conflicto optimista (409);
  - publicación con grafo inválido bloqueada; auditoría registrada;
  - publicar v1.1.0 **no rompe** intentos vivos en v1.0.0.
- **Playwright** desktop/móvil + visual regression del recorrido completo y del editor.
- **Lighthouse CI + axe**: 60fps, sin scroll horizontal 360→1440, a11y AA.

**Criterios de aceptación:** suite verde en H2 **y** en Postgres real; E2E verde; gates a11y/perf verdes.
**Verificación:** `mvn test` (incluye IT) + `npx playwright test` + Lighthouse CI.

---

### FASE 9 — Escala de contenido + documentación
- Templatizar la slice → más nodos/escenas/casos publicados; asignación por cohorte (futuro).
- Documentar **cada fase** en `PROMPT_MAESTRO.md` (ver §9).

---

## 6. DEFINITION OF DONE — "nivel Undertale" (medible)
- **60 fps** en hardware medio; sin jank perceptible.
- Toda interacción con **respuesta audio + visual** < 1 frame perceptible (input buffering).
- Diálogo: typewriter + voz por personaje + expresiones + tags + skippable + captions.
- Música **adaptativa** que responde a estrés/escena; loops sin gap.
- Screen-shake/partículas con criterio y **100% reduced-motion compliant**.
- **0 errores de consola; 0 scroll horizontal; responsive 360→1440.**
- a11y: teclado completo, ruta lector-de-pantalla, contraste AA, salida segura siempre alcanzable.
- Save/resume **frame-perfect** desde `attempt_world_states`.
- Backend: `mvn test` verde (H2 + Testcontainers). Frontend: `npm run build` 0 errores.

---

## 7. RIESGOS Y MITIGACIÓN
| Riesgo | Mitigación |
|---|---|
| Arte/música es pista propia (la tech no la genera sola) | Pack curado fijo + vertical slice primero; escalar después |
| El editor es el gigante del proyecto | MVP-slice; sin multiselección/capas/upload en v1 |
| Contenido sensible (VBG, feminicidio) | Gate de revisión ética en publish; lenguaje no estigmatizante; safe-exit siempre |
| Dos renderers (Konva/Phaser) divergen | Contrato en píxeles + preview con Phaser real (Decisión #1 y #5) |
| Concurrencia de edición | `@Version` en `case_versions` + manejo de conflicto sin pérdida |
| Scope creep hacia "juego comercial" | El norte es educativo; cada feature se justifica pedagógicamente |

---

## 8. ORDEN DE EJECUCIÓN RECOMENDADO
**Ruta crítica (secuencial):** Fase 1 → Fase 2 → Fase 5 (necesita contrato) → Fase 4 → Fase 6 → Fase 7 → Fase 8 → Fase 9.
**Paralelizable:** **Fase 3 (vertical slice)** puede avanzar en paralelo desde el inicio sobre `SIM-VBG-001` publicado, porque NO depende del editor. Sirve para clavar el listón de calidad mientras se construye la autoría.

**Arranque inmediato sugerido:** Fase 1 + Fase 2 (100% backend, bajo riesgo, sostienen todo) y, en paralelo, el esqueleto de la Fase 3.

---

## 9. DISCIPLINA DE DOCUMENTACIÓN (obligatoria al cerrar cada fase)
Añadir a `docs/PROMPT_MAESTRO.md` un bloque con fecha y título, conteniendo:
- **Objetivo** del bloque.
- **Cambios backend** (archivos, migraciones, endpoints, servicios).
- **Cambios frontend** (componentes, servicios, modelos).
- **Decisiones técnicas** y por qué.
- **Pruebas ejecutadas** (conteo y resultado de `mvn test` / `npm run build` / Playwright).
- **Pendientes** y **Riesgos**.
Actualizar también la memoria del proyecto (`project_psychosim.md`) con el nuevo estado.

---

### Baseline al momento de redactar este plan
- Backend: **29 tests, 0 fallos** (incluye auditoría AOP recién implementada).
- Frontend: `npm run build` **0 errores**.
- Último bloque cerrado: **Auditoría AOP con retención de 12 meses** (`@Auditable` + `SimulationAuditAspect` + `AuditLogAdapter` + scheduler diario 03:00 UTC).
