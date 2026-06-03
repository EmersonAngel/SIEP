# Roadmap — "Simulador de Intervención Psicosocial"

- **Date:** 2026-06-03
- **Status:** Decomposition / sequencing (no implementation). Each sub-project below gets its own brainstorming → spec → plan → build cycle.
- **Source vision:** the "PROMPT MAESTRO DE DISEÑO" (Undertale/Pokémon-style clinical RPG). This roadmap maps that vision onto the current codebase and breaks it into independently-shippable pieces.
- **Repos:** frontend `psicologia_proyecto/admin-panel` (Angular 21 + Phaser 3) — most work; backend `psico_project_v2/backend_django` only where stats/authoring are touched.
- **Existing sub-project lineage:** A (Game Shell) · B (Living World — B1 done) · C (multi-room maps) · D (new cases) · E (editor). This roadmap adds **F–I** and two cross-cutting tracks.

## 1. Vision in one paragraph

A 2D top-down clinical RPG where conflict is resolved through empathy, ethics and verbal tactics — never combat. It subverts RPG grammar (Fight → diagnose, Flee → ethically abandon, damage → harm to rapport/mental health). Two modes: a Pokémon-style **Overworld** (explore, collect "clues", line-of-sight triggers) and an Undertale-style **Intervention** (real-time "Caja de Tensión Verbal" with blue/orange projectile logic, a 4-command menu, expressive symptom-text and dynamic portraits). Hidden bars — Confianza, Reactividad, SIC — branch toward multiple endings (pacifist recovery … tragic/fatal).

## 2. What already exists (the foundation we build on)

| Vision pillar | Already in the code |
|---|---|
| Top-down overworld, pixel-art, movement, interactables, NPCs | `game-world.component.ts` (`DataDrivenWorldScene`), Kenney art, B1 guide NPC + ambient life |
| Dialogue + branching + consequences | `DialoguePanelComponent`, decisions classified `ADEQUATE/RISKY/INADEQUATE` + `prohibitedConduct`, backend scoring |
| Hidden stat bars | `patientState` = `trustLevel` (≈ **Confianza**), `crisisLevel` (≈ **Reactividad**), `emotionalState`/`openness`; metrics `userTrust`/`victimRisk`/`professionalScore`/`stressIndex` (≈ **SIC** inputs) |
| Multiple endings | `OutcomeTier` (`excelente`/`adecuado`/`riesgo`/`crisis_no_manejada`) with narratives (`computeOutcome`) |
| ACT-like actions / Mercy | clinical tools (PAP, SPIKES, RISK_METER…); safe-exit |
| Portraits (basic) | dialogue `portraitKey` + `emotion` (static) |
| HUD for stats | reorganized two-tier HUD (vitals incl. C/B bars) |

**Implication:** the consequence model and the two-mode skeleton already exist. The vision's leap is (a) turning the **menu** intervention into a **real-time** one, (b) making **text + portraits expressive**, and (c) adding **overworld depth** (clues, line-of-sight).

## 3. Cross-cutting decisions to resolve BEFORE the keystone (I)

These are product decisions, not code. They gate the riskiest sub-project.

