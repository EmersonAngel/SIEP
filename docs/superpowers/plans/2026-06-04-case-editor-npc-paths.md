# Editor de casos — Fase 2: Paths de NPC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or subagent-driven-development). Steps use `- [ ]`.

**Goal:** Herramienta visual en el editor Konva para autorar `object.movementPattern` (idle/wander/patrol con dibujo de waypoints); el runtime y el backend ya lo reproducen/persisten.

**Architecture:** Helpers puros (`path-edit.util.ts`) construyen el nuevo `movementPattern`; se reutiliza `UpdateInspectorCommand` (undo/redo); sección "Movimiento" en el inspector + polilínea/handles arrastrables en el lienzo + `pathEditMode` para clic-agrega-waypoint. Sin cambios de backend ni runtime.

**Tech Stack:** Angular 21 + Konva + Signals + Jest. Repo `psicologia_proyecto/admin-panel`. Rama `feat/case-editor-npc-paths` sobre `feat/case-editor-dialogues`.

**Spec:** `docs/superpowers/specs/2026-06-04-case-editor-npc-paths-design.md`

---

## File Structure
- **Create:** `admin-panel/src/app/features/simulator/world-editor/path-edit.util.ts` (+ `.spec.ts`).
- **Modify:** `world-editor.store.ts` (signal `pathEditMode`), `world-editor.component.ts` (sección "Movimiento" + handlers + render de ruta + clic-agrega-waypoint).

Comandos: `cd admin-panel && npx jest <spec>` · `npm run build`.

---

## Task 1: Helpers puros `path-edit.util.ts` (TDD)

**Files:** Create `world-editor/path-edit.util.ts` + `world-editor/path-edit.util.spec.ts`.

- [ ] **Step 1: Failing test** — `path-edit.util.spec.ts`:

```typescript
import {
  patrolPoints, setPatternType, setWanderRadius,
  withPatrolPoint, movePatrolPoint, removePatrolPoint, reorderPatrolPoint,
} from './path-edit.util';

describe('path-edit.util', () => {
  it('patrolPoints reads safely from malformed patterns', () => {
    expect(patrolPoints(null)).toEqual([]);
    expect(patrolPoints({ type: 'idle' })).toEqual([]);
    expect(patrolPoints({ type: 'patrol', points: [[1, 2], [3, 4]] })).toEqual([[1, 2], [3, 4]]);
    expect(patrolPoints({ type: 'patrol', points: 'bad' })).toEqual([]);
  });

  it('setPatternType seeds sensible defaults and preserves data', () => {
    expect(setPatternType({}, 'idle')).toEqual({ type: 'idle' });
    expect(setPatternType({}, 'wander')).toEqual({ type: 'wander', radius: 28 });
    expect(setPatternType({ type: 'wander', radius: 50 }, 'wander')).toEqual({ type: 'wander', radius: 50 });
    expect(setPatternType({ type: 'patrol', points: [[1, 1]] }, 'patrol')).toEqual({ type: 'patrol', points: [[1, 1]] });
    expect(setPatternType({}, 'patrol')).toEqual({ type: 'patrol', points: [] });
  });

  it('setWanderRadius clamps to a positive number', () => {
    expect(setWanderRadius({ type: 'wander', radius: 10 }, 64)).toEqual({ type: 'wander', radius: 64 });
    expect(setWanderRadius({ type: 'wander', radius: 10 }, 0)).toEqual({ type: 'wander', radius: 1 });
  });

  it('withPatrolPoint appends and forces patrol', () => {
    expect(withPatrolPoint({ type: 'idle' }, 5, 6)).toEqual({ type: 'patrol', points: [[5, 6]] });
    expect(withPatrolPoint({ type: 'patrol', points: [[1, 1]] }, 2, 2)).toEqual({ type: 'patrol', points: [[1, 1], [2, 2]] });
  });

  it('move / remove / reorder patrol points', () => {
    const p = { type: 'patrol', points: [[0, 0], [1, 1], [2, 2]] };
    expect(movePatrolPoint(p, 1, 9, 9)).toEqual({ type: 'patrol', points: [[0, 0], [9, 9], [2, 2]] });
    expect(removePatrolPoint(p, 0)).toEqual({ type: 'patrol', points: [[1, 1], [2, 2]] });
    expect(reorderPatrolPoint(p, 0, 1)).toEqual({ type: 'patrol', points: [[1, 1], [0, 0], [2, 2]] });
    expect(reorderPatrolPoint(p, 0, -1)).toEqual(p); // no-op out of range
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx jest src/app/features/simulator/world-editor/path-edit.util.spec.ts` (module missing).

