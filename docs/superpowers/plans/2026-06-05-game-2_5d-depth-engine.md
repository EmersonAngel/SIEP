# Motor 2.5D (Y-sort + capas Tiled + profundidad procedural) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar el runtime Phaser a una ilusión 2.5D ordenando actores por eje Y, soportando las 9 capas Tiled y añadiendo sombras/luz procedurales, sin arte nuevo ni cambios de backend.

**Architecture:** Una util pura (`depth-sort.util.ts`) centraliza bandas de profundidad y `actorDepth(y)`; está cubierta por Jest. El resto son cambios en `DataDrivenWorldScene` (Phaser) en `game-world.component.ts`: profundidad por frame de actores, un helper `buildTiledLayers` compartido por las dos rutas de render, y un overlay de iluminación procedural. Los mapas actuales (solo `Floor`/`Walls`) siguen idénticos.

**Tech Stack:** Angular 21, Phaser 3, TypeScript, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-game-2_5d-depth-engine-design.md`

**Nota de verificación:** Solo `depth-sort.util.ts` es testeable por unidad (TDD red→green). Las tareas Phaser (2–5) no tienen test unitario viable (no hay infra de test de escenas Phaser en el repo); su gate es `ng build` verde + smoke en vivo. Esto es coherente con cómo el repo verifica el runtime (specs previas del editor).

---

### Task 1: Util pura de profundidad (`depth-sort.util.ts`)

**Files:**
- Create: `frontend/src/app/features/simulator/depth-sort.util.ts`
- Test: `frontend/src/app/features/simulator/depth-sort.util.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/simulator/depth-sort.util.spec.ts`:

```ts
import { DEPTH, actorDepth, tiledLayerDepth } from './depth-sort.util';

describe('actorDepth', () => {
  it('is monotonic in y (lower on screen = drawn in front)', () => {
    expect(actorDepth(100)).toBeLessThan(actorDepth(200));
  });

  it('clamps negative y to the actor base', () => {
    expect(actorDepth(-5)).toBe(DEPTH.ACTORS_BASE);
  });

  it('keeps realistic actors below the props_front band', () => {
    expect(actorDepth(20000)).toBeLessThan(DEPTH.PROPS_FRONT);
  });
});