- **D1 — Tone vs. subversion.** Rendering a patient's catharsis as "projectiles" and `DIAGNOSTICAR = Fight` is powerful but risks trivializing real suffering in a *formative clinical* tool that today is deliberately serious (no-correct-answer-reveal guardrail, safe-exit, reduced-motion). Decide: full Undertale subversion vs. a softened clinical reframe (e.g., projectiles = intrusive pressure/distortions, framed respectfully) vs. hybrid.
- **D2 — Accessibility of a bullet-hell.** Real-time dodging conflicts with `prefers-reduced-motion` and motor accessibility. A non-real-time fallback (turn/menu mode = today's system) is almost certainly required, not optional. Decide the fallback contract up front.
- **D3 — Authoring.** New mechanics (projectile scripts, symptom-text, clue graphs) need data + an editor story (sub-project E). Decide whether early slices hardcode content (frontend config, like B1's guide) or wait for authoring.

## 4. Sub-project catalog

### F — Expressive Dialogue  *(recommended first; low risk, high distinctiveness)*
- **Adds:** §4 of the prompt — **text-as-symptom modulation** (speed/spacing/color/glitch driven by emotion: pánico = hiperacelerado, depresión = lento/gris, brote = palabras rojas temblando), **dynamic portraits with microexpressions**, **assertive-interruption QTE** (timed window to interrupt hostile auto-advancing text).
- **Builds on:** `DialoguePanelComponent` (+ `emotion`/`portraitKey` already in the dialogue model).
- **Depends on:** nothing. Purely enhances existing dialogue.
- **Effort/Risk:** Low–Medium / Low. No new core loop. Portraits may need art (or a procedural microexpression layer over existing sprites).
- **Why valuable:** validates the "text as clinical signal" pillar immediately, on-brand, reusable by every later mode.
- *Natural sub-slices:* F1 text-symptom modulators · F2 dynamic portraits · F3 interruption QTE.

### G — Social Mapping (Clue Inventory)
- **Adds:** §3.A — collect **Conceptos/Contradicciones/Antecedentes** in the overworld; connect them in a menu to unlock diagnostic questions.
- **Builds on:** overworld interactions + the existing inventory/journal surfaces.
- **Depends on:** light coupling to F (unlocked questions surface in dialogue) — usable standalone.
- **Effort/Risk:** Medium / Low–Medium. New data model (clue graph) + UI.

### H — Overworld Depth  *(merges with sub-project C)*
- **Adds:** §3.A — **line-of-sight NPC triggers** (Pokémon-trainer vision forcing confrontations), **spatial puzzles** (organize a room, find a hidden witness).
- **Builds on:** `DataDrivenWorldScene` movement/collision + scenario configs.
- **Depends on:** nothing hard; pairs well with bigger maps (C).
- **Effort/Risk:** Medium / Medium (pathfinding/vision cones, scripted events).

### I — Verbal Tension Box  *(the keystone; highest effort + risk)*
- **Adds:** §3.B + §4 — real-time intervention: **soul/heart** in a box, **blue (stay still / active listening)** vs **orange (move / assertive confrontation)** projectile logic, the **4-command menu** (DIAGNOSTICAR rhythm minigame, ACTUAR, HISTORIAL using G's clues, PERDONAR/Mercy).
- **Builds on / replaces:** the current menu-based intervention; reuses tools (ACTUAR), clues (HISTORIAL), consequence model.
- **Depends on:** **D1 + D2 resolved**; benefits from F (expressive text during attacks) and G (Historial). 
- **Effort/Risk:** High / High — a new real-time Phaser subsystem, tuning, accessibility fallback, tonal care.
- *Natural sub-slices:* I0 thin prototype (box + soul + one blue + one orange pattern + one ACT, isolated) to de-risk · I1 full patterns/colors/rhythm/QTE · I2 integration replacing the menu intervention (+ fallback mode per D2).

### Cross-cutting tracks (not standalone milestones)
- **CE — Consequence Engine v2:** consolidate Confianza/Reactividad/SIC + permanent route-closing + good/bad/tragic endings. **Largely exists** (`patientState`, `OutcomeTier`, decision classes) → extend, don't rebuild. Touched by F/G/I.
- **AU — Authoring (extends D + E):** author cases in the prompt's §6 structure (case, actors, map triggers, combat script, decision tree). Comes after the mechanics they author exist.

## 5. Dependency graph

```
F (Expressive Dialogue) ─┐
                         ├─► I (Verbal Tension Box) ──► I integration + fallback
G (Social Mapping) ──────┘        ▲
                                  │ requires D1 (tone) + D2 (a11y) decided
H (Overworld Depth) ── independent (pairs with C)
CE (Consequence Engine v2) ── cross-cuts F, G, I
AU (Authoring) ── after F/G/H/I land (extends D/E)
```

## 6. Recommended sequencing

1. **F1 — Text-as-symptom modulation** *(first slice — see §7).*
2. **F2/F3** — dynamic portraits + interruption QTE.
3. **G** — Social Mapping (clue inventory) — feeds HISTORIAL.
4. **H** — Overworld depth (line-of-sight + puzzles), folded into C.
5. **Resolve D1 + D2**, then **I0** — Verbal Tension Box *prototype* (de-risk the headline mechanic in isolation).
6. **I1 → I2** — full box, then integrate/replace the menu intervention with a non-real-time fallback.
7. **CE** consolidation alongside; **AU** authoring last.

Rationale: ship visible, on-brand, low-risk wins first (F), build the pieces I depends on (G, expressive text), defer the expensive/risky keystone (I) until its tone+a11y decisions are made and its dependencies exist.

## 7. Recommended FIRST slice

**F1 — Text-as-symptom modulators in the dialogue panel.** Cheapest distinctive piece, no new art, no new core loop, immediately elevates the existing dialogue, and directly expresses a clinical pillar (text behavior = psychopathological state). It becomes the brainstorming → spec → plan → build target, exactly like B1 and the HUD.

*Alternative if you'd rather validate the headline early:* **I0**, a throwaway Verbal-Tension-Box prototype — higher risk, but answers "is the core combat fun/appropriate?" sooner. (Still needs D1/D2 first.)

## 8. How we proceed (per slice)

Each slice runs the same loop we used for B1 and the HUD: **brainstorming** (intent + design + spec) → **writing-plans** → **executing-plans** (TDD where testable; build + live screenshots for Phaser) → **verify** live → **finishing-a-development-branch**. One slice at a time, each on its own branch off `feat/game-shell`.

## 9. Open items
- D1 (tone), D2 (accessibility fallback), D3 (authoring timing) — resolve at latest before I.
- Confirm art pipeline for F2 portraits (existing Kenney faces vs. new pixel portraits with microexpression frames).
- Decide whether H is a fresh sub-project or merged into C (bigger maps).