- [ ] **Step 3: Implement** — `path-edit.util.ts`:

```typescript
/** Pure, framework-free editors for an object's movementPattern Record.
 *  Shapes match scene-motion.util.MovementPattern: idle | wander{radius} | patrol{points}. */
export type Pattern = Record<string, unknown>;
export type Point = [number, number];

export function patrolPoints(pattern: Pattern | null | undefined): Point[] {
  const pts = (pattern as { points?: unknown })?.points;
  if (!Array.isArray(pts)) return [];
  return pts.filter(
    (p): p is Point => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number'),
  );
}

export function wanderRadius(pattern: Pattern | null | undefined): number {
  const r = Number((pattern as { radius?: unknown })?.radius);
  return Number.isFinite(r) && r > 0 ? r : 28;
}

export function setPatternType(pattern: Pattern, type: 'idle' | 'wander' | 'patrol'): Pattern {
  if (type === 'idle') return { type: 'idle' };
  if (type === 'wander') return { type: 'wander', radius: wanderRadius(pattern) };
  return { type: 'patrol', points: patrolPoints(pattern) };
}

export function setWanderRadius(pattern: Pattern, radius: number): Pattern {
  const r = Number.isFinite(radius) && radius >= 1 ? Math.round(radius) : 1;
  return { type: 'wander', radius: r };
}

export function withPatrolPoint(pattern: Pattern, x: number, y: number): Pattern {
  return { type: 'patrol', points: [...patrolPoints(pattern), [x, y]] };
}

export function movePatrolPoint(pattern: Pattern, idx: number, x: number, y: number): Pattern {
  const points = patrolPoints(pattern).map((p, i): Point => (i === idx ? [x, y] : p));
  return { type: 'patrol', points };
}

export function removePatrolPoint(pattern: Pattern, idx: number): Pattern {
  return { type: 'patrol', points: patrolPoints(pattern).filter((_, i) => i !== idx) };
}

export function reorderPatrolPoint(pattern: Pattern, idx: number, dir: 1 | -1): Pattern {
  const points = patrolPoints(pattern);
  const j = idx + dir;
  if (idx < 0 || idx >= points.length || j < 0 || j >= points.length) return pattern;
  const next = [...points];
  [next[idx], next[j]] = [next[j], next[idx]];
  return { type: 'patrol', points: next };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** (`feat(editor): pure path-edit helpers for movementPattern authoring`).

---

## Task 2: Store `pathEditMode`

**Files:** Modify `world-editor.store.ts`.

- [ ] **Step 1:** Add after `zoom`/`panOffset` signals:

```typescript
  readonly pathEditMode = signal(false);
```

- [ ] **Step 2:** Build check + commit (`feat(editor): pathEditMode signal`).

---

## Task 3: Inspector "Movimiento" section + handlers

**Files:** Modify `world-editor.component.ts`.

- [ ] **Step 1:** Import helpers:

```typescript
import { patrolPoints, wanderRadius, setPatternType, setWanderRadius,
  withPatrolPoint, movePatrolPoint, removePatrolPoint, reorderPatrolPoint } from './path-edit.util';
