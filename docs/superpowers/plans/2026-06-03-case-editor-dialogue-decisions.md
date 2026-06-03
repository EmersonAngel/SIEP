# Editor de casos — Fase 1: Diálogos + decisiones inline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir autorar, desde el editor visual Konva, el diálogo de un objeto/NPC (líneas) y las opciones de respuesta del estudiante, cableando cada opción a una rama existente del DAG; persistirlo en Django.

**Architecture:** El backend `save_world` (hoy ignora diálogos) se extiende para hacer upsert con reconciliación de `dialogue_trees`/`dialogue_lines`/`dialogue_choices`, y `world_editor` expone las decisiones salientes del nodo. El frontend añade `dialogues` al `EditorState` del store (con comandos undo/redo puros) y una sección "Diálogo" en el inspector existente. El runtime no cambia: el motor DAG ya hace que elegir una opción lleve a otra rama.

**Tech Stack:** Django 5 + DRF + pytest (backend, `psico_project_v2/backend_django`); Angular 21 + Konva + Signals + Jest + Playwright (frontend, `psicologia_proyecto/admin-panel`).

**Spec:** `docs/superpowers/specs/2026-06-03-case-editor-dialogue-decisions-design.md`

---

## Repos y comandos canónicos

- **Backend (BE):** `D:\Sua_Files\IdeaProjects\psico_project_v2\backend_django`
  - Tests: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py -v`
  - Check: `cd backend_django && python manage.py check`
- **Frontend (FE):** `D:\Sua_Files\IdeaProjects\psicologia_proyecto\admin-panel`
  - Unit: `cd admin-panel && npx jest <ruta-spec>`
  - Build: `cd admin-panel && npm run build`

> Los commits del backend van al repo `psico_project_v2`; los del frontend al repo `psicologia_proyecto`. Son streams de git separados.

## File Structure

**Backend (modificar):**
- `backend_django/apps/simulation/services/authoring_service.py` — `save_world` (persistir + reconciliar diálogos), `world_editor` (añadir `availableDecisions`), nuevo helper `_save_dialogue_choices`.
- `backend_django/apps/simulation/tests/test_authoring.py` — tests nuevos.

**Frontend (modificar/crear):**
- `admin-panel/src/app/core/models/simulation.model.ts` — `WorldOutgoingDecision`, `mapObjectKey?`, `availableDecisions`.
- `admin-panel/src/app/features/simulator/world-editor/world-editor.store.ts` — `EditorState.dialogues`, `availableDecisions` signal, `selectedDialogue` computed, `buildWorldSaveRequest()` puro, comandos `UpsertDialogueCommand`/`DeleteDialogueCommand`, load/save wiring.
- `admin-panel/src/app/features/simulator/world-editor/world-editor.store.spec.ts` — **crear** (tests puros).
- `admin-panel/src/app/features/simulator/world-editor/world-editor.component.ts` — sección "Diálogo" en el inspector + handlers + marcador en lienzo.

---

## Task 1 (BE): `save_world` persiste diálogos (árbol + líneas + choices)

**Files:**
- Modify: `backend_django/apps/simulation/services/authoring_service.py` (`save_world` ~959; helper nuevo cerca de `_save_dialogue_lines` ~454)
- Test: `backend_django/apps/simulation/tests/test_authoring.py`

- [ ] **Step 1: Write the failing test**

Añadir al final de `test_authoring.py`:

```python
def test_world_save_persists_dialogue_with_choices(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    rev, node_id = we["revision"], we["nodeId"]
    obj_key = we["objects"][0]["key"]
    decision_id = a.get(f"{BASE}/{clone_id}/editor").data["data"]["decisions"][0]["id"]

    body = {
        "revision": rev,
        "map": we["map"],
        "objects": we["objects"],
        "collisionZones": we["collisionZones"],
        "clinicalTools": we["clinicalTools"],
        "dialogues": [{
            "id": None, "key": "dlg-test", "speakerName": "Consultante",
            "portraitKey": None, "emotion": "ansiedad",
            "mapObjectId": None, "mapObjectKey": obj_key,
            "lines": [{"order": 0, "speakerName": "Consultante",
                       "text": "Tengo miedo.", "emotion": "ansiedad"}],
            "choices": [{"key": "c1", "text": "Estás a salvo aquí.",
                         "decisionOptionId": decision_id, "requiredToolCode": None,
                         "effect": {}, "displayOrder": 0}],
        }],
    }
    resp = a.put(f"{BASE}/{clone_id}/world?nodeId={node_id}", body, format="json")
    assert resp.status_code == 200

    reloaded = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    tree = next(t for t in reloaded["dialogues"] if t["key"] == "dlg-test")
    assert len(tree["lines"]) == 1 and tree["lines"][0]["text"] == "Tengo miedo."
    assert len(tree["choices"]) == 1
    assert tree["choices"][0]["decisionOptionId"] == decision_id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py::test_world_save_persists_dialogue_with_choices -v`
Expected: FAIL (el diálogo `dlg-test` no aparece tras recargar — `save_world` ignora diálogos).

- [ ] **Step 3: Add the `_save_dialogue_choices` helper**

Insertar justo después de `_save_dialogue_lines` (~línea 464):

```python
def _save_dialogue_choices(tree, choices, case_version_id):
    if not choices:
        return
    for ch in choices:
        decision = None
        if ch.get("decisionOptionId") is not None:
            decision = DecisionOption.objects.filter(
                pk=ch.get("decisionOptionId"), case_version_id=case_version_id
            ).first()
        DialogueChoice.objects.create(
            dialogue_tree=tree,
            choice_key=ch.get("key") or "",
            text=ch.get("text") or "",
            decision_option=decision,
            required_tool_code=ch.get("requiredToolCode"),
            effect_json=_write_map(ch.get("effect")),
            display_order=_int(ch.get("displayOrder")),
        )
```

- [ ] **Step 4: Persist dialogues inside `save_world`**

En `save_world`, **reemplazar** la línea final `return world_editor(case_version_id, node_id)` (~1029) por el bloque siguiente (procesa diálogos antes de retornar):

```python
    dialogues = request.get("dialogues")
    if dialogues is not None:
        obj_by_key = {o.object_key: o for o in MapObject.objects.filter(scene_map=scene_map)}
        for dt in dialogues:
            tree = None
            if dt.get("id") is not None:
                tree = DialogueTree.objects.filter(pk=dt.get("id"), scene_map=scene_map).first()
            if tree is None:
                tree = DialogueTree(scene_map=scene_map)
            owner = None
            if dt.get("mapObjectKey") is not None:
                owner = obj_by_key.get(dt.get("mapObjectKey"))
            if owner is None and dt.get("mapObjectId") is not None:
                owner = MapObject.objects.filter(pk=dt.get("mapObjectId"), scene_map=scene_map).first()
            tree.scene_map = scene_map
            tree.map_object = owner
            tree.tree_key = dt.get("key") or ""
            tree.speaker_name = dt.get("speakerName") or ""
            tree.portrait_key = dt.get("portraitKey")
            tree.emotion = dt.get("emotion") if dt.get("emotion") is not None else "neutral"
            tree.save()
            DialogueLine.objects.filter(dialogue_tree=tree).delete()
            for ln in (dt.get("lines") or []):
                DialogueLine.objects.create(
                    dialogue_tree=tree,
                    display_order=_int(ln.get("order")),
                    speaker_name=ln.get("speakerName") or tree.speaker_name,
                    text=ln.get("text") or "",
                    emotion=ln.get("emotion") if ln.get("emotion") is not None else "neutral",
                )
            DialogueChoice.objects.filter(dialogue_tree=tree).delete()
            _save_dialogue_choices(tree, dt.get("choices"), case_version_id)

    # Spring calls caseVersionRepository.save(version); @Version only bumps when the
    # entity is dirty (it isn't here), so the revision is intentionally left unchanged.
    return world_editor(case_version_id, node_id)
```

> Nota de contrato: las **líneas** usan `order` (lo que devuelve `_world_dialogue_tree`), las **choices** usan `displayOrder`. Respetar ambos.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py::test_world_save_persists_dialogue_with_choices -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd backend_django && git add apps/simulation/services/authoring_service.py apps/simulation/tests/test_authoring.py
git commit -m "feat(editor): persist dialogue trees/lines/choices in save_world

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2 (BE): `save_world` reconcilia (elimina diálogos ausentes)

**Files:**
- Modify: `backend_django/apps/simulation/services/authoring_service.py` (bloque de diálogos en `save_world`)
- Test: `backend_django/apps/simulation/tests/test_authoring.py`

- [ ] **Step 1: Write the failing test**

```python
def test_world_save_removes_absent_dialogues(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    obj_key = we["objects"][0]["key"]
    base = {"map": we["map"], "objects": we["objects"],
            "collisionZones": we["collisionZones"], "clinicalTools": we["clinicalTools"]}

    a.put(f"{BASE}/{clone_id}/world?nodeId={we['nodeId']}",
          {**base, "revision": we["revision"], "dialogues": [{
              "id": None, "key": "tmp", "speakerName": "X", "portraitKey": None,
              "emotion": "neutral", "mapObjectId": None, "mapObjectKey": obj_key,
              "lines": [], "choices": []}]}, format="json")
    we2 = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    assert any(t["key"] == "tmp" for t in we2["dialogues"])

    a.put(f"{BASE}/{clone_id}/world?nodeId={we2['nodeId']}",
          {**base, "revision": we2["revision"], "dialogues": []}, format="json")
    we3 = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    assert all(t["key"] != "tmp" for t in we3["dialogues"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py::test_world_save_removes_absent_dialogues -v`
Expected: FAIL (el árbol `tmp` persiste tras enviar `dialogues: []`).

- [ ] **Step 3: Add reconciliation to the dialogue block**

En `save_world`, dentro del `if dialogues is not None:`, **inicializar** una lista de ids conservados y **borrar** los ausentes. Cambiar el inicio del bloque a:

```python
    dialogues = request.get("dialogues")
    if dialogues is not None:
        obj_by_key = {o.object_key: o for o in MapObject.objects.filter(scene_map=scene_map)}
        kept_tree_ids = []
        for dt in dialogues:
```

…y dentro del bucle, tras `tree.save()`, añadir:

```python
            kept_tree_ids.append(tree.id)
```

…y justo después del bucle `for dt in dialogues:` (antes del comentario de `@Version`), añadir:

```python
        DialogueTree.objects.filter(scene_map=scene_map).exclude(pk__in=kept_tree_ids).delete()
```

- [ ] **Step 4: Run tests to verify both dialogue tests pass**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py -k dialogue -v`
Expected: PASS (los dos tests de diálogo).

- [ ] **Step 5: Commit**

```bash
cd backend_django && git add apps/simulation/services/authoring_service.py apps/simulation/tests/test_authoring.py
git commit -m "feat(editor): reconcile (delete absent) dialogues in save_world

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3 (BE): `world_editor` expone `availableDecisions` (salientes del nodo)

**Files:**
- Modify: `backend_django/apps/simulation/services/authoring_service.py` (`world_editor` ~906-946)
- Test: `backend_django/apps/simulation/tests/test_authoring.py`

- [ ] **Step 1: Write the failing test**

```python
def test_world_editor_exposes_available_decisions(admin, published_cv):
    we = cl(admin).get(f"{BASE}/{published_cv}/world-editor").data["data"]
    assert "availableDecisions" in we
    for d in we["availableDecisions"]:
        for k in ("id", "optionKey", "text", "classification", "targetNodeKey", "prohibitedConduct"):
            assert k in d, f"availableDecisions missing {k}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py::test_world_editor_exposes_available_decisions -v`
Expected: FAIL with `KeyError`/`assert "availableDecisions" in we`.

- [ ] **Step 3: Add `availableDecisions` to the payload**

En `world_editor`, antes del `return {`, añadir:

```python
    outgoing = list(
        DecisionOption.objects.filter(source_node_id=scene_map.node_id)
        .select_related("target_node")
        .order_by("id")
    )
```

…y dentro del dict retornado, añadir la clave (p. ej. tras `"validation": validation,`):

```python
        "availableDecisions": [
            {
                "id": d.id,
                "optionKey": d.option_key,
                "text": d.text,
                "classification": d.classification,
                "targetNodeKey": d.target_node.node_key,
                "prohibitedConduct": d.prohibited_conduct,
            }
            for d in outgoing
        ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py::test_world_editor_exposes_available_decisions -v`
Expected: PASS

- [ ] **Step 5: Run the whole authoring suite (no regressions)**

Run: `cd backend_django && python -m pytest apps/simulation/tests/test_authoring.py -v`
Expected: PASS (todos, incluidos los previos `test_world_editor`, `test_world_save_optimistic_lock`).

- [ ] **Step 6: Commit**

```bash
cd backend_django && git add apps/simulation/services/authoring_service.py apps/simulation/tests/test_authoring.py
git commit -m "feat(editor): expose node outgoing decisions in world-editor payload

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4 (FE): Adiciones al modelo

**Files:**
- Modify: `admin-panel/src/app/core/models/simulation.model.ts`

- [ ] **Step 1: Add `mapObjectKey?` to `WorldDialogueTree`**

En `WorldDialogueTree` (~línea 571), añadir tras `mapObjectId: number | null;`:

```typescript
  /** Clave estable del objeto dueño; usada al guardar para resolver objetos nuevos sin id. */
  mapObjectKey?: string;
```

- [ ] **Step 2: Add `WorldOutgoingDecision` + `availableDecisions`**

Tras la interfaz `WorldDefinition` (~línea 610), añadir:

```typescript
export interface WorldOutgoingDecision {
  id: number;
  optionKey: string;
  text: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE';
  targetNodeKey: string;
  prohibitedConduct: boolean;
}
```

Y dentro de `WorldDefinition`, añadir el campo (tras `validation: WorldValidationState;`):

```typescript
  /** Decisiones salientes del nodo de este mapa (para cablear opciones de respuesta). */
  availableDecisions: WorldOutgoingDecision[];
```

- [ ] **Step 3: Verify it compiles**

Run: `cd admin-panel && npx tsc -p tsconfig.app.json --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
cd admin-panel && git add src/app/core/models/simulation.model.ts
git commit -m "feat(editor): model — WorldOutgoingDecision + dialogue mapObjectKey

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5 (FE): `EditorState.dialogues` + `buildWorldSaveRequest()` puro

**Files:**
- Modify: `admin-panel/src/app/features/simulator/world-editor/world-editor.store.ts`
- Test: `admin-panel/src/app/features/simulator/world-editor/world-editor.store.spec.ts` (crear)

- [ ] **Step 1: Add `dialogues` to `EditorState` + imports**

En `world-editor.store.ts`, ampliar el import del modelo (línea ~17) para incluir `WorldDialogueTree` y `WorldOutgoingDecision`:

```typescript
import {
  WorldDefinition,
  WorldObject,
  WorldCollisionZone,
  WorldValidationState,
  WorldSaveRequest,
  SceneMapDefinition,
  WorldDialogueTree,
  WorldOutgoingDecision
} from '../../../core/models/simulation.model';
```

Y cambiar `EditorState` (~línea 197) a:

```typescript
export interface EditorState {
  map: SceneMapDefinition;
  objects: WorldObject[];
  collisionZones: WorldCollisionZone[];
  dialogues: WorldDialogueTree[];
}
```

- [ ] **Step 2: Write the failing test (pure helper)**

Crear `world-editor.store.spec.ts`:

```typescript
import { buildWorldSaveRequest, EditorState } from './world-editor.store';
import { WorldDefinition, WorldDialogueTree } from '../../../core/models/simulation.model';

function tree(key: string, objectKey: string): WorldDialogueTree {
  return { id: 1, key, speakerName: 'X', portraitKey: null, emotion: 'neutral',
           mapObjectId: null, mapObjectKey: objectKey, lines: [], choices: [] };
}

function emptyDef(): WorldDefinition {
  return {
    schemaVersion: 2, caseVersionId: 1, revision: 7, nodeId: 3,
    map: { id: 1, key: 'm', title: 'M', width: 960, height: 540, theme: 't',
           spawnX: 0, spawnY: 0, ambient: {} },
    objects: [], collisionZones: [],
    dialogues: [tree('old', 'npc-1')],
    clinicalTools: [], safeExit: { configured: false, exitObjectKey: null, supportResources: [] },
    validation: { errors: [], warnings: [], canPublish: true },
    availableDecisions: [],
  };
}

describe('buildWorldSaveRequest', () => {
  it('sends the EDITED dialogues from state, not the original definition', () => {
    const def = emptyDef();
    const state: EditorState = {
      map: def.map, objects: [], collisionZones: [],
      dialogues: [tree('edited', 'npc-1')],
    };
    const body = buildWorldSaveRequest(def, state);
    expect(body.revision).toBe(7);
    expect(body.dialogues).toHaveLength(1);
    expect(body.dialogues[0].key).toBe('edited');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd admin-panel && npx jest src/app/features/simulator/world-editor/world-editor.store.spec.ts`
Expected: FAIL (`buildWorldSaveRequest` no existe / no exportado).

- [ ] **Step 4: Implement `buildWorldSaveRequest` and use it in the store**

En `world-editor.store.ts`, añadir la función exportada (cerca de `EditorState`, tras su definición):

```typescript
/** Pure builder for the world-save payload. Sends edited dialogues from state. */
export function buildWorldSaveRequest(def: WorldDefinition, state: EditorState): WorldSaveRequest {
  return {
    revision: def.revision,
    map: state.map,
    objects: state.objects,
    collisionZones: state.collisionZones,
    dialogues: state.dialogues,
    clinicalTools: def.clinicalTools,
  };
}
```

Y reemplazar el cuerpo de `executeSave()` que arma `body` (líneas ~423-431) por:

```typescript
    this.saving.set(true);
    const body = buildWorldSaveRequest(def, state);
    return this.simulationService.saveWorld(this.caseVersionId, body, this.nodeId);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd admin-panel && npx jest src/app/features/simulator/world-editor/world-editor.store.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd admin-panel && git add src/app/features/simulator/world-editor/world-editor.store.ts src/app/features/simulator/world-editor/world-editor.store.spec.ts
git commit -m "feat(editor): EditorState.dialogues + pure buildWorldSaveRequest

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6 (FE): Comandos de diálogo (undo/redo puros)

**Files:**
- Modify: `admin-panel/src/app/features/simulator/world-editor/world-editor.store.ts`
- Test: `admin-panel/src/app/features/simulator/world-editor/world-editor.store.spec.ts`

- [ ] **Step 1: Write the failing tests**

Añadir a `world-editor.store.spec.ts`:

```typescript
import { UpsertDialogueCommand, DeleteDialogueCommand } from './world-editor.store';

function state(dialogues = []): EditorState {
  return { map: emptyDef().map, objects: [], collisionZones: [], dialogues };
}

describe('UpsertDialogueCommand', () => {
  it('adds a new dialogue for an object key', () => {
    const cmd = new UpsertDialogueCommand('npc-1', tree('a', 'npc-1'));
    const next = cmd.execute(state());
    expect(next.dialogues).toHaveLength(1);
    expect(next.dialogues[0].key).toBe('a');
  });

  it('replaces the dialogue of the same object key', () => {
    const s = state([tree('a', 'npc-1')]);
    const cmd = new UpsertDialogueCommand('npc-1', tree('b', 'npc-1'));
    const next = cmd.execute(s);
    expect(next.dialogues).toHaveLength(1);
    expect(next.dialogues[0].key).toBe('b');
  });

  it('undo restores the previous dialogue', () => {
    const s = state([tree('a', 'npc-1')]);
    const cmd = new UpsertDialogueCommand('npc-1', tree('b', 'npc-1'));
    const after = cmd.execute(s);
    const back = cmd.undo(after);
    expect(back.dialogues[0].key).toBe('a');
  });
});

describe('DeleteDialogueCommand', () => {
  it('removes and undo restores', () => {
    const s = state([tree('a', 'npc-1')]);
    const cmd = new DeleteDialogueCommand('npc-1');
    const after = cmd.execute(s);
    expect(after.dialogues).toHaveLength(0);
    const back = cmd.undo(after);
    expect(back.dialogues[0].key).toBe('a');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd admin-panel && npx jest src/app/features/simulator/world-editor/world-editor.store.spec.ts`
Expected: FAIL (comandos no existen).

- [ ] **Step 3: Implement the commands**

En `world-editor.store.ts`, junto a los demás comandos (tras `UpdateSpawnCommand`, ~línea 193), añadir:

```typescript
export class UpsertDialogueCommand implements EditorCommand {
  readonly type = 'UpsertDialogue';
  private previous: WorldDialogueTree | null = null;

  constructor(private readonly objectKey: string, private readonly tree: WorldDialogueTree) {}

  execute(state: EditorState): EditorState {
    this.previous = state.dialogues.find(d => d.mapObjectKey === this.objectKey) ?? null;
    const others = state.dialogues.filter(d => d.mapObjectKey !== this.objectKey);
    return { ...state, dialogues: [...others, this.tree] };
  }

  undo(state: EditorState): EditorState {
    const others = state.dialogues.filter(d => d.mapObjectKey !== this.objectKey);
    return { ...state, dialogues: this.previous ? [...others, this.previous] : others };
  }
}

export class DeleteDialogueCommand implements EditorCommand {
  readonly type = 'DeleteDialogue';
  private previous: WorldDialogueTree | null = null;

  constructor(private readonly objectKey: string) {}

  execute(state: EditorState): EditorState {
    this.previous = state.dialogues.find(d => d.mapObjectKey === this.objectKey) ?? null;
    return { ...state, dialogues: state.dialogues.filter(d => d.mapObjectKey !== this.objectKey) };
  }

  undo(state: EditorState): EditorState {
    if (!this.previous) return state;
    return { ...state, dialogues: [...state.dialogues, this.previous] };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd admin-panel && npx jest src/app/features/simulator/world-editor/world-editor.store.spec.ts`
Expected: PASS (todos los describe de este archivo).

- [ ] **Step 5: Commit**

```bash
cd admin-panel && git add src/app/features/simulator/world-editor/world-editor.store.ts src/app/features/simulator/world-editor/world-editor.store.spec.ts
git commit -m "feat(editor): Upsert/Delete dialogue commands (undo-redo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7 (FE): Store carga diálogos (+ backfill `mapObjectKey`), `availableDecisions` y `selectedDialogue`

**Files:**
- Modify: `admin-panel/src/app/features/simulator/world-editor/world-editor.store.ts`

- [ ] **Step 1: Add `availableDecisions` signal + `selectedDialogue` computed**

Tras `readonly validationState = signal<...>(null);` (~línea 231), añadir:

```typescript
  readonly availableDecisions = signal<WorldOutgoingDecision[]>([]);
```

Tras el computed `selectedZone` (~línea 251), añadir:

```typescript
  readonly selectedDialogue = computed(() => {
    const key = this.selectedKey();
    const state = this.editorState();
    if (!key || !state) return null;
    return state.dialogues.find(d => d.mapObjectKey === key) ?? null;
  });
```

- [ ] **Step 2: Wire dialogues + decisions into `load()`**

En `load()`, dentro de `next: def => {`, reemplazar el `this.editorState.set({...})` por una versión que incluya diálogos con `mapObjectKey` resuelto, y fijar `availableDecisions`:

```typescript
      next: def => {
        this.definition.set(def);
        const objKeyById = new Map(def.objects.map(o => [o.id, o.key]));
        const dialogues = def.dialogues.map(d => ({
          ...d,
          mapObjectKey: d.mapObjectKey
            ?? (d.mapObjectId != null ? objKeyById.get(d.mapObjectId) : undefined),
        }));
        this.editorState.set({
          map: { ...def.map },
          objects: [...def.objects],
          collisionZones: [...def.collisionZones],
          dialogues,
        });
        this.availableDecisions.set(def.availableDecisions ?? []);
        this.validationState.set(def.validation);
        this.loading.set(false);
        this.dirty.set(false);
      },
```

- [ ] **Step 3: Verify build**

Run: `cd admin-panel && npm run build`
Expected: 0 errores de compilación.

- [ ] **Step 4: Commit**

```bash
cd admin-panel && git add src/app/features/simulator/world-editor/world-editor.store.ts
git commit -m "feat(editor): load dialogues (backfill mapObjectKey) + availableDecisions + selectedDialogue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8 (FE): Sección "Diálogo" en el inspector + handlers

**Files:**
- Modify: `admin-panel/src/app/features/simulator/world-editor/world-editor.component.ts`

- [ ] **Step 1: Import commands + dialogue types**

Ampliar el import del store (~línea 34) para incluir `UpsertDialogueCommand`, `DeleteDialogueCommand`; y el import del modelo (~línea 46) para incluir `WorldDialogueTree`, `WorldDialogueLine`, `WorldDialogueChoice`.

- [ ] **Step 2: Add the dialogue UI block to the template**

Dentro del bloque `@if (store.selectedObject(); as obj) { ... }` del inspector, **después** del botón "Eliminar objeto" y antes de cerrar ese `<div class="we-form">`/branch, insertar:

```html
            </div>
            <!-- ── Diálogo del objeto ───────────────────────────────── -->
            <div class="we-dialogue">
              @if (store.selectedDialogue(); as dlg) {
                <div class="we-dialogue-head">
                  <h4>Diálogo</h4>
                  <button class="we-del" (click)="removeDialogue()" type="button" title="Quitar diálogo">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
                <label><span>Hablante</span>
                  <input [ngModel]="dlg.speakerName" (ngModelChange)="updateDialogueField('speakerName', $event)" />
                </label>
                <label><span>Emoción</span>
                  <input [ngModel]="dlg.emotion" (ngModelChange)="updateDialogueField('emotion', $event)" />
                </label>

                <div class="we-sub">
                  <span class="we-sub-title">Líneas</span>
                  <button class="we-add" (click)="addLine()" type="button"><mat-icon>add</mat-icon></button>
                </div>
                @for (line of dlg.lines; track $index) {
                  <div class="we-row">
                    <input [ngModel]="line.text" (ngModelChange)="updateLine($index, $event)"
                           placeholder="Lo que dice el NPC…" />
                    <button class="we-del" (click)="removeLine($index)" type="button"><mat-icon>close</mat-icon></button>
                  </div>
                }

                <div class="we-sub">
                  <span class="we-sub-title">Opciones de respuesta</span>
                  <button class="we-add" (click)="addChoice()" type="button"><mat-icon>add</mat-icon></button>
                </div>
                @for (choice of dlg.choices; track choice.key) {
                  <div class="we-choice">
                    <input [ngModel]="choice.text" (ngModelChange)="updateChoiceText($index, $event)"
                           placeholder="Respuesta del estudiante…" />
                    <select [ngModel]="choice.decisionOptionId"
                            (ngModelChange)="setChoiceDecision($index, $event)">
                      <option [ngValue]="null">— sin destino —</option>
                      @for (dec of store.availableDecisions(); track dec.id) {
                        <option [ngValue]="dec.id">{{ dec.classification }} → {{ dec.targetNodeKey }}: {{ dec.text }}</option>
                      }
                    </select>
                    <button class="we-del" (click)="removeChoice($index)" type="button"><mat-icon>close</mat-icon></button>
                  </div>
                }
              } @else {
                <button class="psy-button psy-button--glass" (click)="addDialogue()" type="button">
                  <mat-icon>chat_bubble_outline</mat-icon>Agregar diálogo
                </button>
              }
            </div>
```

> El `</div>` inicial cierra el `we-form` existente; la sección "Diálogo" queda como hermana dentro del branch del objeto. Verificar el balance de etiquetas tras pegar.

- [ ] **Step 3: Add handler methods**

En la clase `WorldEditorComponent`, tras `deleteSelectedZone()` (~línea 616), añadir:

```typescript
  // ─── Dialogue authoring ───────────────────────────────────────────────
  private commit(tree: WorldDialogueTree): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new UpsertDialogueCommand(obj.key, tree));
  }

  addDialogue(): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    const tree: WorldDialogueTree = {
      id: this.store.nextLocalId(),
      key: `dlg-${obj.key}`,
      speakerName: obj.label,
      portraitKey: null,
      emotion: 'neutral',
      mapObjectId: obj.id ?? null,
      mapObjectKey: obj.key,
      lines: [],
      choices: []
    };
    this.commit(tree);
  }

  removeDialogue(): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new DeleteDialogueCommand(obj.key));
  }

  updateDialogueField(field: 'speakerName' | 'emotion', value: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    this.commit({ ...tree, [field]: value });
  }

  addLine(): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const line: WorldDialogueLine = {
      order: tree.lines.length, speakerName: tree.speakerName, text: '', emotion: tree.emotion
    };
    this.commit({ ...tree, lines: [...tree.lines, line] });
  }

  updateLine(index: number, text: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const lines = tree.lines.map((l, i) => i === index ? { ...l, text } : l);
    this.commit({ ...tree, lines });
  }

  removeLine(index: number): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const lines = tree.lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i }));
    this.commit({ ...tree, lines });
  }

  addChoice(): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choice: WorldDialogueChoice = {
      key: `ch-${Date.now().toString(36)}`, text: '', decisionOptionId: null,
      requiredToolCode: null, effect: {}, displayOrder: tree.choices.length
    };
    this.commit({ ...tree, choices: [...tree.choices, choice] });
  }

  updateChoiceText(index: number, text: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.map((c, i) => i === index ? { ...c, text } : c);
    this.commit({ ...tree, choices });
  }

  setChoiceDecision(index: number, decisionOptionId: number | null): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.map((c, i) => i === index ? { ...c, decisionOptionId } : c);
    this.commit({ ...tree, choices });
  }

  removeChoice(index: number): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.filter((_, i) => i !== index).map((c, i) => ({ ...c, displayOrder: i }));
    this.commit({ ...tree, choices });
  }
