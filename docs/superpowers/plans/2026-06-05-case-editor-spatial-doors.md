# Editor de casos — Fase 5: Puertas espaciales en runtime — Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans. Backend primero (golden-rule protegido por la suite completa).

**Goal:** Caminar a un `EXIT` con `metadata.targetNodeKey` carga la sala destino (no puntuado), desacoplando la sala del nodo DAG vía `flags.syncedNodeId`. Sin migración.

**Spec:** `docs/superpowers/specs/2026-06-05-case-editor-spatial-doors-design.md`
**Ramas:** backend `feat/case-editor-spatial-doors` sobre `feat/case-editor-multiroom`; frontend `feat/case-editor-spatial-doors` sobre `feat/case-editor-runtime-ambient`.

---

## Task 1 (BE): `enter_room` + desacople de `require_world_state` (TDD)

**Files:** Modify `backend_django/apps/simulation/services/world_service.py`; Modify `apps/simulation/views/game_views.py` + `urls.py`; Test `apps/simulation/tests/test_world.py`.

- [ ] **Step 1: Failing tests** (append to `test_world.py`, reusando los fixtures/arranque de intento del archivo):

```python
def test_enter_room_moves_and_persists(student, playable_cv):
    a = cl(student)
    att = a.post(f"{SIM}/attempts", {"caseVersionId": playable_cv}, format="json").data["data"]
    aid, tok = att["attemptId"], att["attemptToken"]
    ed = cl_admin().get(f"/api/admin/cases/{playable_cv}/world-editor").data["data"]
    rooms = ed["rooms"]
    cur = a.get(f"{SIM}/attempts/{aid}/world", **hdr(tok)).data["data"]["map"]["key"]
    target = next(r for r in rooms if r["mapKey"] != cur)

    resp = a.post(f"{SIM}/attempts/{aid}/enter-room",
                  {"attemptToken": tok, "targetNodeKey": target["nodeKey"], "entryX": 100, "entryY": 120},
                  format="json")
    assert resp.status_code == 200
    assert resp.data["data"]["map"]["key"] == target["mapKey"]
    # persists across a fresh /world load (not reset to the DAG node's map)
    again = a.get(f"{SIM}/attempts/{aid}/world", **hdr(tok)).data["data"]
    assert again["map"]["key"] == target["mapKey"]


def test_enter_room_invalid_node(student, playable_cv):
    a = cl(student)
    att = a.post(f"{SIM}/attempts", {"caseVersionId": playable_cv}, format="json").data["data"]
    resp = a.post(f"{SIM}/attempts/{att['attemptId']}/enter-room",
                  {"attemptToken": att["attemptToken"], "targetNodeKey": "no-existe", "entryX": 0, "entryY": 0},
                  format="json")
    assert resp.status_code in (400, 404)
```

> Ajustar helpers (`SIM`, `cl`, `hdr`, `cl_admin`, fixtures `student`/`playable_cv`) a los que ya usa `test_world.py` (leer el encabezado del archivo antes de escribir; reusar su patrón exacto de arranque de intento y auth por token).

- [ ] **Step 2:** Run → FAIL (`cd backend_django && python -m pytest apps/simulation/tests/test_world.py -k enter_room -v`).

- [ ] **Step 3: Desacoplar `require_world_state`** (reemplazar el reset incondicional):

```python
def require_world_state(attempt):
    expected_map = SceneMap.objects.filter(node_id=attempt.current_node_id).first()
    if not expected_map:
        raise NotFound("La escena no tiene mapa configurado")
    state = (
        AttemptWorldState.objects.filter(attempt_id=attempt.id).select_related("scene_map").first()
    )
    if state is None:
        state = AttemptWorldState(
            attempt=attempt, scene_map=expected_map,
            player_x=expected_map.spawn_x, player_y=expected_map.spawn_y,
        )
    flags = _read_map(state.flags_json)
    synced = flags.get("syncedNodeId")
    # Reset to the DAG node's map only when the node changed (decision) — otherwise
    # respect the room set by a spatial door (Fase 5).
    if state.scene_map_id is None or synced != attempt.current_node_id:
        state.scene_map = expected_map
        state.player_x = expected_map.spawn_x
        state.player_y = expected_map.spawn_y
        flags["syncedNodeId"] = attempt.current_node_id
        state.flags_json = _write_map(flags)
    state.save()
    return state
```

> Confirmar que `_read_map`/`_write_map` existen en `world_service.py` (o importarlos/replicarlos como en `authoring_service.py`).

- [ ] **Step 4: `enter_room`** (nuevo, en `world_service.py`):

