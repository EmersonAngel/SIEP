# Editor de personaje (avatar SVG por capas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans / subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Pantalla `/portal/personaje` donde el estudiante crea un avatar por capas (SVG vectorial) con persistencia en `localStorage`, arquitectado para sustituir cada capa por arte real después. Sin backend.

**Architecture:** Modelo + catálogos (`avatar.model.ts`); utilidades puras (`avatar-config.util.ts`) y un store Signals sobre localStorage (`avatar.store.ts`) — ambos con TDD; renderer SVG por capas (`avatar-figure.component.ts`); pantalla (`character-editor.component.ts`); ruta + nav. Estética liquid-glass morada (rebanada 2).

**Tech Stack:** Angular 21 (standalone + Signals), TypeScript, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-character-editor-design.md`

**Verificación:** util + store por unidad (TDD). Renderer y pantalla = `ng build` + smoke en vivo.

---

### Task 1: Modelo y catálogos — `avatar.model.ts`

**Files:** Create `frontend/src/app/features/character/avatar.model.ts`

- [ ] **Step 1: Crear el modelo + catálogos**

```ts
export type Uniform = 'sin-bata' | 'con-bata';

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  fringe: boolean;
  eyes: string;
  brows: string;
  mouth: string;
  accessory: string;
  uniform: Uniform;
}

export interface Option { id: string; label: string; value?: string; }

export const SKIN_TONES: readonly Option[] = [
  { id: 'porcelana', label: 'Porcelana', value: '#F2D2BD' },
  { id: 'clara',     label: 'Clara',     value: '#E8B596' },
  { id: 'media',     label: 'Media',     value: '#C68A63' },
  { id: 'morena',    label: 'Morena',    value: '#9C6644' },
  { id: 'oscura',    label: 'Oscura',    value: '#6B4329' },
];
export const HAIR_COLORS: readonly Option[] = [
  { id: 'negro',     label: 'Negro',     value: '#2B2B30' },
  { id: 'castano',   label: 'Castaño',   value: '#5B3A24' },
  { id: 'rubio',     label: 'Rubio',     value: '#C9A05A' },
  { id: 'rojizo',    label: 'Rojizo',    value: '#8C4B2F' },
  { id: 'gris',      label: 'Gris',      value: '#9AA0A6' },
];
export const HAIR_STYLES: readonly Option[] = [
  { id: 'corto',   label: 'Corto' },
  { id: 'medio',   label: 'Medio' },
  { id: 'largo',   label: 'Largo' },
  { id: 'recogido',label: 'Recogido' },
  { id: 'ninguno', label: 'Sin cabello' },
];
export const EYES: readonly Option[] = [
  { id: 'neutros', label: 'Neutros' },
  { id: 'amables', label: 'Amables' },
  { id: 'atentos', label: 'Atentos' },
];
export const BROWS: readonly Option[] = [
  { id: 'rectas',   label: 'Rectas' },
  { id: 'suaves',   label: 'Suaves' },
  { id: 'marcadas', label: 'Marcadas' },
];
export const MOUTHS: readonly Option[] = [
  { id: 'neutra',  label: 'Neutra' },
  { id: 'sonrisa', label: 'Sonrisa' },
  { id: 'seria',   label: 'Seria' },
];
export const ACCESSORIES: readonly Option[] = [
  { id: 'ninguno', label: 'Ninguno' },
  { id: 'gafas',   label: 'Gafas' },
  { id: 'pin',     label: 'Pin del programa' },
];
export const UNIFORMS: readonly { id: Uniform; label: string }[] = [
  { id: 'sin-bata', label: 'Sin bata' },
  { id: 'con-bata', label: 'Con bata' },
];

