# Game Shell — Design Spec

- **Date:** 2026-05-31
- **Status:** Approved (design); pending spec review → implementation plan
- **Author:** migration/feature work on `feat/django-migration`
- **Repos:** backend `psico_project_v2/backend_django` (Django); frontend `psicologia_proyecto/admin-panel` (Angular 21 + Phaser 3)

## 1. Context & vision

SIEP is a clinical role-play simulator (top-down Phaser world + decision DAG) whose Spring
backend was migrated to Django/DRF (17/17 tasks, contract-identical). Today the student entry
is a **static catalog of cards** and the in-case world feels **inert** (NPCs don't move, no
ambient life, no intro). The goal is to turn SIEP into something that **feels like a real game**.

**Reformulated vision:** Convert SIEP from "catalog + static scene" into a game: an **animated
menu-world** where the player navigates cases with arrows (locked/unlocked, *completing case 1
unlocks case 2*); a **cinematic intro** (appear in front of the clinic → case title card → walk
into the door → the case begins); and, later, a **living, larger world** (people moving, ambient
interactables, more natural/logical interaction) with **longer content**, all supported by an
**extended authoring editor**.

**Key technical truths (scope-saving):**
1. The authoring "engine" already exists (admin editor T14: DAG, nodes, objects, tools, rubrics,
   checklist, **Konva world editor**, **preview**). It is **extended**, not rebuilt.
2. The data model already supports a living world: `map_objects` has `movement_pattern_json`,
   `facing`, `z_index`, `metadata_json`, object types; the frontend already has scenario configs
   and NPC/multi-room hooks — **underused**. "Life" is ~80% frontend animation + content.
3. The only genuinely new backend need is **progression/unlocking** per student.

## 2. Decomposition (multiple subsystems)

- **A · Game Shell** — animated menu-world with arrows + per-student progression/unlock + intro
  cinematic. *(This spec. Most visible; only subsystem needing new backend.)*
- **B · Living world** — NPC movement, ambient interactables, animation/audio, natural interaction.
  *(Mostly frontend + content.)*
- **C · Bigger maps + more logical interaction** — larger/multi-room Tiled maps, tool/dialogue gating.
- **D · More & longer content** — more nodes/decisions/scenes (authoring).
- **E · (cross-cutting) Extend the editor** — make authoring A–D easy without code.

Build order: **A first** (vertical slice that "feels like a game" and forces the progression
backend), then B → C → D, with E extended as needed. Each later sub-project gets its own spec → plan.

## 3. Locked decisions (from brainstorming)

1. **Schema ownership:** Django owns the schema (Spring retired). New data uses **real Django
   migrations** and Django-managed tables; existing `managed=False` tables are left untouched.
2. **Progression:** **linear** sequence; reaching **COMPLETED** on a case unlocks the next;
   tracked **per student**.
3. **Content:** build the shell **scalable to N cases**; show 1 real case + the rest as
   "locked / coming soon". Authoring more cases is a separate sub-project.
4. **Front:** **full Phaser "menu-world"** (appear in front of the clinic, arrows move between case
   "doors" locked/open, walk into a door → case starts).

## 4. Sub-project A — design

### 4.1 Scope

**In:**
- Phaser **menu-world** scene: player avatar in front of the clinic façade; a row of **doors = cases**
  with name/code signs. **←/→ or A/D** move between doors; **walking into an open door (or E)** selects
  it. Locked doors: shut + lock + "Bloqueado". Next playable door highlighted. Completed doors marked
  "Resuelto".
- **Intro cinematic:** on selecting an open door → title card (code + title) → fade → start the case.
- **Progression backend** (Django-owned): per-student completed cases → computed unlock (linear order).
- Menu consumes a **catalog-with-progression** endpoint; existing "resume active attempt" still works.

**Out (later sub-projects):** living world/NPC movement (B); bigger maps + interaction logic (C);
more/longer cases (D); editor extensions (E); tileset art replacement. For now: 1 real case + rest
"coming soon".

### 4.2 Data model + backend