describe('tiledLayerDepth', () => {
  it('maps the 2.5D layer names to their band, ignoring numeric prefix and case', () => {
    expect(tiledLayerDepth('props_back')).toBe(DEPTH.PROPS_BACK);
    expect(tiledLayerDepth('3_props_back')).toBe(DEPTH.PROPS_BACK);
    expect(tiledLayerDepth('PROPS_BACK')).toBe(DEPTH.PROPS_BACK);
    expect(tiledLayerDepth('props_front')).toBe(DEPTH.PROPS_FRONT);
    expect(tiledLayerDepth('lighting')).toBe(DEPTH.LIGHTING);
    expect(tiledLayerDepth('overlay')).toBe(DEPTH.OVERLAY);
  });

  it('maps legacy Floor/Walls names', () => {
    expect(tiledLayerDepth('Floor')).toBe(DEPTH.FLOOR);
    expect(tiledLayerDepth('Walls')).toBe(DEPTH.WALLS);
  });

  it('returns null for unknown layer names', () => {
    expect(tiledLayerDepth('decoraciones-raras')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest depth-sort.util.spec -i`
Expected: FAIL — `Cannot find module './depth-sort.util'`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/app/features/simulator/depth-sort.util.ts`:

```ts
/**
 * Política de profundidad 2.5D del runtime Phaser.
 *
 * Los actores dinámicos (jugador, NPCs, guía, marcadores) comparten una banda
 * [ACTORS_BASE, ACTORS_BASE + maxY] y se ordenan por su coordenada Y: el que
 * está más abajo en pantalla se dibuja al frente. Las capas estructurales del
 * mapa y la UI usan bandas fijas por encima/por debajo.
 */
export const DEPTH = {
  FLOOR: 0,
  GRID: 1,
  BACKGROUND: 1,
  PROPS_BACK: 2,
  WALLS: 3,
  ENVIRONMENT: 4,
  ACTORS_BASE: 1000,
  PROPS_FRONT: 100000,
  LIGHTING: 200000,
  OVERLAY: 300000,
  UI: 500000,
} as const;

/** Profundidad de un actor dinámico según su Y (más abajo = más al frente). */
export function actorDepth(y: number): number {
  return DEPTH.ACTORS_BASE + Math.max(0, y);
}

const LAYER_BANDS: ReadonlyArray<readonly [string, number]> = [
  ['floor', DEPTH.FLOOR],
  ['walls_back', DEPTH.WALLS],
  ['walls', DEPTH.WALLS],
  ['props_back', DEPTH.PROPS_BACK],
  ['collision', DEPTH.WALLS],
  ['interactables', DEPTH.ENVIRONMENT],
  ['characters', DEPTH.ACTORS_BASE],
  ['props_front', DEPTH.PROPS_FRONT],
  ['lighting', DEPTH.LIGHTING],
  ['overlay', DEPTH.OVERLAY],
];

/**
 * Mapea un nombre de capa Tiled a su banda de profundidad.
 * Tolera prefijo numérico (`3_props_back`) y mayúsculas (`PROPS_BACK`, `Floor`).
 * Devuelve null si no es una capa 2.5D conocida.
 */
export function tiledLayerDepth(name: string): number | null {
  const norm = name.trim().toLowerCase().replace(/^\d+[_-]?/, '');
  for (const [key, depth] of LAYER_BANDS) {
    if (norm === key) return depth;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest depth-sort.util.spec -i`
Expected: PASS (3 + 3 assertions green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/simulator/depth-sort.util.ts frontend/src/app/features/simulator/depth-sort.util.spec.ts
git commit -m "feat(game): pure depth-sort util for 2.5D y-sorting + Tiled layer bands

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Activar `roundPixels` en la config Phaser

**Files:**
- Modify: `frontend/src/app/features/simulator/game-world.component.ts` (método `boot()`, objeto `new Phaser.Game({...})`)

- [ ] **Step 1: Add `roundPixels: true`**

En `boot()`, el objeto de config actualmente tiene:

```ts
        pixelArt: true,   // nearest-neighbour scaling — keeps pixel art sharp
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
```

Cambiar a:

```ts
        pixelArt: true,    // nearest-neighbour scaling — keeps pixel art sharp
        roundPixels: true, // 2.5D: evita shimmer sub-pixel al hacer y-sort + follow
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: build OK (sin errores TS nuevos).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/simulator/game-world.component.ts
git commit -m "feat(game): enable roundPixels for crisp 2.5D pixel art

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Y-sort de actores dinámicos

**Files:**
- Modify: `frontend/src/app/features/simulator/game-world.component.ts`

**Contexto:** hoy los actores usan profundidades fijas: marcadores `setDepth(12)` (`createMarker`), NPCs `setDepth(15)` (`spawnNpcs`), guía `setDepth(16)` (`buildGuide`), jugador `setDepth(20)` (`createPlayer`). Los hints de puerta usan `25` y deben quedar SIEMPRE arriba.

- [ ] **Step 1: Import the util**

En la cabecera de imports de `game-world.component.ts`, junto a los otros imports locales, añadir:

```ts
import { DEPTH, actorDepth } from './depth-sort.util';
```

- [ ] **Step 2: Add a private y-sort helper to `DataDrivenWorldScene`**

Justo antes de `private movePlayer(` añadir:

```ts
  /** Ordena un objeto de mundo por su Y (2.5D: más abajo = más al frente). */
  private ysort(obj: Phaser.GameObjects.Container): void {
    obj.setDepth(actorDepth(obj.y));
  }
```

- [ ] **Step 3: Replace fixed actor depths with y-sorted depths at creation**

- En `createPlayer(...)`: cambiar **ambas** ocurrencias de `.setDepth(20)` (rama con sprite y rama geométrica) por `.setDepth(actorDepth(y))`.
- En `spawnNpcs(...)`: cambiar `.setDepth(15)` por `.setDepth(actorDepth(npc.y))`.
- En `createMarker(...)`: cambiar `const marker = this.add.container(object.x, object.y, [pulse, main, label]).setDepth(12);` por `.setDepth(actorDepth(object.y));`.
- En `buildGuide(...)`: cambiar `.setDepth(16)` del `guideContainer` por `.setDepth(actorDepth(entry.spawnY));`.
- Los hints de puerta (`doorHints`, `.setDepth(25)`) y el bubble de guía (`.setDepth(26)`) cambian a `.setDepth(DEPTH.UI)` para quedar siempre por encima de actores. El título de mapa (`.setDepth(6).setScrollFactor(0)`) y labels de zona se dejan como están (son fondo/estructura, no deben tapar actores; quedan por debajo de la banda de actores, correcto).

- [ ] **Step 4: Update depths each frame for moving actors**

En `update(...)`, dentro del bloque que ya recalcula movimiento, tras la llamada existente `this.updateGuide(delta);` y antes de `this.checkExitTriggers();`, añadir:

```ts
    // 2.5D: re-ordena por Y a los actores que se mueven
    if (this.player) this.ysort(this.player);
    if (this.guideContainer) this.ysort(this.guideContainer);
    for (const mover of this.ambientMovers.values()) {
      const marker = this.markers.get(mover.key);
      if (marker) this.ysort(marker);
    }
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: build OK.

- [ ] **Step 6: Verify jest suite has no regression**

Run: `cd frontend && npm test`
Expected: toda la suite verde (incluida `depth-sort.util.spec`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/simulator/game-world.component.ts
git commit -m "feat(game): y-sort dynamic actors for 2.5D occlusion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Soporte de las 9 capas Tiled (helper compartido)

**Files:**
- Modify: `frontend/src/app/features/simulator/game-world.component.ts`

**Contexto:** hoy `renderWorld()` y `renderRoom()` repiten el mismo bloque que crea `Floor` (depth 2) y `Walls` (depth 3 → `this.wallsLayer`). Lo extraemos a un helper que además renderiza `props_back`/`props_front`/`lighting`/`overlay` si existen, usando `tiledLayerDepth`.

- [ ] **Step 1: Add the import**

Ampliar el import del Task 3 a:

```ts
import { DEPTH, actorDepth, tiledLayerDepth } from './depth-sort.util';
```

- [ ] **Step 2: Add the shared `buildTiledLayers` helper**

Antes de `private renderWorld()` añadir:

```ts
  /**
   * Crea las capas de tiles de un Tilemap aplicando las bandas 2.5D
   * (floor, props_back, walls_back/walls, props_front, lighting, overlay).
   * La capa de paredes alimenta `this.wallsLayer` para colisión.
   * Retrocompatible: mapas con solo `Floor`/`Walls` se comportan igual que antes.
   */
  private buildTiledLayers(
    tilemap: Phaser.Tilemaps.Tilemap,
    tilesets: Phaser.Tilemaps.Tileset[],
  ): void {
    for (const layerData of tilemap.layers) {
      const depth = tiledLayerDepth(layerData.name);
      if (depth === null) continue;
      const layer = tilemap.createLayer(layerData.name, tilesets);
      if (!layer) continue;
      layer.setDepth(depth);
      // La capa de paredes (legacy `Walls` o `walls_back`/`collision`) es la sólida.
      const norm = layerData.name.trim().toLowerCase().replace(/^\d+[_-]?/, '');
      if (norm === 'walls' || norm === 'walls_back' || norm === 'collision') {
        this.wallsLayer = layer;
      }
    }
  }
```

- [ ] **Step 3: Use the helper in `renderWorld()`**

En `renderWorld()`, reemplazar el bloque actual:

```ts
        if (tilesets.length > 0) {
          tilemap.createLayer('Floor', tilesets)?.setDepth(2);
          this.wallsLayer = tilemap.createLayer('Walls', tilesets) ?? undefined;
          this.wallsLayer?.setDepth(3);
        }
```

por:

```ts
        if (tilesets.length > 0) {
          this.buildTiledLayers(tilemap, tilesets);
        }
```

- [ ] **Step 4: Use the helper in `renderRoom()`**

En `renderRoom()`, reemplazar el bloque idéntico:

```ts
        if (tilesets.length > 0) {
          tilemap.createLayer('Floor', tilesets)?.setDepth(2);
          this.wallsLayer = tilemap.createLayer('Walls', tilesets) ?? undefined;
          this.wallsLayer?.setDepth(3);
        }
```

por:

```ts
        if (tilesets.length > 0) {
          this.buildTiledLayers(tilemap, tilesets);
        }
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/simulator/game-world.component.ts
git commit -m "feat(game): support 9-layer Tiled convention (props_back/front, lighting, overlay)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Overlay de iluminación procedural

**Files:**
- Modify: `frontend/src/app/features/simulator/game-world.component.ts`

**Contexto:** sin arte. Una viñeta sutil pineada a cámara da atmósfera (§4/§5.5 del prompt) y respeta pixel-art. Lee `ambient.ambientTone` si existe.

- [ ] **Step 1: Add the `applyLightingOverlay` method**

Antes de `private renderCollisionZone(` añadir:

```ts
  /**
   * Viñeta de iluminación procedural (sin assets). Pineada a cámara, estática
   * (segura con prefers-reduced-motion). El tinte sigue `ambient.ambientTone`.
   */
  private applyLightingOverlay(): void {
    const tone = String(
      (this.world?.map.ambient as { ambientTone?: unknown })?.ambientTone ?? 'calm',
    ).toLowerCase();
    const tint =
      tone === 'warm' ? 0x3a2a1a :
      tone === 'clinical' ? 0x1a2433 :
      tone === 'tense' ? 0x2a1420 :
      0x141a2e; // calm (default)
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING);
    // Borde oscuro suave en los 4 lados — viñeta barata sin shaders.
    const band = Math.round(Math.min(w, h) * 0.18);
    for (let i = 0; i < band; i++) {
      const a = 0.45 * (1 - i / band) ** 2;
      g.lineStyle(1, tint, a);
      g.strokeRect(i, i, w - i * 2, h - i * 2);
    }
  }
```

- [ ] **Step 2: Call it at the end of `renderWorld()`**

En `renderWorld()`, tras `this.buildGuide();` (última línea del método), añadir:

```ts
    this.applyLightingOverlay();
```

- [ ] **Step 3: Call it at the end of `renderRoom()`**

En `renderRoom()`, tras `this.buildGuide();` (última línea del método), añadir:

```ts
    this.applyLightingOverlay();
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/simulator/game-world.component.ts
git commit -m "feat(game): subtle procedural lighting vignette driven by ambientTone

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Verificación final + smoke

**Files:** ninguno (verificación).

- [ ] **Step 1: Full jest suite**

Run: `cd frontend && npm test`
Expected: verde, incluida `depth-sort.util.spec`.

- [ ] **Step 2: Production build**

Run: `cd frontend && npm run build`
Expected: OK.

- [ ] **Step 3: Smoke en vivo (Brave — permiso permanente del usuario)**

1. Levantar BD + Django + frontend (PROMPT_MAESTRO §11): `docker compose up -d db`; `backend_django`: `./.venv/Scripts/python.exe manage.py runserver 8091`; `frontend`: `npm start`.
2. Login estudiante (`estudiante@psychosim.edu.co` / `Estudiante123!`).
3. Ir a `/portal/simulador/1` (caso `SIM-VBG-001`).
4. Caminar el jugador por **detrás** de un NPC/marcador → debe quedar parcialmente tapado; por **delante** → debe tapar al NPC.
5. Confirmar viñeta sutil y que HUD, hints de puerta y título no se ven afectados.
6. Capturar antes/después.

- [ ] **Step 4: Final commit (si quedaron ajustes del smoke)**

```bash
git add -A
git commit -m "chore(game): 2.5D depth engine verified (y-sort + layers + vignette)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Luego: `superpowers:finishing-a-development-branch` (push + PR).
