# Editor de casos — Fase 3: Multi-sala (puertas + zoom + fondo)

- **Fecha:** 2026-06-05
- **Estado:** Aprobado por el usuario (control delegado, "de corrido"). Proceder a plan → build.
- **Sub-proyecto:** E (editor) · Fase 3.
- **Repos:** frontend `psicologia_proyecto/admin-panel` (Angular 21 + Konva) — la mayor parte; backend `psico_project_v2/backend_django` (2 cambios pequeños). **Sin migración de esquema. Sin cambios de runtime** (eso es Fase 4).
- **Rama:** `feat/case-editor-multiroom`, sobre `feat/case-editor-npc-paths` (Fase 2).

## 1. Contexto

La navegación multi-sala ya existe a nivel de nodo: el tab "Mundo" del `case-editor` tiene un picker (`selectedWorldNodeId` → grid de `model.nodes`) que carga `<app-world-editor [nodeId]>` para el mapa de ese nodo. **Rooms = nodos-con-mapa** (1 `scene_map` por nodo, UNIQUE). `_scene_map_definition` ya devuelve `ambient`; `_world_object` ya devuelve `metadata`.

Lo que falta (el alcance de Fase 3):
| Gap | Estado |
|---|---|
| **Puertas**: `EXIT` → sala destino + punto de entrada | ❌ `EXIT` es solo un `object_type`, sin destino |
| **Zoom de cámara por sala** | ❌ no autorable |
| **Imagen de fondo por sala** | ❌ no autorable |
| Switcher de salas dentro del editor | ⚠️ existe el picker a nivel de tab; falta uno in-editor |
| `save_world` persiste `ambient_json` | ❌ guarda width/height/spawn/theme, **no** ambient |

## 2. Objetivos / No-objetivos

**Objetivos:**
- **Puertas:** con un objeto `EXIT` seleccionado, elegir **sala destino** (de las salas del caso) y **punto de entrada (x,y)**; persistir en `object.metadata = { targetNodeKey, entryX, entryY }`. Indicador visual de puerta en el lienzo (con etiqueta del destino).
- **Sala personalizable:** **zoom de cámara** (p. ej. 0.5–3×) e **imagen de fondo** (URL/clave), persistidos en `map.ambient = { cameraZoom, backgroundImage }`. Render del fondo en el lienzo del editor.
- **Switcher de salas in-editor:** dropdown con las salas del caso para cambiar sin volver al picker.

**No-objetivos:** crear/duplicar sala con un botón único (3b; los tabs Mapas/DAG ya crean nodos+mapas); consumo en runtime (Fase 4 — que el juego cargue multi-sala desde BD y aplique zoom/fondo/transiciones); migración de esquema.

## 3. Modelo de datos (sin migración)

- **Puerta:** `MapObject.metadata_json` (TEXT JSON, ya existe; `save_world` ya lo persiste línea 1018, `_world_object` ya lo devuelve línea 1148). Forma: `{ "targetNodeKey": "<nodeKey>", "entryX": <px>, "entryY": <px> }` en objetos `EXIT`.
- **Zoom/fondo:** `SceneMap.ambient_json` (TEXT JSON, ya existe; `_scene_map_definition` ya lo devuelve línea 1121; **`save_world` NO lo persiste → cambio**). Forma: `{ "cameraZoom": <number>, "backgroundImage": "<url|key>" }`.
- **Rooms list:** nuevo en el payload de `world_editor` para poblar el selector de destino y el switcher.

## 4. Cambios de backend (Django)

Archivo `backend_django/apps/simulation/services/authoring_service.py` (+ tests):

1. **`world_editor` — exponer `rooms`.** Añadir al payload:
   ```python
   "rooms": [
       {"nodeId": mm.node_id, "nodeKey": mm.node.node_key, "mapKey": mm.map_key, "title": mm.title}
       for mm in SceneMap.objects.filter(case_version_id=case_version_id).select_related("node").order_by("id")
   ],
   ```