```

- [ ] **Step 4: Add minimal styles**

En el array `styles`, antes del cierre `` ` ``, añadir:

```css
    .we-dialogue { display: grid; gap: 8px; padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--psy-border); }
    .we-dialogue-head { display: flex; align-items: center; justify-content: space-between; }
    .we-sub { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
    .we-sub-title { font-weight: 700; color: var(--psy-blue-deep); font-size: .82rem; }
    .we-row, .we-choice { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; }
    .we-choice { grid-template-columns: 1fr 1fr auto; }
    .we-add, .we-del { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--psy-border); border-radius: 8px; background: transparent; cursor: pointer; color: var(--psy-muted); }
    .we-add:hover, .we-del:hover { background: rgba(79,124,172,.08); color: var(--psy-blue-deep); }
    .we-choice select, .we-row input, .we-choice input { padding: 5px 8px; border: 1px solid rgba(79,124,172,.18); border-radius: 8px; background: rgba(255,255,255,.8); font: inherit; font-size: .82rem; }
```

- [ ] **Step 5: Verify build**

Run: `cd admin-panel && npm run build`
Expected: 0 errores de compilación.

- [ ] **Step 6: Commit**

```bash
cd admin-panel && git add src/app/features/simulator/world-editor/world-editor.component.ts
git commit -m "feat(editor): inline dialogue + response-option authoring in inspector

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9 (FE): Marcador de diálogo en el lienzo

**Files:**
- Modify: `admin-panel/src/app/features/simulator/world-editor/world-editor.component.ts` (`renderWorld`)

- [ ] **Step 1: Widen the `renderWorld` state type to include dialogues**

En la firma de `renderWorld(state: {...})` (~línea 658), añadir `dialogues: WorldDialogueTree[]` al tipo inline del parámetro.

- [ ] **Step 2: Draw a chat badge on objects that have a dialogue**

Dentro del bucle `for (const obj of objects) { ... }`, tras añadir la "Label below" (~línea 764) y antes de los listeners de drag, insertar:

```typescript
      if (state.dialogues?.some(d => d.mapObjectKey === obj.key)) {
        group.add(new Konva.Text({
          text: '💬', fontSize: 14, x: 8, y: -24, listening: false
        }));
      }