export function hexOf(list: readonly Option[], id: string, fallback: string): string {
  return list.find(o => o.id === id)?.value ?? fallback;
}
```

- [ ] **Step 2: Commit** (junto con Task 2, ver abajo — el modelo se valida vía la util).

---

### Task 2: Utilidades puras — `avatar-config.util.ts` (TDD)

**Files:** Create `frontend/src/app/features/character/avatar-config.util.ts` + `.spec.ts`

- [ ] **Step 1: Test que falla**

`frontend/src/app/features/character/avatar-config.util.spec.ts`:

```ts
import { defaultAvatar, isValidAvatar, coerceAvatar, serializeAvatar, parseAvatar } from './avatar-config.util';

describe('avatar-config', () => {
  it('defaultAvatar is valid', () => {
    expect(isValidAvatar(defaultAvatar())).toBe(true);
  });

  it('coerceAvatar fixes invalid ids but keeps valid ones', () => {
    const out = coerceAvatar({ ...defaultAvatar(), skinTone: 'inexistente', hairColor: 'rubio' });
    expect(out.skinTone).toBe(defaultAvatar().skinTone); // corregido
    expect(out.hairColor).toBe('rubio');                 // conservado
  });

  it('coerceAvatar fills missing fields from default', () => {
    const out = coerceAvatar({ uniform: 'con-bata' });
    expect(out.uniform).toBe('con-bata');
    expect(out.eyes).toBe(defaultAvatar().eyes);
  });

  it('parseAvatar tolerates null and corrupt JSON', () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar());
    expect(parseAvatar('{not json')).toEqual(defaultAvatar());
  });

  it('serialize -> parse roundtrips', () => {
    const a = { ...defaultAvatar(), hairStyle: 'largo', uniform: 'con-bata' as const };
    expect(parseAvatar(serializeAvatar(a))).toEqual(a);
  });
});
```

- [ ] **Step 2: Run → fails** `cd frontend && npx jest avatar-config.util.spec -i` → módulo no encontrado.

- [ ] **Step 3: Implementación**

`frontend/src/app/features/character/avatar-config.util.ts`:

```ts
import {
  AvatarConfig, Uniform,
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, EYES, BROWS, MOUTHS, ACCESSORIES,
} from './avatar.model';

const has = (list: readonly { id: string }[], id: unknown) =>
  typeof id === 'string' && list.some(o => o.id === id);

