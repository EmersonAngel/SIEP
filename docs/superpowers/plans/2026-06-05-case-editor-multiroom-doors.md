# Editor de casos — Fase 3: Multi-sala (puertas + zoom + fondo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Autorar puertas (`EXIT`→sala destino+entrada), zoom de cámara y fondo por sala, y un switcher de salas in-editor. Editor Konva + 2 cambios pequeños de backend. Sin migración, sin runtime (Fase 4).

**Tech Stack:** Angular 21 + Konva + Jest (frontend `psicologia_proyecto/admin-panel`); Django + pytest (backend `psico_project_v2/backend_django`). Rama `feat/case-editor-multiroom` sobre `feat/case-editor-npc-paths`.

**Spec:** `docs/superpowers/specs/2026-06-05-case-editor-multiroom-doors-design.md`

---

## Task 1 (BE): `world_editor` expone `rooms` + `save_world` persiste `ambient`

**Files:** Modify `backend_django/apps/simulation/services/authoring_service.py`; Test `tests/test_authoring.py`.

- [ ] **Step 1: Failing tests** (append to `test_authoring.py`):

```python
def test_world_editor_exposes_rooms(admin, published_cv):
    we = cl(admin).get(f"{BASE}/{published_cv}/world-editor").data["data"]
    assert "rooms" in we and len(we["rooms"]) >= 1
    for k in ("nodeId", "nodeKey", "mapKey", "title"):
        assert k in we["rooms"][0]


def test_world_save_persists_ambient(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    body = {
        "revision": we["revision"], "objects": we["objects"],
        "collisionZones": we["collisionZones"], "clinicalTools": we["clinicalTools"],
        "map": {**we["map"], "ambient": {"cameraZoom": 1.5, "backgroundImage": "bg/sala.png"}},
    }
    ok = a.put(f"{BASE}/{clone_id}/world?nodeId={we['nodeId']}", body, format="json")
    assert ok.status_code == 200
    re_amb = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]["map"]["ambient"]
    assert re_amb.get("cameraZoom") == 1.5
    assert re_amb.get("backgroundImage") == "bg/sala.png"
```

- [ ] **Step 2:** Run → FAIL (`cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py -k "rooms or ambient" -v`).

- [ ] **Step 3:** In `world_editor`, add to the returned dict (after `availableDecisions`):

```python
        "rooms": [
            {"nodeId": mm.node_id, "nodeKey": mm.node.node_key, "mapKey": mm.map_key, "title": mm.title}
            for mm in SceneMap.objects.filter(case_version_id=case_version_id)
            .select_related("node").order_by("id")
        ],
```

- [ ] **Step 4:** In `save_world`, inside `if map_def is not None:`, after the `theme` block:

```python
        if map_def.get("ambient") is not None:
            scene_map.ambient_json = _write_map(map_def.get("ambient"))
```

- [ ] **Step 5:** Run → PASS; then full `test_authoring.py` (no regressions).
- [ ] **Step 6:** Commit (`feat(editor): world_editor rooms list + save_world persists ambient`).

---

## Task 2 (FE): Modelo + helpers puros `room-edit.util.ts` (TDD)

**Files:** Modify `core/models/simulation.model.ts`; Create `world-editor/room-edit.util.ts` (+ `.spec.ts`).

- [ ] **Step 1:** Model — add after `WorldOutgoingDecision`:

```typescript
export interface WorldRoom {
  nodeId: number;
  nodeKey: string;
  mapKey: string;
  title: string;
}
```
…and in `WorldDefinition`, add `rooms: WorldRoom[];`.

- [ ] **Step 2: Failing test** — `room-edit.util.spec.ts`:

```typescript
import {
  doorTarget, setDoorTarget, doorEntry, setDoorEntry,
  cameraZoom, setCameraZoom, backgroundImage, setBackgroundImage,
} from './room-edit.util';

describe('room-edit.util', () => {
  it('door target get/set', () => {
    expect(doorTarget(null)).toBe('');
    expect(doorTarget({ targetNodeKey: 'sala-2' })).toBe('sala-2');
    expect(setDoorTarget({}, 'sala-3')).toEqual({ targetNodeKey: 'sala-3' });
    expect(setDoorTarget({ entryX: 5 }, 'sala-3')).toEqual({ entryX: 5, targetNodeKey: 'sala-3' });
  });
  it('door entry get/set', () => {
    expect(doorEntry({ entryX: 10, entryY: 20 })).toEqual([10, 20]);
    expect(doorEntry(null)).toEqual([0, 0]);
    expect(setDoorEntry({ targetNodeKey: 's' }, 4, 8)).toEqual({ targetNodeKey: 's', entryX: 4, entryY: 8 });
  });
  it('camera zoom get/set clamps 0.25..4', () => {
    expect(cameraZoom(null)).toBe(1);
    expect(cameraZoom({ cameraZoom: 2 })).toBe(2);
    expect(setCameraZoom({}, 1.5)).toEqual({ cameraZoom: 1.5 });
    expect(setCameraZoom({}, 99)).toEqual({ cameraZoom: 4 });
    expect(setCameraZoom({}, 0)).toEqual({ cameraZoom: 0.25 });
  });
  it('background image get/set', () => {
    expect(backgroundImage(null)).toBe('');
    expect(backgroundImage({ backgroundImage: 'a.png' })).toBe('a.png');
    expect(setBackgroundImage({ cameraZoom: 2 }, 'b.png')).toEqual({ cameraZoom: 2, backgroundImage: 'b.png' });
    expect(setBackgroundImage({ backgroundImage: 'b.png' }, '')).toEqual({});
  });
});
```

- [ ] **Step 3:** Run → FAIL.

- [ ] **Step 4:** Implement `room-edit.util.ts`:

```typescript
/** Pure get/set helpers for door metadata (EXIT objects) and room ambient (zoom/bg). */
export type Json = Record<string, unknown>;

export function doorTarget(meta: Json | null | undefined): string {
  const v = (meta as { targetNodeKey?: unknown })?.targetNodeKey;
  return typeof v === 'string' ? v : '';
}
export function setDoorTarget(meta: Json, nodeKey: string): Json {
  return { ...meta, targetNodeKey: nodeKey };
}
export function doorEntry(meta: Json | null | undefined): [number, number] {
  const x = Number((meta as { entryX?: unknown })?.entryX);
  const y = Number((meta as { entryY?: unknown })?.entryY);
  return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}
export function setDoorEntry(meta: Json, x: number, y: number): Json {
  return { ...meta, entryX: x, entryY: y };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
export function cameraZoom(ambient: Json | null | undefined): number {
  const z = Number((ambient as { cameraZoom?: unknown })?.cameraZoom);
  return Number.isFinite(z) && z > 0 ? z : 1;
}
export function setCameraZoom(ambient: Json, z: number): Json {
  return { ...ambient, cameraZoom: clamp(Number.isFinite(z) ? z : 1, 0.25, 4) };
}
export function backgroundImage(ambient: Json | null | undefined): string {
  const v = (ambient as { backgroundImage?: unknown })?.backgroundImage;
  return typeof v === 'string' ? v : '';
}
export function setBackgroundImage(ambient: Json, url: string): Json {
  const next = { ...ambient };
  if (url) next['backgroundImage'] = url; else delete next['backgroundImage'];
  return next;
}
```

- [ ] **Step 5:** Run → PASS. Commit (`feat(editor): WorldRoom model + pure room-edit helpers`).

---

## Task 3 (FE): Store — rooms signal + SetMapAmbientCommand + load wiring

**Files:** Modify `world-editor.store.ts`.

- [ ] Add import `WorldRoom`. Add `readonly rooms = signal<WorldRoom[]>([]);`. In `load()` set `this.rooms.set(def.rooms ?? [])`.
- [ ] Add command (near others):