```

- [ ] **Step 3: Verify build**

Run: `cd admin-panel && npm run build`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
cd admin-panel && git add src/app/features/simulator/world-editor/world-editor.component.ts
git commit -m "feat(editor): canvas badge marking objects that have a dialogue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Verificación end-to-end en vivo

> Decisión pragmática: la prueba de canvas (clic en objetos Konva) es frágil en Playwright, así que la **prueba autoritativa de persistencia** queda cubierta por los tests de integración backend (Tasks 1-3) y los unit del store (Tasks 5-6). Aquí verificamos el recorrido vivo manualmente con la skill `verify`.

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar backend Django**

Run: `cd backend_django && python manage.py runserver 8091`
Expected: server escuchando en `:8091`, `python manage.py check` sin errores.

- [ ] **Step 2: Levantar frontend apuntando a Django**

Run: `cd admin-panel && npm start -- --proxy-config proxy.django.json` (o el proxy que apunte a `:8091`)
Expected: Angular en `:4200`.

- [ ] **Step 3: Autorar (admin)**

Manual: login `admin@psychosim.edu.co` / `Admin123!` → editor del caso → pestaña **Mundo** → (clonar a DRAFT si está publicado) → seleccionar un objeto/persona → **Agregar diálogo** → añadir una línea y una opción de respuesta → en "Lleva a →" elegir una decisión → esperar "Guardado".
Expected: aparece el badge 💬 sobre el objeto; sin errores de consola.

- [ ] **Step 4: Confirmar persistencia**

Manual: recargar el editor.
Expected: el diálogo, la línea y la opción (con su decisión cableada) siguen ahí.

- [ ] **Step 5: Jugar y verificar ramificación (estudiante)**

Manual: login `estudiante@psychosim.edu.co` / `Estudiante123!` → jugar el caso → interactuar con ese NPC → ver las líneas + opciones → elegir la opción cableada.
Expected: el intento avanza al nodo destino de la decisión enlazada (ramifica), confirmando el contrato extremo a extremo.

- [ ] **Step 6: Suite completa sin regresiones**

Run: `cd backend_django && python -m pytest -q` y `cd admin-panel && npm run build && npx jest`
Expected: backend verde; build 0 errores; jest verde.

- [ ] **Step 7: Confirmar que Spring no se tocó**

Run: `cd D:\Sua_Files\IdeaProjects\psicologia_proyecto && git status backend`
Expected: sin cambios en `backend/` (respaldo intacto).

---

## Self-Review (hecho por el autor del plan)

**1. Cobertura del spec:**
- Editar árbol (speaker/portrait/emotion) → Task 8 (handlers + UI). ✓
- Editar líneas → Task 8. ✓
- Editar opciones (texto, herramienta, recomendada/prohibida) → Task 8 cubre texto + cableado; `requiredToolCode`/marcas UI quedan como campos del modelo ya soportados (no se exponen todos los inputs en el MVP; ver nota). ⚠️ Ver "Desviación".
- Cablear opción→decisión → Task 8 (selector) + Task 3 (availableDecisions) + Task 1 (persistencia). ✓
- Persistencia bulk con revision/DRAFT → Tasks 1-2 (reusa optimistic lock existente). ✓
- Crear/eliminar diálogos/líneas/opciones → Tasks 6 + 8 (+ reconciliación Task 2). ✓
- Runtime juega y ramifica → Task 10 (verify). ✓
- Pruebas backend/unit/e2e → Tasks 1-3 (pytest), 5-6 (jest), 10 (verify vivo en lugar de e2e de canvas — desviación justificada). ✓

**Desviación documentada:** el MVP expone en la UI los campos de mayor valor (hablante, emoción, líneas, texto de opción, "lleva a"). `requiredToolCode`, `effect` y las marcas `isRecommended/isProhibited` ya viajan en el modelo y se persisten; sus inputs dedicados pueden añadirse como pulido posterior sin tocar backend. La E2E automatizada de canvas se sustituye por verificación viva (Task 10) por fragilidad; la persistencia queda probada por integración backend + unit del store.

**2. Placeholders:** ninguno; todos los pasos con código/comandos reales.

**3. Consistencia de tipos:** `WorldDialogueTree.mapObjectKey`, `WorldOutgoingDecision`, `EditorState.dialogues`, `buildWorldSaveRequest`, `UpsertDialogueCommand`/`DeleteDialogueCommand`, `selectedDialogue`, `availableDecisions` usados de forma idéntica en store, spec de tests y componente. Líneas usan `order`, choices usan `displayOrder` (coincide con `_world_dialogue_tree`).