- **New Django-managed table `StudentCaseCompletion`** (first real Django migration):
  - `id` (PK), `student_id` (FK `users`), `simulation_case_id` (FK `simulation_cases`),
    `first_completed_at` (datetime), `created_at`.
  - Unique constraint `(student_id, simulation_case_id)`.
  - `db_constraint=False` on the FKs to existing `managed=False` tables (avoids Django trying to
    manage those tables' constraints) while still storing the integer keys.
  - This is the **source of truth for "solved"**.
- **Completion hook:** in `game_service.choose_decision`, when an attempt transitions to
  **COMPLETED** (terminal node), upsert `StudentCaseCompletion(student, case)`. SAFE_EXITED does
  **not** count. The upsert must never break the gameplay transaction (best-effort, like audit).
- **Ordering (linear):** derived from **published** cases ordered by `simulation_cases.created_at`
  (deterministic). Case at position *i* is **unlocked** iff the student completed position *i-1*;
  position 0 is always unlocked. PROFESOR/ADMIN see all cases unlocked. *(Admin-configurable order
  is a future enhancement — not now.)*
- **New endpoint** `GET /api/simulation/catalog`:
  - Returns the ordered list for the current actor: each item
    `{caseVersionId, code, title, description, order, unlocked, completed, locked}`.
  - Student: locked/unlocked/completed computed from `StudentCaseCompletion` + order.
  - PROFESOR/ADMIN: everything `unlocked: true`.
  - The existing `GET /api/simulation/cases` stays unchanged (no contract break); the new menu uses
    `/catalog`.

### 4.3 Frontend (Phaser menu-world + intro)

- New Angular component `game-menu.component.ts` mounting a Phaser scene `ClinicMenuScene`
  (reuse the bootstrapping/asset patterns from `game-world.component.ts`).
- Scene: lateral clinic façade, avatar, N doors with sign + state (open/highlighted/locked/solved);
  arrow/A-D navigation; selection by walking into the door or pressing E; title-card cinematic →
  `router.navigate(['/portal/simulador', caseVersionId])` (the existing play component, **unchanged**).
- Data: calls `/api/simulation/catalog` → builds doors with locked/unlocked/completed states.
- Art: start with existing Kenney assets + simple shapes for façade/doors/signs; visual polish in B.
- **Routing (explicit):** the menu-world is a **new route `/portal/jugar`**, which becomes the primary
  **student** entry. The existing `/portal/simulador` catalog is kept as an admin/fallback view (no
  redirect removal). This avoids disturbing existing deep links and admin flows.

### 4.4 Integration with existing system

The in-case game (`simulation-play.component`), admin editor, and teacher panels **do not change**.
Additions only: backend model + `/catalog` endpoint + migration + completion hook; frontend menu
component/scene. The existing `/cases`, `/attempts`, world, reflections, reports, audit are untouched.

### 4.5 Testing

- **Backend (TDD, against the real `psychosim` DB, rollback per test):**
  - locked/unlocked/completed computed correctly per student; completing case *i* unlocks *i+1*;
    PROFESOR/ADMIN see all unlocked.
  - completion hook writes `StudentCaseCompletion` only on COMPLETED, and never breaks the
    decision flow.
  - `/catalog` envelope/shape matches the established response contract.
- **Frontend:** Playwright smoke (same harness used during analysis): menu renders doors,
  locked vs open, selecting an open door enters the case. Fine look iterated live in-browser.

### 4.6 Migration / ops notes

- This introduces the **first Django-managed table**. Plan must:
  - create the migration and **apply `migrate` to the real `psychosim` DB** (authorized schema change);
  - ensure the test setup (currently `--reuse-db --nomigrations`, `TEST.NAME=psychosim`) has the
    table available (apply migration once; verify pytest sees it — adjust pytest/migration config if
    `--nomigrations` skips creating the managed table).
- Keep settings env-driven (already done); no new secrets.

### 4.7 Risks / open items (non-blocking)

- **`--nomigrations` vs a managed table:** verify the test runner creates/sees `StudentCaseCompletion`;
  if not, apply the migration to the test DB explicitly or relax `--nomigrations` for managed apps.
- **Cross-repo change:** frontend lives in `psicologia_proyecto/admin-panel` (separate repo); its
  changes are committed there, backend changes in `psico_project_v2`.
- **Order derivation:** `created_at` ordering is deterministic but admin can't reorder yet (future).

## 5. Future sub-projects (brief)

- **B · Living world:** render `movement_pattern_json` (patrolling NPCs), ambient interactables
  (papers/props with flavor), entrance/exit animation, audio; richer dialogue pacing.
- **C · Bigger/multi-room maps + logical interaction:** larger Tiled maps, room transitions per case,
  tool/dialogue gating with visible consequences.
- **D · More & longer content:** additional cases and deeper DAGs (authoring).
- **E · Editor extensions:** UX to author A–D (movement patterns, ambient objects, sequencing) without
  code.
