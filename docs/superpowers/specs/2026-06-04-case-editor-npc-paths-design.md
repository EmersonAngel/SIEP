# Editor de casos — Fase 2: Paths de NPC (autoría visual de movementPattern)

- **Fecha:** 2026-06-04
- **Estado:** Aprobado por el usuario (control delegado). Proceder a plan → build.
- **Sub-proyecto:** E (editor) · Fase 2 de "Completar y unificar el editor".
- **Repos:** **solo frontend** `psicologia_proyecto/admin-panel` (Angular 21 + Konva). **Sin cambios de backend ni de runtime.**
- **Rama:** `feat/case-editor-npc-paths`, sobre `feat/case-editor-dialogues` (Fase 1).

## 1. Contexto

El runtime **ya reproduce** los patrones de movimiento de los NPC y el backend ya hace round-trip del campo `movementPattern`:

| Pieza | Estado |
|---|---|
| Contrato `MovementPattern` (`idle` \| `wander{radius}` \| `patrol{points}`) | ✅ `scene-motion.util.ts` (helpers puros + tests) |
| Reproducción en runtime (wander + **patrol** ciclando waypoints; respeta `prefers-reduced-motion`) | ✅ `game-world.component.ts` (`applyAmbientLife` → `resolvePattern` → `AmbientMover`; `updateAmbientMovers` / `nextAmbientTarget`) |
| Carga del editor devuelve `movementPattern` | ✅ `world_editor` → `_world_object` (`authoring_service.py:1147`) |
| Guardado persiste `movementPattern` | ✅ `save_world` (`authoring_service.py:1017`) |
| Preview real (Phaser) reproduce patrol | ✅ pestaña "Vista previa" (`world-preview.component.ts`) |
| **UI para autorar `movementPattern`** | ❌ **no existe** — es lo que falta |

⇒ La Fase 2 añade **solo la herramienta del editor** para autorar `object.movementPattern`. La reproducción y la persistencia ya existen.

## 2. Objetivos / No-objetivos

**Objetivos:** con un objeto seleccionado en el editor Konva, una sección **"Movimiento"** en el inspector permite:
- Elegir **tipo**: `idle` / `wander` / `patrol`.
- `wander`: editar **radio** (con círculo guía tenue en el lienzo).
- `patrol`: **dibujar la ruta** — modo "Dibujar ruta" donde cada clic en el lienzo agrega un waypoint numerado unido por polilínea; arrastrar handles para mover; ✕ para borrar; lista en el inspector para borrar/reordenar.
- Persistir vía el guardado bulk existente; `undo/redo` integrado.

**No-objetivos (Fase 2b u otras):** velocidad por NPC, espera/pausa en waypoints, modo de recorrido (una vez / ida-vuelta), y `facing` derivado del movimiento — requieren extender `MovementPattern` + el mover del runtime; quedan fuera. Multi-sala, diálogos (Fase 1, ya hecha), convergencia de runtime (Fase 4).

## 3. Modelo de datos (sin migración)

`map_objects.movement_pattern_json` (TEXT, JSON) ya existe; `WorldObject.movementPattern: Record<string,unknown>` ya está en el modelo del frontend. Formas válidas (las que el runtime reproduce):
- `{ "type": "idle" }`
- `{ "type": "wander", "radius": <number> }`
- `{ "type": "patrol", "points": [[x,y], …] }` (coordenadas en píxeles de mundo, igual que las posiciones de objeto)

No se inventan campos nuevos (eso sería Fase 2b).

## 4. Diseño

**Helpers puros** — nuevo `world-editor/path-edit.util.ts` (estilo `scene-motion.util.ts`, testeable sin Angular). Operan sobre el `Record` de `movementPattern` y devuelven uno nuevo (inmutable):
- `setPatternType(pattern, type)` — cambia tipo conservando datos compatibles (wander→radio por defecto 28; patrol→points existentes o []).
- `setWanderRadius(pattern, radius)`.
- `withPatrolPoint(pattern, x, y)` — agrega waypoint (fuerza `patrol`).
- `movePatrolPoint(pattern, idx, x, y)`, `removePatrolPoint(pattern, idx)`, `reorderPatrolPoint(pattern, idx, dir)`.
- `patrolPoints(pattern): Array<[number,number]>` — lectura segura.

**Comandos:** se **reutiliza `UpdateInspectorCommand`** de Fase 1 (ya setea cualquier campo de `WorldObject` con undo/redo). Cada edición = `UpdateInspectorCommand(objKey, { movementPattern: nuevo })`.

**Store** (`world-editor.store.ts`): `readonly pathEditMode = signal(false)` (modo dibujo de ruta).

**Inspector** (`world-editor.component.ts`): sección colapsable "Movimiento" dentro del branch del objeto (junto a "Diálogo"): selector de tipo; si wander, input de radio; si patrol, toggle "Dibujar ruta" + lista de waypoints (índice, borrar, subir/bajar). Handlers construyen el nuevo pattern con los helpers puros y despachan `UpdateInspectorCommand`.

**Lienzo** (`renderWorld`): para el **objeto seleccionado**:
- patrol → polilínea (origen del objeto → puntos en orden) + handles circulares numerados **arrastrables**; `dragend` → `movePatrolPoint` (snap a grid) → `UpdateInspectorCommand`. Doble propósito del clic en handle: seleccionar; botón ✕ flotante o tecla Supr en modo edición borra.
- wander → círculo guía de radio.
- En `pathEditMode`, clic en lienzo vacío (en `onStageClick`) → `withPatrolPoint` (snap a grid).

**Preview:** sin animación nueva en el editor; el autor usa la pestaña "Vista previa" (Phaser real) para ver el NPC recorrer la ruta.

## 5. Manejo de errores / bordes

- Objeto sin `movementPattern` → se trata como `idle` (helper de lectura segura).
- patrol con 0–1 puntos → válido; el runtime simplemente no se desplaza (sin crash).
- Reduce-motion: el runtime ya no anima (sin regresión).
- Conflicto de guardado 409 y gate DRAFT: cubiertos por el flujo de guardado existente.

## 6. Pruebas

- **jest** (puro): `path-edit.util.spec.ts` — set tipo (idle/wander/patrol), set radio, agregar/mover/borrar/reordenar waypoint, lectura segura de patrones malformados.
- **ng build** verde.
- **Smoke navegador** (manual/Playwright): seleccionar un PERSON → patrol → dibujar 3 waypoints → guardar → recargar (persisten) → "Vista previa": el NPC recorre la ruta.
- **Backend:** sin cambios → sin tests nuevos.

## 7. Criterios de aceptación

- Con un objeto seleccionado, puedo fijar idle/wander/patrol; en patrol puedo dibujar, mover, borrar y reordenar waypoints en el lienzo.
- El `movementPattern` se guarda y se relee (round-trip) por el flujo existente.
- En "Vista previa" el NPC recorre la ruta autorada.
- jest verde (helpers puros), `ng build` verde. Sin tocar backend/runtime ni romper Fase 1.

## 8. Cómo se procede

`writing-plans` → plan TDD → `executing-plans` (rama `feat/case-editor-npc-paths` sobre Fase 1) → `verify` en vivo → `finishing-a-development-branch` (push + PR).