export function defaultAvatar(): AvatarConfig {
  return {
    skinTone: 'clara', hairStyle: 'corto', hairColor: 'castano', fringe: false,
    eyes: 'neutros', brows: 'rectas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  };
}

export function isValidAvatar(x: unknown): x is AvatarConfig {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return has(SKIN_TONES, a['skinTone']) && has(HAIR_STYLES, a['hairStyle'])
    && has(HAIR_COLORS, a['hairColor']) && typeof a['fringe'] === 'boolean'
    && has(EYES, a['eyes']) && has(BROWS, a['brows']) && has(MOUTHS, a['mouth'])
    && has(ACCESSORIES, a['accessory'])
    && (a['uniform'] === 'sin-bata' || a['uniform'] === 'con-bata');
}

export function coerceAvatar(x: unknown): AvatarConfig {
  const d = defaultAvatar();
  const a = (x && typeof x === 'object') ? x as Record<string, unknown> : {};
  const pick = (list: readonly { id: string }[], v: unknown, fb: string) => has(list, v) ? v as string : fb;
  const uni: Uniform = (a['uniform'] === 'con-bata' || a['uniform'] === 'sin-bata') ? a['uniform'] : d.uniform;
  return {
    skinTone: pick(SKIN_TONES, a['skinTone'], d.skinTone),
    hairStyle: pick(HAIR_STYLES, a['hairStyle'], d.hairStyle),
    hairColor: pick(HAIR_COLORS, a['hairColor'], d.hairColor),
    fringe: typeof a['fringe'] === 'boolean' ? a['fringe'] : d.fringe,
    eyes: pick(EYES, a['eyes'], d.eyes),
    brows: pick(BROWS, a['brows'], d.brows),
    mouth: pick(MOUTHS, a['mouth'], d.mouth),
    accessory: pick(ACCESSORIES, a['accessory'], d.accessory),
    uniform: uni,
  };
}

export function serializeAvatar(a: AvatarConfig): string { return JSON.stringify(a); }

export function parseAvatar(raw: string | null): AvatarConfig {
  if (!raw) return defaultAvatar();
  try { return coerceAvatar(JSON.parse(raw)); }
  catch { return defaultAvatar(); }
}
```

- [ ] **Step 4: Run → passes**, luego **commit**:

```bash
git add frontend/src/app/features/character/avatar.model.ts frontend/src/app/features/character/avatar-config.util.ts frontend/src/app/features/character/avatar-config.util.spec.ts
git commit -m "feat(character): avatar model + pure config util (default/coerce/parse)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Store Signals sobre localStorage — `avatar.store.ts` (TDD)

**Files:** Create `frontend/src/app/features/character/avatar.store.ts` + `.spec.ts`

- [ ] **Step 1: Test que falla**

`avatar.store.spec.ts`:

```ts
import { AvatarStore } from './avatar.store';
import { defaultAvatar } from './avatar-config.util';

function mockStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.has(k) ? m.get(k)! : null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  } as Storage;
}

describe('AvatarStore', () => {
  it('starts from default when storage empty', () => {
    const s = new AvatarStore(mockStorage());
    expect(s.avatar()).toEqual(defaultAvatar());
  });

  it('update merges without persisting until save', () => {
    const store = mockStorage();
    const s = new AvatarStore(store);
    s.update({ uniform: 'con-bata' });
    expect(s.avatar().uniform).toBe('con-bata');
    expect(store.getItem('psychosim_avatar')).toBeNull();
    s.save();
    expect(store.getItem('psychosim_avatar')).toContain('con-bata');
  });

  it('reset returns to default but keeps saved until next save', () => {
    const store = mockStorage();
    const s = new AvatarStore(store);
    s.update({ hairStyle: 'largo' }); s.save();
    s.reset();
    expect(s.avatar()).toEqual(defaultAvatar());
    expect(store.getItem('psychosim_avatar')).toContain('largo');
  });

  it('loadSaved re-reads persisted value', () => {
    const store = mockStorage();
    store.setItem('psychosim_avatar', JSON.stringify({ ...defaultAvatar(), hairColor: 'rubio' }));
    const s = new AvatarStore(store);
    s.loadSaved();
    expect(s.avatar().hairColor).toBe('rubio');
  });
});
```

- [ ] **Step 2: Run → fails.**

- [ ] **Step 3: Implementación**

`avatar.store.ts`:

```ts
import { Injectable, signal } from '@angular/core';
import { AvatarConfig } from './avatar.model';
import { defaultAvatar, parseAvatar, serializeAvatar } from './avatar-config.util';

const KEY = 'psychosim_avatar';

@Injectable({ providedIn: 'root' })
export class AvatarStore {
  private readonly store: Storage | null;
  private readonly _avatar = signal<AvatarConfig>(defaultAvatar());
  readonly avatar = this._avatar.asReadonly();

  // Inyectable para test; en runtime usa window.localStorage si existe.
  constructor(storage?: Storage) {
    this.store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadSaved();
  }

  loadSaved(): void {
    this._avatar.set(parseAvatar(this.safeGet()));
  }

  update(patch: Partial<AvatarConfig>): void {
    this._avatar.update(a => ({ ...a, ...patch }));
  }

  save(): void {
    try { this.store?.setItem(KEY, serializeAvatar(this._avatar())); } catch { /* cuota/privado: no-op */ }
  }

  reset(): void {
    this._avatar.set(defaultAvatar());
  }

  private safeGet(): string | null {
    try { return this.store?.getItem(KEY) ?? null; } catch { return null; }
  }
}
```

- [ ] **Step 4: Run → passes**, **commit**:

```bash
git add frontend/src/app/features/character/avatar.store.ts frontend/src/app/features/character/avatar.store.spec.ts
git commit -m "feat(character): AvatarStore signals over localStorage (save/reset/load)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Renderer SVG por capas — `avatar-figure.component.ts`

**Files:** Create `frontend/src/app/features/character/avatar-figure.component.ts`

- [ ] **Step 1:** Implementar un componente standalone `app-avatar-figure` con `config = input.required<AvatarConfig>()` y `pose = input<'front'|'side'>('front')`. Render `<svg viewBox="0 0 120 170">` componiendo por orden de profundidad: sombra → torso (uniforme gris-azulado) → cuello/cabeza (`hexOf(SKIN_TONES,...)`) → bata blanca si `con-bata` → orejas → rostro (ojos/cejas/boca por id) → cabello atrás/adelante (path por `hairStyle` + flequillo) tintado con `hexOf(HAIR_COLORS,...)` → accesorio. Cada capa en un `@if`/`<g>` con comentario `<!-- REEMPLAZO ARTE: capa X -->`. `pose==='side'` aplica `transform` espejo/rotación leve al grupo de cabeza. Helpers `skin()`, `hair()` como getters computados desde `config()`. Sin estado propio.

- [ ] **Step 2: Verify build** `cd frontend && npm run build` → OK.

- [ ] **Step 3: Commit** `feat(character): layered SVG avatar renderer`.

---

### Task 5: Pantalla — `character-editor.component.ts`

**Files:** Create `frontend/src/app/features/character/character-editor.component.ts`

- [ ] **Step 1:** Componente standalone `app-character-editor` que inyecta `AvatarStore`, `AuthService`, `Router`, `NotificationService`. `avatar = this.store.avatar`. `pose = signal<'front'|'side'>('front')`. Template con 3 columnas (apariencia / avatar+pose / resumen+uniforme) + footer (Restablecer/Guardar/Continuar). Cada grupo de opciones itera su catálogo (`SKIN_TONES`, etc.) como botones `role="radio"` con `[class.sel]` y `(click)="store.update({campo:o.id})"`. Uniforme y presets idem. `guardar()` → `store.save()` + toast "Personaje guardado". `restablecer()` → `store.reset()`. `continuar()` → `store.save()` + `router.navigate(['/portal/simulador'])`. Estética liquid-glass morada (estilos locales con vars `--sim-*` análogas a la rebanada 2). `sr-only` con resumen textual del avatar.

- [ ] **Step 2: Verify build** → OK.

- [ ] **Step 3: Commit** `feat(character): character editor screen (liquid-glass)`.

---

### Task 6: Ruta + navegación

**Files:** Modify `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/layout/shell.component.ts`

- [ ] **Step 1:** En `app.routes.ts`, dentro de los children de `portal`, añadir:

```ts
      {
        path: 'personaje',
        canActivate: [roleGuard('ESTUDIANTE', 'ADMIN')],
        loadComponent: () => import('./features/character/character-editor.component').then(m => m.CharacterEditorComponent)
      },
```

- [ ] **Step 2:** En `shell.component.ts`, añadir un item de nav "Mi personaje" → `/portal/personaje` visible para ESTUDIANTE/ADMIN (seguir el patrón de items existentes; inspeccionar el componente antes de editar).

- [ ] **Step 3: Verify build** → OK.

- [ ] **Step 4: Commit** `feat(character): route + nav entry for character editor`.

---

### Task 7: Verificación final + smoke

- [ ] **Step 1:** `cd frontend && npm test` → verde (incl. avatar-config + avatar.store specs).
- [ ] **Step 2:** `cd frontend && npm run build` → OK.
- [ ] **Step 3: Smoke (Brave):** login estudiante → `/portal/personaje`; cambiar tono de piel, peinado, color, accesorio, uniforme sin/con bata → avatar SVG actualiza en vivo; **Guardar**; recargar la página → persiste; **Continuar** → navega a `/portal/simulador`; verificar liquid-glass + legibilidad; confirmar portal claro intacto en el resto.
- [ ] **Step 4:** Commit de ajustes si los hubo. Luego `superpowers:finishing-a-development-branch` (merge a master).
