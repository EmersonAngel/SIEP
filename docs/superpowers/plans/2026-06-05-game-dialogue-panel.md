# Panel de diálogo (morado + opciones numeradas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Rediseñar el panel de diálogo a la identidad morada/lavanda con retrato SVG y opciones numeradas seleccionables por teclado, sin backend.

**Architecture:** Util pura `dialogue-keys.util.ts` (tecla→índice, TDD); cambios de template+estilos en `dialogue-panel.component.ts` (badge numérico, HostListener de teclado, retrato SVG, restyle morado, fix NG8107).

**Tech Stack:** Angular 21, TypeScript, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-game-dialogue-panel-design.md`

**Verificación:** util por unidad; panel por `ng build` + smoke.

---

### Task 1: `dialogue-keys.util.ts` (TDD)

**Files:** Create `frontend/src/app/features/simulator/dialogue-keys.util.ts` + `.spec.ts`

- [ ] **Step 1: Test que falla** — `dialogue-keys.util.spec.ts`:

```ts
import { digitIndex } from './dialogue-keys.util';

describe('digitIndex', () => {
  it('maps 1..9 to 0..8', () => {
    expect(digitIndex('1')).toBe(0);
    expect(digitIndex('3')).toBe(2);
    expect(digitIndex('9')).toBe(8);
  });
  it('returns null for 0, letters, empty, multi-char', () => {
    expect(digitIndex('0')).toBeNull();
    expect(digitIndex('a')).toBeNull();
    expect(digitIndex('')).toBeNull();
    expect(digitIndex('12')).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fails** `cd frontend && npx jest dialogue-keys.util.spec -i`.

- [ ] **Step 3: Implementación** — `dialogue-keys.util.ts`:

```ts
/** Mapea una tecla de dígito '1'..'9' a un índice 0..8; cualquier otra → null. */
export function digitIndex(key: string): number | null {
  if (key.length !== 1) return null;
  const n = key.charCodeAt(0) - 48; // '0' = 48
  return n >= 1 && n <= 9 ? n - 1 : null;
}
```

- [ ] **Step 4: Run → passes**, **commit**:

```bash
git add frontend/src/app/features/simulator/dialogue-keys.util.ts frontend/src/app/features/simulator/dialogue-keys.util.spec.ts
git commit -m "feat(game): pure digit-to-choice-index util for dialogue keyboard nav

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Teclado + badge numérico + fix NG8107

**Files:** Modify `frontend/src/app/features/simulator/dialogue-panel.component.ts`

- [ ] **Step 1: Import + HostListener** — añadir `HostListener` a los imports de `@angular/core` y `import { digitIndex } from './dialogue-keys.util';`. En la clase, añadir:

```ts
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const d = this.dialogue();
    if (!d || !this.isTypingComplete() || !d.choices.length) return;
    const idx = digitIndex(e.key);
    if (idx === null || idx >= d.choices.length) return;
    e.preventDefault();
    this.handleChoice(d.choices[idx]);
  }
```

- [ ] **Step 2: Badge numérico en el template** — cambiar `@for (choice of d.choices; track choice.key) {` por `@for (choice of d.choices; track choice.key; let i = $index) {`, y dentro del `<button>`, antes de `<span class="choice-btn__icon" ...>`, añadir:

```html
                  <span class="choice-num" aria-hidden="true">{{ i + 1 }}</span>
```

- [ ] **Step 3: Fix NG8107** — línea ~70, cambiar `@if (isTypingComplete() && !d.choices?.length) {` por `@if (isTypingComplete() && !d.choices.length) {`.

- [ ] **Step 4: Estilo del badge** — en el bloque `styles`, tras `.choice-btn__icon::before { ... }` (antes de `.choice-btn--recommended .choice-btn__icon::before`), añadir:

```css
    .choice-num {
      display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0;
      border-radius: 7px; border: 1px solid rgba(182,156,255,.5);
      background: rgba(124,77,255,.16); color: #cdbcff;
      font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: .76rem;
    }
```
y cambiar el grid del `.choice-btn` para acomodar el número: `grid-template-columns: auto auto minmax(0, 1fr);` (en `.choice-btn`).

- [ ] **Step 5: Build** `cd frontend && npm run build` → OK (sin NG8107 de dialogue-panel).

- [ ] **Step 6: Commit** `feat(game): numbered dialogue choices + keyboard 1-9 selection`.

---

### Task 3: Retrato SVG + restyle morado

**Files:** Modify `frontend/src/app/features/simulator/dialogue-panel.component.ts`

- [ ] **Step 1: Retrato SVG** — reemplazar el bloque del retrato:

```html
        <div class="portrait" aria-hidden="true">
          <mat-icon>{{ portraitIcon(d.portraitKey) }}</mat-icon>
          @if (d.emotion && d.emotion !== 'neutral') {
            <span class="emotion-chip" [attr.data-emotion]="d.emotion"></span>
          }
        </div>
```
por:
```html
        <div class="portrait" aria-hidden="true">
          <svg viewBox="0 0 48 48" class="portrait-svg" width="40" height="40">
            <circle cx="24" cy="18" r="9" fill="currentColor"/>
            <path d="M8 44 C8 33 15 28 24 28 C33 28 40 33 40 44 Z" fill="currentColor"/>
          </svg>
          @if (d.emotion && d.emotion !== 'neutral') {
            <span class="emotion-chip" [attr.data-emotion]="d.emotion"></span>
          }
        </div>
```

- [ ] **Step 2: Restyle morado** — en el bloque `styles`, reemplazar acentos teal/azul por morado/lavanda:
  - `.dialogue-strip { ... border-top: 2px solid rgba(79,163,165,.35); ... }` → `rgba(182,156,255,.4)`.
  - `.portrait { ... border-right: 1px solid rgba(79,163,165,.2); background: rgba(79,163,165,.06); }` → `rgba(182,156,255,.2)` / `rgba(124,77,255,.08)`.
  - Reemplazar `.portrait mat-icon { color: var(--siep-blue-soft); font-size: 32px; width: 32px; height: 32px; }` por `.portrait-svg { color: #B69CFF; }`.
  - `.emotion-chip { ... background: var(--siep-blue-soft); ... }` → `background: #B69CFF;`.
  - `.speaker-name { ... color: #4fa3a5; }` → `color: #B69CFF;`.
  - `.cursor { ... color: #4fa3a5; ... }` → `color: #B69CFF;`.
  - `.choice-btn { ... border: 2px solid rgba(79,163,165,.32); ... box-shadow: 4px 4px 0 rgba(79,163,165,.08); ... }` → `border: 1px solid rgba(182,156,255,.3);` y `box-shadow: 0 14px 34px -22px rgba(124,77,255,.5);`.
  - `.choice-btn:hover { ... border-color: rgba(79,163,165,.7); background: rgba(79,163,165,.14); }` → `rgba(182,156,255,.7)` / `rgba(124,77,255,.16)`.
  - `.choice-btn:focus-visible { outline: 3px solid rgba(157,192,232,.45); ... }` → `rgba(182,156,255,.5)`.
  - `.choice-btn__icon { ... background: rgba(79,163,165,.12); color: #9dc0e8; }` → `rgba(124,77,255,.14)` / `#cdbcff`.
  - `.choice-btn--recommended { border-color: rgba(59,130,246,.5); background: rgba(59,130,246,.1); color: rgba(147,197,253,.95); }` → teal suave: `border-color: rgba(108,192,199,.5); background: rgba(108,192,199,.12); color: #bfeef1;` y su `:hover` análogo.
  - `.choice-btn--prohibited` (rojo) se mantiene.

- [ ] **Step 3: Build** → OK.

- [ ] **Step 4: Commit** `feat(game): SVG NPC portrait + purple liquid-glass dialogue restyle`.

---

### Task 4: Verificación final + smoke

- [ ] **Step 1:** `cd frontend && npm test` → verde (incl. `dialogue-keys.util.spec`).
- [ ] **Step 2:** `cd frontend && npm run build` → OK, sin NG8107 de dialogue-panel.
- [ ] **Step 3: Smoke (Brave):** en `SIM-VBG-001`, abrir un diálogo con opciones → panel morado, retrato SVG, opciones numeradas; pulsar tecla numérica selecciona; typewriter y recomendada/contraindicada OK.
- [ ] **Step 4:** Commit de ajustes si hubo. `superpowers:finishing-a-development-branch` (merge a master).
