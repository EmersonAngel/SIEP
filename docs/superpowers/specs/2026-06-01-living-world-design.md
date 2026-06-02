# Living World (Sub-project B1) — Design Spec

- **Date:** 2026-06-01
- **Status:** Approved (design); pending spec review → implementation plan
- **Builds on:** Sub-project A (Game Shell). Branch base: `feat/game-shell` in both repos.
- **Repos:** backend `psico_project_v2/backend_django` (Django); frontend `psicologia_proyecto/admin-panel` (Angular 21 + Phaser 3).

## 1. Context

After Sub-project A (animated menu-world + progression), the in-case world still feels inert: NPCs
stand still, props don't react, and the menu screen has the shell sidebar overlapping the Phaser
canvas. The student world endpoint exposes no movement data (the `MapObjectState` DTO was ported 1:1
from Spring, which carried none), so "life" is ~90% a frontend concern, with one small backend
passthrough to enable *authored* motion later.

This is **B1**, the first slice of the larger "living world" sub-project (B). It makes the existing
playable case (SIM-VBG-001) feel alive and polishes the menu.

## 2. Decisions locked (from brainstorming)

1. **Movement source = hybrid:** the frontend gives objects tasteful *default* ambient life now; the
   backend additionally *passes through* per-object `movementPattern`/`facing`/`metadata` so authored
   patterns can override the default later (authoring itself is deferred to the editor sub-project).
2. **B1 scope = in-case living world + menu polish** (both).
3. **Guide NPC:** a designated NPC per scene that **says what to do** (diegetic process hint) **and
   moves next to the next thing to do** (walks to a configured target object). Hard guardrail: it
   orients the *process* and the *where*, and NEVER reveals which clinical decision option is correct
   (that would break formative assessment). Hint text reuses the existing per-node objective copy.

## 3. Design

### 3.1 Backend — movement passthrough (small, Django-owned)

