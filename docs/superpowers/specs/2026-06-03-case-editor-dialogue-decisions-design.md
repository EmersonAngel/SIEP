# Editor de casos — Fase 1: Diálogos + decisiones inline

- **Fecha:** 2026-06-03
- **Estado:** Diseño (pendiente de revisión del usuario antes de `writing-plans`).
- **Sub-proyecto:** E (editor) · primera fase de "Completar y unificar el editor de casos".
- **Repos:** frontend `psicologia_proyecto/admin-panel` (Angular 21 + Konva) — la mayor parte; backend `psico_project_v2/backend_django` (Django + DRF) — persistencia. **Spring (`psicologia_proyecto/backend`) queda intacto** (respaldo; decisión del usuario: "solo Django").
- **Backend objetivo:** Django (`:8091`). El Angular corre con el proxy apuntando a Django.

## 1. Contexto y motivación

El editor de casos ya existe y es robusto: editor visual Konva (pestaña "Mundo") con grid/zoom/pan/snap, colocar/mover/redimensionar objetos y zonas, spawn, inspector, undo/redo, autosave con *optimistic lock* y validación. El DAG (grafo de decisiones) tiene su propio editor SVG. El modelo de datos soporta diálogos con líneas y opciones de respuesta, y las opciones ya pueden enlazar a aristas del DAG.

**El hueco:** no hay forma de **autorar diálogos** desde la aplicación. En concreto:

| Etapa | Estado actual |
|---|---|
| **Cargar** diálogos en el editor | ✅ `world_editor()` ya devuelve `dialogues[]` con `lines[]` y `choices[]` (incluido `decisionOptionId`) — `authoring_service.py:1164`. |
| **Editar** diálogos | ❌ No existe UI. El `EditorState` del store solo rastrea `map`/`objects`/`collisionZones`. Los diálogos se cargan en `definition.dialogues` y se preservan tal cual. |
| **Guardar** diálogos | ❌ `save_world()` (`authoring_service.py:959`) solo hace upsert de `map` y `objects`; **ignora** `dialogues` del request. |
| **Choices (opciones de respuesta)** | ❌ Ni `save_world` ni los endpoints granulares `create/update_dialogue` persisten choices (solo el clonado de versión las copia). |
| **Decisiones salientes del nodo** (para cablear cada respuesta) | ❌ No están en el payload del editor. |
| **Jugar** un diálogo con choices | ✅ El runtime ya renderiza choices y dispara la decisión enlazada. |

Esta fase cierra ese hueco: **autorar, en el lienzo, qué dice un NPC y las opciones de respuesta del estudiante, cableando cada opción a una rama existente del DAG.** Realiza el corazón de la visión del usuario: *"ponerles que dirán, las opciones de respuesta… y un mapa de decisiones donde si uno decide algo el mapa se irá por esa respuesta, desembocando en algo distinto."*

## 2. Objetivos / No-objetivos

**Objetivos (Fase 1):**
- Seleccionar un objeto/persona en el lienzo Konva y editar su **árbol de diálogo**: `speakerName`, `portraitKey`, `emotion`.
- Editar las **líneas** que dice el NPC (texto + emoción), reordenables.
- Editar las **opciones de respuesta** del estudiante (choices): texto, herramienta requerida (opcional), `effect` (opcional), marcas UI *recomendada/prohibida*.
- **Cablear** cada opción a una `DecisionOption` saliente del nodo de este mapa (selector con destino + clasificación + si es prohibida).
- Persistir todo (árbol + líneas + choices) a través del **guardado bulk existente** (`save_world`), respetando el *optimistic lock* por `revision` y el gate `DRAFT`.
- Crear y **eliminar** diálogos, líneas y choices.

**No-objetivos (otras fases / sub-proyectos):**
- Crear nodos o aristas nuevas del DAG → ya es la pestaña "Grafo DAG". La Fase 1 solo **conecta** una respuesta a una decisión existente.
- Paths de movimiento de NPC → Fase 2.
- Multi-sala / puertas / zoom-por-sala / fondo → Fase 3.
- Texto-como-síntoma expresivo (velocidad/color/glitch), microexpresiones, QTE de interrupción → sub-proyecto F.
- Tocar el backend Spring (respaldo).

## 3. Modelo de datos y contrato (ya existente, sin migración)

Tablas V6 implicadas (sin cambios de esquema): `dialogue_trees`, `dialogue_lines`, `dialogue_choices`.

- `DialogueChoice`: `id, dialogue_tree_id, choice_key, text, decision_option_id (→ decision_options), required_tool_code, effect_json, display_order`.
- Tipos frontend ya presentes en `simulation.model.ts`: `WorldDialogueTree`, `WorldDialogueLine`, `WorldDialogueChoice`, y `WorldSaveRequest.dialogues`.