```python
@transaction.atomic
def enter_room(attempt, target_node_key, entry_x, entry_y, actor):
    _require_in_progress(attempt)
    target = (
        SceneMap.objects.select_related("node")
        .filter(node__case_version_id=attempt.case_version_id, node__node_key=target_node_key)
        .first()
    )
    if not target:
        raise NotFound(f"No hay sala para el nodo destino: {target_node_key}")
    state = require_world_state(attempt)
    state.scene_map = target
    state.player_x = _clamp(_int(entry_x), 0, target.width or 960)
    state.player_y = _clamp(_int(entry_y), 0, target.height or 540)
    flags = _read_map(state.flags_json)
    flags["syncedNodeId"] = attempt.current_node_id  # keep — don't reset on next load
    state.flags_json = _write_map(flags)
    state.save()
    _save_event(attempt, "ROOM_ENTERED", f"Puerta → sala {target_node_key}")
    return _to_world_state(attempt, state)
```

> `_clamp`/`_int` ya existen en `world_service.py` (usados en `update_position`); si `_int` no existe, usar `int(...)` con guarda. `attempt.case_version_id` — confirmar el nombre del campo (puede ser `attempt.case_version_id` vía `current_node.case_version_id`).

- [ ] **Step 5: Vista + URL.** En `game_views.py` añadir `EnterRoomView` (espejo de `WorldStateView`/`InteractionView`: auth por `attemptToken`, `_require_attempt`); en `urls.py` añadir `path("/attempts/<uuid:attempt_id>/enter-room", EnterRoomView.as_view())`.

- [ ] **Step 6:** Run → PASS los 2 nuevos; luego **toda** `test_world.py` (regresión).
- [ ] **Step 7: Commit** (`feat(runtime): spatial door enter-room (non-scored, decoupled from DAG via flags)`).

---

## Task 2 (FE): Detección de puerta (Phaser) + wiring + servicio

**Files:** Modify `game-world.component.ts`, `simulation-play.component.ts`, `core/api/simulation.service.ts`.

- [ ] **Step 1:** `simulation.service.ts` — método:

```typescript
enterRoom(attemptId: string, attemptToken: string, targetNodeKey: string, entryX: number, entryY: number) {
  return this.http.post<ApiResponse<SimulationWorldState>>(
    `/api/simulation/attempts/${attemptId}/enter-room`,
    { attemptToken, targetNodeKey, entryX, entryY }).pipe(map(r => r.data));
}
```

- [ ] **Step 2:** `game-world.component.ts` — output `enterRoom` + detección en `update()` (solo camino BD, `!this.scenarioConfig`): si el jugador solapa un `MapObjectState` `type==='EXIT'` con `metadata?.targetNodeKey`, emitir `enterRoom.emit({ targetNodeKey, entryX, entryY })` una vez (flag `doorArmed` que se re-arma al alejarse). Reusar el patrón de proximidad existente (`proximity`).

- [ ] **Step 3:** `simulation-play.component.ts` — en el template `<app-game-world>` añadir `(enterRoom)="onEnterRoom($event)"`; handler:

```typescript
onEnterRoom(e: { targetNodeKey: string; entryX: number; entryY: number }) {
  const game = this.attempt(); if (!game) return;
  this.simulationService.enterRoom(game.attemptId, game.attemptToken, e.targetNodeKey, e.entryX, e.entryY)
    .subscribe({ next: w => this.world.set(w) });
}
```

- [ ] **Step 4:** `npm run build` verde. Commit (`feat(runtime): walk-through spatial doors load target room (DB world)`).

---

## Task 3: Verificación
- [ ] `cd backend_django && python -m pytest apps/simulation/tests/test_world.py -q` → verde (incl. regresión).
- [ ] `npm run build` verde.
- [ ] API smoke en vivo: start attempt → `enter-room` → `/world` = sala destino; decisión → `/world` vuelve al mapa del nodo.
- [ ] Walk-through manual en el juego (caminar a la puerta → cambia de sala).

---

## Self-Review
- **Cobertura:** enter-room + persistencia (Task 1), desacople sin romper decisiones (Task 1 Step 3 + regresión), detección+wiring (Task 2), tests (1,3). ✓
- **Golden rule:** suite `test_world.py` completa antes de declarar hecho. ✓
- **Sin migración** (flags_json). DAG intacto (decisiones gatilladas por current_node). ✓
- **Verificar al implementar:** nombres exactos de helpers/fixtures en `world_service.py` y `test_world.py` (releer antes de editar).
