# Pantalla de resultados ("¡Simulación completada!") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Rediseñar el fin de partida del simulador a una tarjeta liquid-glass morada fiel al mockup §24 (métricas, decisiones, competencias, retroalimentación, avatar) con datos reales del `completionReport`, sin backend.

**Architecture:** Util pura (`outcome.util.ts`, TDD) para desempeño/% adecuación; rediseño del bloque `end-state-overlay` en `simulation-play.component.ts` (template + estilos) reusando `AvatarFigureComponent`+`AvatarStore`; input `portrait` en `AvatarFigureComponent`.

**Tech Stack:** Angular 21, TypeScript, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-game-outcome-screen-design.md`

**Verificación:** util por unidad; pantalla por `ng build` + smoke.

---

### Task 1: `outcome.util.ts` (TDD)

**Files:** Create `frontend/src/app/features/simulator/outcome.util.ts` + `.spec.ts`

- [ ] **Step 1: Test que falla** — `outcome.util.spec.ts`:

```ts
import { decisionTotal, adequacyPercent, performanceLabel } from './outcome.util';

const base = { adequateDecisions: 0, riskyDecisions: 0, inadequateDecisions: 0, prohibitedDecisions: 0 };

describe('outcome.util', () => {
  it('decisionTotal sums the three decision kinds', () => {
    expect(decisionTotal({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 1 })).toBe(4);
  });

  it('adequacyPercent', () => {
    expect(adequacyPercent({ ...base, adequateDecisions: 4 })).toBe(100);
    expect(adequacyPercent({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 1 })).toBe(50);
    expect(adequacyPercent(base)).toBe(0);
  });

  it('performanceLabel by adequacy ratio', () => {
    expect(performanceLabel({ ...base, adequateDecisions: 5 })).toBe('Excelente');
    expect(performanceLabel({ ...base, adequateDecisions: 3, riskyDecisions: 1, inadequateDecisions: 1 })).toBe('Adecuado');
    expect(performanceLabel({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 2 })).toBe('En desarrollo');
    expect(performanceLabel({ ...base, adequateDecisions: 1, riskyDecisions: 2, inadequateDecisions: 3 })).toBe('Requiere refuerzo');
    expect(performanceLabel(base)).toBe('Sin decisiones');
  });

  it('prohibited decisions drop performance one step', () => {
    expect(performanceLabel({ ...base, adequateDecisions: 5, prohibitedDecisions: 1 })).toBe('Adecuado');
  });
});
```

- [ ] **Step 2: Run → fails** `cd frontend && npx jest outcome.util.spec -i`.

- [ ] **Step 3: Implementación** — `outcome.util.ts`:

```ts
export type Performance = 'Excelente' | 'Adecuado' | 'En desarrollo' | 'Requiere refuerzo' | 'Sin decisiones';

interface DecisionCounts {
  adequateDecisions: number;
  riskyDecisions: number;
  inadequateDecisions: number;
  prohibitedDecisions?: number;
}

export function decisionTotal(r: DecisionCounts): number {
  return r.adequateDecisions + r.riskyDecisions + r.inadequateDecisions;
}

export function adequacyPercent(r: DecisionCounts): number {
  const total = decisionTotal(r);
  return total === 0 ? 0 : Math.round((r.adequateDecisions / total) * 100);
}

const TIERS: Performance[] = ['Requiere refuerzo', 'En desarrollo', 'Adecuado', 'Excelente'];

export function performanceLabel(r: DecisionCounts): Performance {
  const total = decisionTotal(r);
  if (total === 0) return 'Sin decisiones';
  const pct = r.adequateDecisions / total;
  let tier = pct >= 0.8 ? 3 : pct >= 0.6 ? 2 : pct >= 0.4 ? 1 : 0;
  if ((r.prohibitedDecisions ?? 0) > 0) tier = Math.max(0, tier - 1);
  return TIERS[tier];
}
```

- [ ] **Step 4: Run → passes**, **commit**:

```bash
git add frontend/src/app/features/simulator/outcome.util.ts frontend/src/app/features/simulator/outcome.util.spec.ts
git commit -m "feat(game): pure outcome util (decision totals, adequacy %, performance label)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: input `portrait` en `AvatarFigureComponent`

