# Editor de casos — Fase 4: Runtime aplica zoom + fondo — Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** `renderWorld()` del runtime aplica `world.map.ambient.cameraZoom` y `.backgroundImage`. Frontend-only; sin backend (el `/world` ya sirve `ambient`).

**Spec:** `docs/superpowers/specs/2026-06-05-case-editor-runtime-ambient-design.md` · **Rama:** `feat/case-editor-runtime-ambient` (sobre Fase 3).

---

## Task 1: Aplicar zoom + fondo autorados en `renderWorld`

**Files:** Modify `admin-panel/src/app/features/simulator/game-world.component.ts`.

- [ ] **Step 1:** Importar el helper (junto a los imports del componente):

```typescript
import { backgroundImage } from './world-editor/room-edit.util';
```

- [ ] **Step 2:** En `renderWorld()`, reemplazar `cam.setZoom(2);` por zoom autorado:

```typescript
    const cam = this.cameras.main;
    const az = Number((this.world.map.ambient as { cameraZoom?: unknown })?.cameraZoom);
    cam.setZoom(Number.isFinite(az) && az > 0 ? az : 2);
```

- [ ] **Step 3:** Tras el suelo procedural (las líneas del grid), añadir la llamada:

```typescript
    this.applyAuthoredBackground(mapW, mapH);
```

- [ ] **Step 4:** Añadir el método (cerca de los helpers de render):

```typescript
  /** Fase 4: dibuja la imagen de fondo autorada (world.map.ambient.backgroundImage) sobre el suelo. */
  private applyAuthoredBackground(mapW: number, mapH: number): void {
    const url = backgroundImage(this.world?.map.ambient);
    if (!url) return;
    const key = `authored-bg-${url}`;
    const place = () => {
      if (!this.textures.exists(key)) return;
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(mapW, mapH).setDepth(1);
    };
    if (this.textures.exists(key)) { place(); return; }
    this.load.image(key, url);
    this.load.once(Phaser.Loader.Events.COMPLETE, place);
    this.load.start();
  }
```

- [ ] **Step 5:** `cd admin-panel && npm run build` → 0 errores.
- [ ] **Step 6:** Commit (`feat(editor): Fase 4 - runtime applies authored per-room camera zoom + background`).

---

## Task 2: Verificación en vivo

- [ ] `npm run build` verde.
- [ ] Smoke navegador (Django :8091 + Angular :4200): admin → editor → clonar DRAFT → Mundo → nodo → Sala: zoom 3 + fondo (asset real, p. ej. `/assets/images/institution/psychology-program-hero.png`) → guardar → pestaña **"Vista previa"** del mismo nodo → captura: más zoom + imagen de fondo visible.

---

## Self-Review
- **Cobertura:** zoom (Task 1 Step 2), fondo (Steps 3-4), default sin regresión (Step 2), Vista previa + estudiante comparten `renderWorld` (Task 1). ✓
- **Placeholders:** ninguno (código completo). ✓
- **Tipos:** `backgroundImage` (helper Fase 3), `this.world.map.ambient`, Phaser `load.image`/`add.image`. ✓
- **Alcance:** puertas espaciales explícitamente fuera (Fase 5). ✓
