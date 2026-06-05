# Editor de casos — Fase 4: Runtime aplica zoom + fondo autorados

- **Fecha:** 2026-06-05
- **Estado:** Aprobado por el usuario (control delegado). Alcance acordado: **zoom + fondo ahora; puertas espaciales → Fase 5 dedicada** (chocan con el modelo DAG y requieren su propio diseño).
- **Sub-proyecto:** E (editor) · Fase 4 (convergencia de runtime, primera porción segura).
- **Repos:** **solo frontend** `psicologia_proyecto/admin-panel`. **Sin backend, sin migración.**
- **Rama:** `feat/case-editor-runtime-ambient`, sobre `feat/case-editor-multiroom` (Fase 3).

## 1. Contexto

El runtime ya recibe todo lo necesario; solo no lo aplica:
- `world_service.py` (`/world` del estudiante) ya devuelve `map.ambient` (`:257`) y `objects[].metadata/movementPattern/facing` (`:304-306`).
- `world-preview.component.ts` `toWorldState` ya arrastra `map.ambient` (`:633`) → la pestaña **"Vista previa"** renderiza por el mismo camino BD (`renderWorld`, sin `ScenarioConfig`).
- `game-world.component.ts` `renderWorld()` **fija** la cámara y el fondo: `cam.setZoom(2)` (`:512`) y `setBackgroundColor('#0e141a')` (`:430`).

⇒ Fase 4 (esta porción): `renderWorld()` aplica el **zoom** y la **imagen de fondo** autorados (`world.map.ambient.cameraZoom` / `.backgroundImage`).

## 2. Objetivos / No-objetivos

**Objetivos:**
- `renderWorld()` usa `ambient.cameraZoom` para `cam.setZoom(...)` (default **2** si no hay valor → sin regresión).
- `renderWorld()` dibuja `ambient.backgroundImage` como imagen sobre el suelo (depth 1, debajo de marcadores/jugador); si no hay URL o falla la carga, mantiene el suelo procedural (sin crash).
- Aplica tanto en **Vista previa** como en el juego del estudiante por el camino BD (`renderWorld` es compartido).

**No-objetivos (Fase 5+):** transiciones por **puertas** (EXIT espaciales) — requieren modelo salas-espaciales-vs-DAG + endpoint nuevo; jubilar `ScenarioConfig`/`renderRoom`; tocar backend.

## 3. Diseño

`game-world.component.ts`:
- Importar `backgroundImage` de `./world-editor/room-edit.util` (helper puro ya testeado en Fase 3).
- En `renderWorld()`:
  - **Zoom:** `const z = Number((this.world.map.ambient as {cameraZoom?:unknown})?.cameraZoom); cam.setZoom(Number.isFinite(z) && z > 0 ? z : 2);` (preserva el default 2).
  - **Fondo:** tras el suelo procedural, llamar `this.applyAuthoredBackground(mapW, mapH)`.
- Método `applyAuthoredBackground(mapW, mapH)`: `url = backgroundImage(this.world?.map.ambient)`; si vacío, return. Carga la textura con el loader de Phaser (cacheada por URL) y agrega `this.add.image(0,0,key).setOrigin(0,0).setDisplaySize(mapW,mapH).setDepth(1)`. El orden por *depth* garantiza que quede bajo marcadores/jugador aunque la carga sea async. Si la carga falla, no se agrega nada (suelo procedural visible).

`renderRoom()` (camino `ScenarioConfig`) **no** se toca (se jubila en Fase 5).

## 4. Manejo de errores / bordes
- Sin `cameraZoom` autorado → zoom 2 (comportamiento actual).
- Sin `backgroundImage` → suelo procedural actual.
- URL de fondo inválida/404 → `LOADERROR` de Phaser; no se agrega imagen; sin crash.
- `prefers-reduced-motion`: no afecta (zoom/fondo son estáticos).

## 5. Pruebas
- **jest:** la lógica pura (`backgroundImage`, lectura de zoom) ya está cubierta por `room-edit.util.spec.ts` (Fase 3); no hay lógica nueva testeable por unidad (el resto es Phaser).
- **ng build** verde.
- **Smoke navegador:** en un DRAFT, autorar (Fase 3) `cameraZoom` (p. ej. 3) + `backgroundImage` (un asset real) en una sala → abrir **"Vista previa"** de ese nodo → captura: se ve **más zoom** + la **imagen de fondo**.

## 6. Criterios de aceptación
- Vista previa (y juego por camino BD) aplican el zoom autorado y muestran la imagen de fondo de la sala.
- Sin valores autorados → comportamiento idéntico al actual (zoom 2, suelo procedural).
- `ng build` verde; sin tocar backend ni romper Fases 1‑3 ni el camino `ScenarioConfig`.

## 7. Cómo se procede
`writing-plans` → plan → `executing-plans` (rama `feat/case-editor-runtime-ambient`) → `verify` (build + Vista previa) → `finishing-a-development-branch` (push + PR). Puertas espaciales = Fase 5.