**Files:** Modify `frontend/src/app/features/character/avatar-figure.component.ts`

- [ ] **Step 1:** Añadir `readonly portrait = input(false);` y cambiar el `viewBox` del `<svg>` a binding: `[attr.viewBox]="portrait() ? '22 26 76 76' : '0 0 120 175'"`. Reemplaza el `[attr.viewBox]="'0 0 120 175'"` actual.

- [ ] **Step 2: Build** `cd frontend && npm run build` → OK.

- [ ] **Step 3: Commit** `feat(character): portrait viewBox mode for avatar figure`.

---

### Task 3: Rediseñar `end-state-overlay` en `simulation-play.component.ts`

**Files:** Modify `frontend/src/app/features/simulator/simulation-play.component.ts`

- [ ] **Step 1: Imports + estado** — añadir a la lista `imports` del decorador `AvatarFigureComponent`; importar `AvatarStore`, `AvatarFigureComponent`, y `performanceLabel, adequacyPercent, decisionTotal` de `./outcome.util`. En la clase: `private readonly avatarStore = inject(AvatarStore);` y `readonly avatar = this.avatarStore.avatar;`. Exponer helpers como métodos: `perf(r) { return performanceLabel(r); }`, `adqPct(r) { return adequacyPercent(r); }`, `decTotal(r) { return decisionTotal(r); }`.

- [ ] **Step 2: Reemplazar el bloque template `end-state-overlay`** (la `<section class="end-state-overlay ...">...</section>` completa) por la tarjeta nueva: cabecera con `<app-avatar-figure [config]="avatar()" [portrait]="true">` en marco circular + título + `summaryMessage`; grid de métricas (Puntaje, Progreso=visitedNodeTitles.length, Estrés final, Tiempo=`formatDuration`, Desempeño=`perf(report)`); bloque decisiones con 3 barras proporcionales (adequate/risky/inadequate) y chips (herramientas, reflexiones, salida segura, alerta ética si prohibited); tags de `competencies`; retroalimentación (`recommendations` / `summaryMessage`); acciones **Reintentar caso** `(click)="startNewAttempt()"`, **Volver al portal** `routerLink="/portal/dashboard"`, **Volver al simulador** `routerLink="/portal/simulador"`. Variante `outcome--safe` cuando `status==='SAFE_EXITED'`.

- [ ] **Step 3: Reemplazar los estilos** del antiguo `.end-state-overlay`/`.report-grid`/`.report-list` por los de la tarjeta `.outcome` liquid-glass morada (cabecera, `.oc-metrics`, `.oc-bars`, `.oc-tags`, `.oc-actions`), reutilizando las vars `--sim-*` ya definidas en `.game-container`.

- [ ] **Step 4: Build** → OK.

- [ ] **Step 5: Commit** `feat(game): redesigned outcome screen (liquid-glass, metrics, avatar)`.

---

### Task 4: Verificación final + smoke

- [ ] **Step 1:** `cd frontend && npm test` → verde (incl. `outcome.util.spec`).
- [ ] **Step 2:** `cd frontend && npm run build` → OK.
- [ ] **Step 3: Smoke (Brave):** abrir `SIM-VBG-001`, forzar/llegar a estado COMPLETED (vía decisiones o, si es lento, navegar tras completar) → ver tarjeta de resultados con avatar, métricas, decisiones, competencias, retro; probar Reintentar y Volver al portal; verificar variante salida segura (Esc) y legibilidad.
- [ ] **Step 4:** Commit de ajustes si hubo. `superpowers:finishing-a-development-branch` (merge a master).