**Semántica del cableado (el corazón):** una `choice` con `decisionOptionId` significa que, al elegirla en el juego, se dispara esa `DecisionOption` del DAG → el motor avanza al nodo destino → se carga su escena. Por eso "si decides X el mapa se va por esa respuesta y desemboca en algo distinto" **no requiere lógica nueva de runtime**: emerge del motor DAG existente. La Fase 1 solo permite **autorar** ese enlace.

**Adición aditiva al contrato (no rompe payloads viejos):**
- `WorldDialogueTree.mapObjectKey?: string` — clave estable del objeto dueño del diálogo, usada al guardar para resolver el dueño aunque el objeto sea nuevo (id local aún sin asignar). El backend resuelve `object_key → MapObject` tras hacer upsert de objetos.
- `WorldDefinition.availableDecisions: WorldOutgoingDecision[]` — decisiones salientes del nodo de este mapa, para poblar el selector. Forma: `{ id, optionKey, text, classification, targetNodeKey, prohibitedConduct }`.

## 4. Cambios de backend (Django)

Archivo: `backend_django/apps/simulation/services/authoring_service.py` (+ tests).

1. **`save_world` — persistir diálogos.** Tras el bucle de `objects`, procesar `request.get("dialogues")` con **reconciliación** (no solo upsert) acotada al `scene_map` actual:
   - Construir índice `object_key → MapObject` (objetos ya upserteados) para resolver `mapObjectKey`/`mapObjectId`.
   - Upsert de cada `DialogueTree` (por `id` si viene; si no, crear) con `scene_map`, `map_object` (resuelto), `tree_key`, `speaker_name`, `portrait_key`, `emotion`.
   - **Líneas:** borrar las del árbol y recrearlas desde `lines[]` (mismo patrón que `update_dialogue`).
   - **Choices:** borrar las del árbol y recrearlas desde `choices[]`, incluyendo `choice_key`, `text`, `decision_option_id` (validado: la decisión debe pertenecer a la versión; si no, dejar `null`), `required_tool_code`, `effect_json`, `display_order`.
   - **Eliminación:** árboles presentes en BD para este `scene_map` pero ausentes del request → `delete()`. Esto permite borrar un diálogo desde el editor.
   - Extraer un helper `_save_dialogue_choices(tree, choices)` (espejo de `_save_dialogue_lines`).
2. **`world_editor` — exponer decisiones salientes.** Añadir al payload `availableDecisions`: `DecisionOption.objects.filter(source_node_id=scene_map.node_id)` mapeadas a `{id, optionKey, text, classification, targetNodeKey, prohibitedConduct}` (join al `SimulationNode` destino para `targetNodeKey`).
3. **Validación (opcional, *warning* no bloqueante).** En `world_validation`: una `choice` sin `decision_option_id` ni `effect` con contenido → `WARNING` "respuesta sin destino ni efecto". No impide publicar.

**Regla del proyecto:** todo pasa por `_ensure_draft` (rechaza mutaciones en versiones no-`DRAFT`) y por el chequeo de `revision` (409 en conflicto), que `save_world` ya aplica. La auditoría por *signals* sigue cubriendo `save_world`.

## 5. Cambios de frontend (Angular + Konva)

Repo `psicologia_proyecto/admin-panel`.

1. **Estado** (`world-editor.store.ts`): `EditorState` gana `dialogues: WorldDialogueTree[]`. `load()` lo inicializa desde `def.dialogues`; `executeSave()` deja de "preservar" y envía `state.dialogues`. El store guarda también `availableDecisions` (de la definición) para el selector.
2. **Comandos** (granularidad de árbol, para undo/redo coherente y pocas clases):
   - `UpsertDialogueCommand(objectKey, prevTree | null, nextTree)` — crear o reemplazar el árbol de un objeto.
   - `DeleteDialogueCommand(objectKey, prevTree)`.
   - La edición de líneas/choices se hace sobre una copia de trabajo del árbol y se confirma con `UpsertDialogueCommand` (igual filosofía que `UpdateInspectorCommand`).
3. **UI — sección "Diálogo" en el inspector derecho** (sin modal nuevo, misma estética *liquid-glass*): visible cuando hay un objeto seleccionado.
   - Si el objeto no tiene diálogo: botón **"Agregar diálogo"** (crea árbol vacío con `mapObjectKey` = clave del objeto).
   - Cabecera: `speakerName`, `portraitKey`, `emotion`.
   - **Líneas:** lista editable (texto + emoción), añadir/eliminar/reordenar.
   - **Opciones de respuesta:** lista editable; por cada una: `text`, selector **"Lleva a →"** poblado con `availableDecisions` (muestra destino + clasificación, resalta prohibidas), `requiredToolCode` (opcional), toggles *recomendada/prohibida*.
   - Marcador visual en el lienzo: los objetos con diálogo muestran un pequeño ícono (p. ej. `chat_bubble`) para distinguirlos.