```typescript
export class SetMapAmbientCommand implements EditorCommand {
  readonly type = 'SetMapAmbient';
  private previous: Record<string, unknown> = {};
  constructor(private readonly ambient: Record<string, unknown>) {}
  execute(state: EditorState): EditorState {
    this.previous = state.map.ambient;
    return { ...state, map: { ...state.map, ambient: this.ambient } };
  }
  undo(state: EditorState): EditorState {
    return { ...state, map: { ...state.map, ambient: this.previous } };
  }
}
```

- [ ] Build check. Commit (`feat(editor): store rooms signal + SetMapAmbientCommand`).

---

## Task 4 (FE): Inspector — Puerta (EXIT) + Sala (switcher/zoom/fondo)

**Files:** Modify `world-editor.component.ts`.

- [ ] Import helpers from `room-edit.util` + `SetMapAmbientCommand`.
- [ ] **Puerta** block in the object inspector branch (shown when `obj.type === 'EXIT'`): select `store.rooms()` (exclude current `store.definition()?.nodeId`) bound to door target; inputs Entrada X/Y. Handlers `setDoorTargetFor(key, nodeKey)` / `setDoorEntryFor(key, x, y)` → `UpdateInspectorCommand(key, { metadata: setDoorTarget/​setDoorEntry(obj.metadata, …) })`.
- [ ] **Sala** block (always, e.g. above object form or in a toolbar area): room switcher `<select>` of `store.rooms()` → `switchRoom(nodeId)` calls `store.load(this.caseVersionId(), nodeId)`; zoom slider → `setZoom(z)` → `store.execute(new SetMapAmbientCommand(setCameraZoom(map.ambient, z)))`; background URL input → `setBg(url)` → `SetMapAmbientCommand(setBackgroundImage(...))`.
- [ ] Handlers + styles (mirror existing sections). Build green. Commit (`feat(editor): EXIT door inspector + room switcher/zoom/background panel`).

---

## Task 5 (FE): Canvas — background image + door indicators

**Files:** Modify `world-editor.component.ts` (`renderWorld`).

- [ ] Before grid, if `state.map.ambient.backgroundImage`: load via a cached `HTMLImageElement` and add a `Konva.Image` (x:0,y:0,width:map.width,height:map.height,listening:false) to `gridLayer`; on first load call `gridLayer.draw()`. Cache by URL to avoid reloading each render.
- [ ] In the objects loop, for `obj.type === 'EXIT'` with `metadata.targetNodeKey`, add a small label `→ {target}` under the object.
- [ ] Build green. Commit (`feat(editor): canvas background image + EXIT door target labels`).

---

## Task 6: Verify

- [ ] `cd admin-panel && npx jest src/app/features/simulator/world-editor/` → green (room-edit + path-edit + store).
- [ ] `npm run build` → 0 errors.
- [ ] `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py -q` → green.
- [ ] Browser smoke (Django :8091 + Angular :4200): admin → editor → clone DRAFT → Mundo → pick node → select an EXIT (or place one) → set sala destino + entrada → set zoom + background → save → reload → door + ambient persist; switcher changes room.

---

## Self-Review
- **Cobertura del spec:** puertas (Tasks 4+5+2), zoom/fondo (Tasks 1,3,4,5,2), switcher (Task 4), backend rooms+ambient (Task 1), tests (2,1,6). ✓
- **Placeholders:** código completo en helpers + backend + comandos; UI descrita con handlers concretos (se detalla al implementar, sin lógica nueva oculta). ✓
- **Tipos:** `WorldRoom`, `doorTarget/​setDoorTarget/​doorEntry/​setDoorEntry/​cameraZoom/​setCameraZoom/​backgroundImage/​setBackgroundImage`, `SetMapAmbientCommand`, `rooms` signal — consistentes en util, store, componente, spec. ✓
