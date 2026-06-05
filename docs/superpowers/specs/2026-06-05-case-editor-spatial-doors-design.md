# Editor de casos — Fase 5: Puertas espaciales en runtime

- **Fecha:** 2026-06-05
- **Estado:** Aprobado por el usuario (control delegado, "arranca"). Modelo elegido tras análisis: **Opción A — puertas espaciales no puntuadas, desacopladas del DAG vía `flags.syncedNodeId`, sin migración.**
- **Sub-proyecto:** E (editor) · Fase 5 (consumo en runtime de las puertas autoradas en Fase 3).
- **Repos:** backend `psico_project_v2/backend_django` (núcleo) + frontend `psicologia_proyecto/admin-panel` (detección + wiring). **Sin migración de esquema.**
- **Rama:** `feat/case-editor-spatial-doors` (backend sobre Fase 3 backend `feat/case-editor-multiroom`; frontend sobre Fase 4 `feat/case-editor-runtime-ambient`).

## 1. Contexto y tensión

- La metadata de puerta ya se autora (Fase 3: `EXIT.metadata = {targetNodeKey, entryX, entryY}`) y `/world` ya la sirve (`world_service.py` objetos con `metadata`).
- **Bloqueo:** `require_world_state` (`world_service.py:172`) ata la sala mostrada al nodo DAG — resetea `scene_map`/jugador al mapa de `attempt.current_node` en **cada** carga (`:188-191`). Una puerta espacial sería sobre-escrita al instante.
- **Rooms = nodos** (1 `scene_map`/nodo, UNIQUE). El esquema lo posee Flyway (Spring, **congelado**) → **no** se puede migrar fácil. Por eso el modelo no requiere esquema nuevo.

## 2. Modelo (Opción A) — invariantes

- **Puertas = navegación espacial, NO puntuada.** Cruzar un `EXIT` con `targetNodeKey` carga el mapa de ese nodo destino en el punto de entrada, **sin** avanzar el DAG ni puntuar.
- **Desacople vía `flags.syncedNodeId`** (en `AttemptWorldState.flags_json`, sin migración): la sala mostrada puede diferir del nodo DAG.
- **`require_world_state` (cambio central):** resetea la sala al mapa de `current_node` **solo cuando `current_node != flags.syncedNodeId`** (el nodo cambió por una decisión); si coinciden, **respeta** la sala puesta por la puerta. Al resetear, fija `flags.syncedNodeId = current_node`.
- **Integridad del DAG preservada:** las decisiones siguen gatilladas por `current_node` (el motor rechaza decisiones que no son aristas salientes del nodo actual), así que caminar a otra sala **no** permite saltarse el orden clínico; y al tomar una decisión válida, el nodo avanza y la sala se resetea al destino (la decisión **sobre-escribe** la puerta). Caminar entre salas es exploración; el progreso clínico es por decisiones.

## 3. Backend (Django)

`world_service.py` (+ vista + url + tests):
1. **`require_world_state`** — usar `flags.syncedNodeId`:
   - leer `flags = _read_map(state.flags_json)`; `synced = flags.get("syncedNodeId")`.
   - si `state` nuevo, o `synced != attempt.current_node_id`: resetear `scene_map`/player a `expected_map` (mapa de `current_node`) y `flags["syncedNodeId"] = attempt.current_node_id`, guardar flags.
   - si coinciden: **no** resetear (respeta la sala de la puerta).
2. **`enter_room(attempt, target_node_key, entry_x, entry_y, actor)`** — nuevo:
   - `_require_in_progress`; resolver nodo destino por `node_key` en `attempt.case_version` con `scene_map` (si no existe → `NotFound`/`ValidationError`).
   - set `state.scene_map = target_map`, `player_x/y = clamp(entry)`; `flags["syncedNodeId"] = attempt.current_node_id` (para que **no** se resetee); guardar.
   - registrar evento `ROOM_ENTERED` (auditable, no puntuado). Devolver `_to_world_state`.
3. **Vista + URL:** `POST /api/simulation/attempts/<uuid>/enter-room` (auth por `attemptToken` como el resto), body `{attemptToken, targetNodeKey, entryX, entryY}` → `{data: SimulationWorldState, message}`.

## 4. Frontend (Angular + Phaser)

- **`game-world.component.ts`** (camino BD, sin `ScenarioConfig`): en `update()`, detección de puerta — si el jugador solapa un objeto `EXIT` cuyo `metadata.targetNodeKey` existe, emitir un evento **`enterRoom`** `{targetNodeKey, entryX, entryY}` (una vez por entrada; *guard* hasta que el jugador se aleje y vuelva). No interfiere con el `roomExit` del `ScenarioConfig`.
- **`simulation-play.component.ts`:** manejar `(enterRoom)` → `simulationService.enterRoom(attemptId, token, targetNodeKey, entryX, entryY)` → `setWorld(nuevoMundo)` (re-render de la nueva sala).
- **`simulation.service.ts`:** método `enterRoom(...)` → `POST .../enter-room`.

## 5. Manejo de errores / bordes / golden rule
- Puerta sin `targetNodeKey` → inerte (no emite).
- Nodo destino inexistente / sin mapa → backend `404`; el front no cambia de sala (sin crash).
- **No romper el flujo existente:** el cambio en `require_world_state` se cubre con tests (decisión sigue reseteando la sala; puerta persiste entre cargas; decisión sobre-escribe puerta) y se corre **toda** la suite `test_world.py` antes de declarar hecho.
- Intento no `IN_PROGRESS` → rechazado.

## 6. Pruebas
- **pytest (`test_world.py`):**
  - `enter_room` cambia la sala (otro `scene_map`) y **persiste** en el siguiente `/world` (no se resetea).
  - tras `enter_room`, una **decisión** válida avanza el nodo y la sala se resetea al destino del DAG (la decisión sobre-escribe).
  - `enter-room` a nodo inexistente/sin mapa → error.
  - regresión: suite `test_world.py` completa verde.
- **ng build** verde.
- **API smoke en vivo:** start attempt → `enter-room` a otra sala → `/world` devuelve esa sala → tomar decisión → `/world` vuelve al mapa del nodo.
- **Walk-through en juego** (manual): caminar a una puerta → cambia de sala (la detección Phaser es difícil de e2e; queda como verificación manual, como el canvas en fases previas).

## 7. Criterios de aceptación
- Caminar a un `EXIT` con destino carga la sala destino en el punto de entrada (no puntuado).
- La sala de puerta persiste entre cargas hasta que una decisión avanza el nodo (que la sobre-escribe).
- El flujo clínico (decisiones/puntaje/DAG) **no** cambia; `test_world.py` verde. Sin migración.

## 8. Cómo se procede
`writing-plans` → plan TDD (backend primero, golden-rule protegido) → `executing-plans` → `verify` (pytest + build + API smoke) → `finishing-a-development-branch` (push + PR).