2. **`save_world` — persistir `ambient_json`.** En el bloque `map_def`, tras `theme`:
   ```python
   if map_def.get("ambient") is not None:
       scene_map.ambient_json = _write_map(map_def.get("ambient"))
   ```

Reglas existentes (DRAFT gate, revision 409, auditoría) sin cambios.

## 5. Cambios de frontend (Angular + Konva)

1. **Modelo** (`simulation.model.ts`): `WorldRoom { nodeId; nodeKey; mapKey; title }`; `WorldDefinition.rooms: WorldRoom[]` (aditivo, load con `?? []`).
2. **Helpers puros** `world-editor/room-edit.util.ts` (jest): `doorTarget(meta)`, `setDoorTarget(meta, nodeKey)`, `doorEntry(meta)`, `setDoorEntry(meta, x, y)`, `cameraZoom(ambient)`, `setCameraZoom(ambient, z)`, `backgroundImage(ambient)`, `setBackgroundImage(ambient, url)` — leen/escriben los `Record` de metadata/ambient de forma segura e inmutable.
3. **Store:** `readonly rooms = signal<WorldRoom[]>([])` (de `def.rooms`); `load` lo fija. Un comando `UpdateMapCommand(prevMap, nextMap)` (o reutilizar set de `editorState.map`) para zoom/fondo con undo/redo; las puertas reutilizan `UpdateInspectorCommand` (metadata).
4. **Inspector:**
   - **EXIT** seleccionado → sección "Puerta": select de sala destino (de `store.rooms()`, excluyendo la actual) + inputs Entrada X/Y → `setDoorTarget`/`setDoorEntry` en `metadata` vía `UpdateInspectorCommand`.
   - Sección "Sala" (siempre): switcher (dropdown de `store.rooms()` → `store.load(caseVersionId, nodeId)`), zoom (slider 0.5–3) y fondo (input URL) → `UpdateMapCommand` sobre `editorState.map.ambient`.
5. **Lienzo** (`renderWorld`): si `map.ambient.backgroundImage`, cargar `Konva.Image` detrás del grid (cache de imagen; fallback silencioso si falla la carga). Los objetos `EXIT` muestran un ícono de puerta + etiqueta del destino (`metadata.targetNodeKey`).

## 6. Manejo de errores / bordes

- `EXIT` sin destino → válido (puerta inerte); la UI lo marca como "sin destino".
- Imagen de fondo que no carga → se ignora (lienzo sigue usable); sin crash.
- `targetNodeKey` colgado (sala borrada) → el select muestra vacío; no rompe.
- Conflicto 409 / DRAFT gate: cubiertos por el flujo de guardado existente.
- Switch de sala con cambios sin guardar: el autosave (debounce) corre antes; si hay conflicto, el flujo 409 existente avisa.

## 7. Pruebas

- **jest** (puro): `room-edit.util.spec.ts` — door target/entry get/set, zoom set con clamp, background set, lectura segura de metadata/ambient malformados.
- **pytest** (`test_authoring.py`): `world_editor` incluye `rooms` con las claves; `save_world` persiste `ambient` (round-trip de `cameraZoom`/`backgroundImage`).
- **ng build** verde.
- **Smoke navegador**: en un DRAFT, seleccionar `EXIT` → fijar sala destino + entrada → fijar zoom + fondo de la sala → guardar → recargar (puerta + ambient persisten); cambiar de sala con el switcher.

## 8. Criterios de aceptación

- Un `EXIT` puede apuntar a una sala destino + entrada, y persiste (round-trip).
- Una sala puede tener zoom e imagen de fondo, persisten y el fondo se ve en el editor.
- El switcher cambia de sala dentro del editor.
- jest verde (helpers), pytest verde (rooms + ambient), `ng build` verde. Sin migración, sin runtime, Fases 1–2 intactas.

## 9. Cómo se procede

`writing-plans` → plan TDD → `executing-plans` (rama `feat/case-editor-multiroom` sobre Fase 2; backend en `backend_django`) → `verify` en vivo → `finishing-a-development-branch` (push + PR).