Extend the student world object DTO `_to_map_object` in
`backend_django/apps/simulation/services/world_service.py` (`MapObjectState`) with three additive
fields, read from columns that already exist on `map_objects`:
- `movementPattern` → `json.loads(movement_pattern_json)` (dict; `{}` when blank/invalid — reuse the
  module's `_read_map` helper).
- `facing` → `o.facing` (string).
- `metadata` → `json.loads(metadata_json)` (dict; via `_read_map`).

Additive only — existing consumers ignore unknown fields; no other route or DTO changes. Update the
T15 world test (`apps/simulation/tests/test_world.py`) to assert the three new keys are present on
each object in the world payload.

### 3.2 Frontend — in-case living world (`game-world.component.ts` / `DataDrivenWorldScene`)

- **Ambient NPC motion:** objects of type `PERSON` (and similar non-interactive actors) get a default
  behavior — a subtle idle bob plus a slow bounded wander around their spawn point, collision-aware
  (reuse the scene's existing `wouldCollide`). If an object's `movementPattern` is non-empty, it
  overrides the default. Supported pattern shapes (documented, minimal): `{"type":"idle"}`,
  `{"type":"wander","radius":N}`, `{"type":"patrol","points":[[x,y],...]}`. `facing` sets initial
  sprite orientation.
- **Interactable juice:** interactive objects get a gentle float/soft glow pulse so they read as
  alive (in addition to the existing proximity marker).
- **Ambient touch:** one tasteful scene-level effect (e.g., faint dust/light tween). Keep it subtle
  and clinical.
- **Accessibility:** all motion respects `prefers-reduced-motion` (the scene already receives a
  `reduceMotion` flag) — when reduced, no ambient/wander animation; static positions.
- **Isolation:** the per-object behavior lives in a single focused method (e.g.
  `applyAmbientLife(marker, object)`), readable and independent of the rest of the scene.

### 3.3 Frontend — guide NPC (the "leads you" mechanic)

- **Config:** a new frontend config `scene-guide.config.ts` (sibling of `scene-objectives.config`)
  mapping `nodeKey → { guideKey, targetKey, hint }`:
  - `guideKey`: the `object_key` of the world object that acts as guide on that node (an existing
    PERSON object, e.g. the nurse/colleague).
  - `targetKey`: the `object_key` of the interaction the guide should lead the player toward (the
    process-appropriate next point — NOT a decision option).
  - `hint`: short process guidance (reuses/extends the node's objective copy).
  - B1 seeds entries for SIM-VBG-001's nodes so the guide works in the playable case. Nodes without
    an entry simply have no guide behavior (the NPC does normal ambient life).
- **Behavior:** on scene load and after each decision (the world reloads per node), the guide NPC
  **walks to a free position next to the `targetKey` object** (diegetic wayfinding) and surfaces the
  `hint` when the player approaches/interacts (a speech bubble / the existing dialogue surface). The
  guide never states which decision option to choose.
- **Frontend-only:** uses the object positions already in the `/world` payload + the config; reuses
  the B1 movement system. With reduced motion, the guide does not walk — it shows the hint statically.

### 3.4 Frontend — menu polish (`game-menu.component.ts` + `shell.component.ts`)

- **Fix sidebar overlap:** the menu is a full-screen game surface like the in-case game. The shell
  already hides its chrome for `/portal/simulador/:id` via `isGameRoute(url)` (a regex in
  `shared/layout/shell.component.ts`). Extend `isGameRoute` to also match `/portal/jugar`, so the menu
  renders full-bleed without the sidebar/header overlapping the canvas. Update
  `shell.component.spec.ts` accordingly.
- **Better art (Phaser primitives, no new assets):** layered clinic façade (building + sign + mat),
  doors that read as doors (frame + handle + lock icon when locked + glow when available), a slightly
  nicer player avatar.
- **Smoother intro:** polish the existing "Entrando al caso" title-card transition (fade + a
  door-opening feel).

### 3.5 Integration

No change to game mechanics, decisions, reports, editor, or auth. Changes are: additive world DTO
fields + the new `metadata`/`movementPattern`/`facing` passthrough (backend); Phaser
animation/art/guide + the `isGameRoute` extension (frontend). The frontend `MapObjectState` model
(`core/models/simulation.model.ts`) gains the three optional fields for typing.

## 4. Testing

- **Backend (pytest, real DB):** extend `test_world.py` to assert `movementPattern`, `facing`, and
  `metadata` are present on world objects (and that `movementPattern`/`metadata` are objects).
- **Frontend:** Playwright smoke — the in-case world still loads (canvas + `app-simulation-hud`); the
  `/portal/jugar` menu renders the canvas with NO shell sidebar overlapping (assert the shell nav is
  absent/hidden on that route); doors render. The fine feel (wander cadence, glow, guide pathing) is
  iterated live in-browser with screenshots.

## 5. Out of scope (later sub-projects)

- Authoring movement patterns / guide targets in the editor UI (sub-project **E**).
- New cases / longer content (sub-project **D**).
- Bigger / multi-room maps (sub-project **C**).
- New audio assets / full soundscape (B1 reuses the existing `AudioService` cues only; no new assets).
- Recording "help used" for instructor traceability (a possible later enhancement to the guide).

## 6. Risks / open items

- **Wander vs collisions/other objects:** default wander must stay within bounds and not overlap walls
  or other markers; keep radius small and reuse `wouldCollide`. If pathing looks bad, fall back to
  idle-bob only.
- **Guide pathing to `targetKey`:** if the target object is unreachable/occluded, the guide stops at
  the nearest free tile and still shows the hint (no hard pathfinding in B1 — straight-line move with
  collision slide, consistent with the existing player movement).
- **`isGameRoute` change** affects the shell layout for `/portal/jugar`; verify other nav/back paths
  still work (the menu already has its own entry/exit via router).
- Guide config currently lives in frontend code for SIM-VBG-001; moving it to authorable data is E.