```

- [ ] **Step 2:** Add the "Movimiento" block in the inspector object branch (after the `.we-dialogue` div):

```html
            <!-- ── Movimiento del NPC ──────────────────────────────── -->
            <div class="we-movement">
              <h4>Movimiento</h4>
              <label><span>Tipo</span>
                <select [ngModel]="movementType(obj)" (ngModelChange)="setMovement(obj.key, $event)">
                  <option value="idle">Quieto</option>
                  <option value="wander">Deambular</option>
                  <option value="patrol">Ruta (patrol)</option>
                </select>
              </label>
              @if (movementType(obj) === 'wander') {
                <label><span>Radio</span>
                  <input type="number" min="1" [ngModel]="wanderRadiusOf(obj)"
                         (ngModelChange)="setRadius(obj.key, $event)" />
                </label>
              }
              @if (movementType(obj) === 'patrol') {
                <button class="psy-button psy-button--glass" (click)="store.pathEditMode.set(!store.pathEditMode())" type="button">
                  <mat-icon>{{ store.pathEditMode() ? 'check' : 'timeline' }}</mat-icon>
                  {{ store.pathEditMode() ? 'Listo' : 'Dibujar ruta' }}
                </button>
                <p class="we-hint">{{ store.pathEditMode() ? 'Clic en el lienzo para agregar waypoints.' : 'Activa para dibujar; arrastra los puntos para moverlos.' }}</p>
                @for (pt of patrolPointsOf(obj); track $index) {
                  <div class="we-row">
                    <span class="we-wp-idx">{{ $index + 1 }}</span>
                    <span class="we-wp-xy">{{ pt[0] }}, {{ pt[1] }}</span>
                    <button class="we-del" (click)="moveWaypointOrder(obj.key, $index, -1)" type="button"><mat-icon>arrow_upward</mat-icon></button>
                    <button class="we-del" (click)="moveWaypointOrder(obj.key, $index, 1)" type="button"><mat-icon>arrow_downward</mat-icon></button>
                    <button class="we-del" (click)="deleteWaypoint(obj.key, $index)" type="button"><mat-icon>close</mat-icon></button>
                  </div>
                }
              }
            </div>
```

- [ ] **Step 3:** Add handlers (after the dialogue handlers):

```typescript
  // ─── Movement authoring ───────────────────────────────────────────────
  movementType(obj: WorldObject): string {
    const t = (obj.movementPattern as { type?: string } | undefined)?.type;
    return t === 'wander' || t === 'patrol' ? t : 'idle';
  }
  wanderRadiusOf(obj: WorldObject): number { return wanderRadius(obj.movementPattern); }
  patrolPointsOf(obj: WorldObject): Array<[number, number]> { return patrolPoints(obj.movementPattern); }

  private setPattern(key: string, pattern: Record<string, unknown>): void {
    this.store.execute(new UpdateInspectorCommand(key, { movementPattern: pattern }));
  }
  setMovement(key: string, type: 'idle' | 'wander' | 'patrol'): void {
    const obj = this.store.selectedObject(); if (!obj) return;
    this.setPattern(key, setPatternType(obj.movementPattern, type));
    if (type !== 'patrol') this.store.pathEditMode.set(false);
  }
  setRadius(key: string, radius: number): void {
    const obj = this.store.selectedObject(); if (!obj) return;
    this.setPattern(key, setWanderRadius(obj.movementPattern, Number(radius)));
  }
  deleteWaypoint(key: string, idx: number): void {
    const obj = this.store.selectedObject(); if (!obj) return;
    this.setPattern(key, removePatrolPoint(obj.movementPattern, idx));
  }
  moveWaypointOrder(key: string, idx: number, dir: 1 | -1): void {
    const obj = this.store.selectedObject(); if (!obj) return;
    this.setPattern(key, reorderPatrolPoint(obj.movementPattern, idx, dir));
  }