4. **Servicio/modelo:** `simulation.model.ts` añade `mapObjectKey?` y `availableDecisions`/`WorldOutgoingDecision`; `simulation.service.ts` no cambia (el contrato de `saveWorld`/`worldEditor` ya transporta `dialogues`).

## 6. Runtime (sin cambios funcionales; solo verificación)

El panel de diálogo del estudiante ya renderiza choices y, al elegir una con `decisionOptionId`, prepara/dispara esa decisión (vía `InteractionResult`). La Fase 1 **no** modifica el runtime. La verificación E2E confirma que un diálogo autorado se juega y ramifica.

## 7. Flujo de datos (extremo a extremo)

```
Autor: clic en NPC → edita líneas/opciones → "Lleva a" decisión D
   → store (EditorState.dialogues) → debounce → PUT /world (WorldSaveRequest.dialogues)
   → save_world: upsert trees/lines/choices (+ reconciliación) → 200 + WorldDefinition
Estudiante: interactúa con el NPC → ve líneas + opciones → elige opción
   → dispara DecisionOption D → motor DAG avanza al nodo destino → carga su escena
```

## 8. Manejo de errores

- **Conflicto de edición (409):** ya cubierto por el store (`conflictDetected` + "Recargar"); aplica igual a diálogos.
- **`decisionOptionId` colgado** (decisión borrada en el DAG mientras se editaba): el backend valida pertenencia a la versión y guarda `null`; la UI marca la opción como "sin destino" (warning de validación).
- **Diálogo en objeto nuevo sin id:** resuelto por `mapObjectKey` (backend resuelve tras upsert de objetos).
- **Versión no-DRAFT:** `_ensure_draft` rechaza; la UI ya deshabilita edición en publicadas (flujo clonar-versión existente).

## 9. Estrategia de pruebas (TDD)

- **Backend (`pytest`, `apps/simulation/tests/test_authoring.py`):**
  - `save_world` crea árbol con líneas + choices (incl. `decisionOptionId`) y se releen vía `world_editor`.
  - Actualizar reemplaza líneas/choices; quitar una choice la elimina; quitar un árbol lo elimina.
  - `decisionOptionId` de otra versión → se guarda `null`.
  - Conflicto de `revision` → 409.
  - `world_editor` incluye `availableDecisions` con destino y clasificación.
- **Frontend (`jest`):**
  - `load()` puebla `EditorState.dialogues` y `availableDecisions`.
  - `UpsertDialogueCommand`/`DeleteDialogueCommand` + undo/redo.
  - El body de guardado incluye los diálogos editados (no los originales).
- **E2E (`playwright`, requiere Django `:8091` + Angular):**
  - Admin autora un diálogo con una opción cableada a una decisión; guarda.
  - Estudiante juega el caso, interactúa con el NPC, elige esa opción y el intento avanza al nodo destino esperado.

## 10. Criterios de aceptación (Definition of Done)

- Un autor puede, desde el lienzo, crear/editar/eliminar el diálogo de un objeto: líneas y opciones de respuesta.
- Cada opción puede cablearse a una decisión saliente del nodo; el cableado persiste y se relee.
- El guardado usa el flujo bulk existente (debounce + `revision`), sin endpoints nuevos.
- Un diálogo autorado se **juega** y **ramifica** correctamente (E2E verde).
- Suite verde: `pytest` (backend), `jest` + `ng build` (frontend); `python manage.py check` sin errores.
- Spring no se toca (`git status` limpio en `psicologia_proyecto/backend`).

## 11. Riesgos y observaciones

- **Limitación preexistente (fuera de alcance):** `save_world` tampoco elimina **objetos** ausentes del payload (solo upsert) — borrar un objeto en el editor podría no persistir al recargar. La Fase 1 implementa reconciliación-con-borrado **para diálogos**; conviene un follow-up para aplicar el mismo patrón a objetos/zonas.
- **Paridad Django↔Spring:** queda divergente a propósito (decisión del usuario). Si más adelante se retoma Spring, replicar `save_world`/`world_editor`.
- **Reordenamiento:** se persiste vía `display_order`; el reordenado en UI es *nice-to-have* (mínimo viable: orden por inserción).

## 12. Cómo se procede

Tras la aprobación del usuario a este spec: `writing-plans` → plan TDD por tareas pequeñas → `executing-plans` (rama propia en el frontend; cambios de backend en `backend_django`) → `verify` en vivo (Django `:8091` + Angular) → `finishing-a-development-branch`.