```

- [ ] **Step 4:** Styles for `.we-movement` / `.we-wp-idx` / `.we-wp-xy` (mirror `.we-dialogue`); deactivate `pathEditMode` on destroy/select change is optional.

- [ ] **Step 5:** `npm run build` green; commit (`feat(editor): Movimiento section (type/radius/waypoint list) in inspector`).

---

## Task 4: Canvas — polyline, draggable handles, click-to-add

**Files:** Modify `world-editor.component.ts` (`renderWorld`, `onStageClick`).

- [ ] **Step 1:** In `onStageClick`, before the `place-object` block, add waypoint-on-click when in path mode:

```typescript
    if (this.store.pathEditMode()) {
      const sel = this.store.selectedObject();
      if (sel && this.movementType(sel) === 'patrol') {
        const x = this.snapToGrid(pos.x), y = this.snapToGrid(pos.y);
        this.setPattern(sel.key, withPatrolPoint(sel.movementPattern, x, y));
        return;
      }
    }
```

- [ ] **Step 2:** In `renderWorld`, after objects, draw the selected object's pattern overlay on `uiLayer`:

```typescript
    const sel = this.store.selectedObject();
    if (sel) {
      const t = (sel.movementPattern as { type?: string } | undefined)?.type;
      if (t === 'wander') {
        this.uiLayer!.add(new Konva.Circle({
          x: sel.x, y: sel.y, radius: wanderRadius(sel.movementPattern),
          stroke: '#7a6f9e', dash: [6, 4], strokeWidth: 1, listening: false,
        }));
      } else if (t === 'patrol') {
        const pts = patrolPoints(sel.movementPattern);
        const flat: number[] = [sel.x, sel.y];
        for (const [px, py] of pts) flat.push(px, py);
        this.uiLayer!.add(new Konva.Line({ points: flat, stroke: '#7a6f9e', strokeWidth: 2, dash: [4, 4], listening: false }));
        pts.forEach(([px, py], i) => {
          const h = new Konva.Group({ x: px, y: py, draggable: true });
          h.add(new Konva.Circle({ radius: 9, fill: '#7a6f9e', stroke: '#fff', strokeWidth: 2 }));
          h.add(new Konva.Text({ text: String(i + 1), fontSize: 9, fontStyle: 'bold', fill: '#fff', x: -9, y: -4, width: 18, align: 'center', listening: false }));
          h.on('dragend', () => {
            const nx = this.snapToGrid(h.x()), ny = this.snapToGrid(h.y());
            this.setPattern(sel.key, movePatrolPoint(sel.movementPattern, i, nx, ny));
          });
          this.uiLayer!.add(h);
        });
      }
    }
    this.uiLayer!.draw();
```

- [ ] **Step 3:** `npm run build` green.
- [ ] **Step 4:** Commit (`feat(editor): canvas patrol polyline + draggable waypoints + click-to-add`).

---

## Task 5: Verify

- [ ] **Step 1:** `npx jest src/app/features/simulator/world-editor/` → all green (path-edit + Fase 1 store spec).
- [ ] **Step 2:** `npm run build` → 0 errors.
- [ ] **Step 3:** Browser smoke (Django :8091 + Angular :4200 running): admin → editor → Mundo → pick node → select a PERSON → Movimiento=patrol → Dibujar ruta → click 3 points on canvas → screenshot; then "Vista previa" → confirm NPC walks the route.

---

## Self-Review
- **Cobertura del spec:** tipo idle/wander/patrol (Task 3), dibujar/mover/borrar/reordenar waypoints (Tasks 3+4), persistencia (UpdateInspectorCommand → save existente), preview (Vista previa), tests (Task 1 jest + Task 5). ✓
- **Placeholders:** ninguno (código completo en helpers, handlers, render). ✓
- **Consistencia de tipos:** `patrolPoints`/`movePatrolPoint`/etc. firmas idénticas en util, spec, componente; `movementPattern` como `Record<string,unknown>`; reutiliza `UpdateInspectorCommand`. ✓
