# Spec: Rediseño HUD Simulador SIEP

**Fecha:** 2026-06-08  
**Rama de trabajo:** `feat/hud-redesign` (crear desde `feat/plan-maestro-total`)  
**Referencia visual:** `docs/interfaces/` (ver lista en `docs/NUEVO HUD PARA JUEGO.md`)

---

## Problema

La pantalla de juego muestra simultáneamente: hero/header administrativo, minimapa fijo,
panel derecho permanente (narrativa + decisión + trazabilidad + AI + recursos), dock de
herramientas vertical, diálogo inferior, bitácora flotante y canvas Phaser. El resultado es
saturado; el canvas queda aplastado (`inset: 198px 372px 124px 14px`) y el juego parece un
dashboard 2D en lugar de un simulador 2.5D.

## Objetivo

Reconstruir el layout para que el escenario jugable sea el protagonista. El HUD debe tener
estados claros. Solo un panel secundario grande a la vez.

---

## Decisiones de implementación

### Rama
Crear `feat/hud-redesign` desde `feat/plan-maestro-total`. No implementar sobre `master`.

### Estilos inline vs archivos separados
`simulation-play.component.ts` usa `template:` y `styles:` inline. **No existen**
`simulation-play.component.html` ni `simulation-play.component.scss`. La implementación
**mantiene estilos inline** para ser consistente con el resto del proyecto. La extracción a
archivos separados es una refactorización mecánica independiente fuera de scope.

---

## Tipos reales verificados

```typescript
// SimulationAttemptState.status
'IN_PROGRESS' | 'SAFE_EXITED' | 'COMPLETED'

// MapObjectState.type  (confirmado en simulation.model.ts línea 158)
'PERSON' | 'OBJECT' | 'ROUTE' | 'TOOL' | 'WARNING' | 'EXIT'

// ClinicalToolState  (simulation.model.ts línea 187)
{ code: string; label: string; icon: string; category: string; description: string; active: boolean; }

// DialogueChoiceState  (simulation.model.ts línea 212)
{ key: string; text: string; decisionOptionId: number|null; requiredToolCode: string|null;
  effect: Record<string,unknown>; isRecommended?: boolean; isProhibited?: boolean; }

// SimulationHudComponent inputs reales  (simulation-hud.component.ts línea 252-256)
attempt, stressPulse, nearbyInteractionKey, patientState, verbalTension  ← todos reales
```

---

## Layout principal

### CSS Grid (inline styles en `simulation-play.component.ts`)

```
game-container  (position: fixed; display: grid; grid-template-rows: auto 1fr auto)
  ├── Row 1: top-bar       → SimulationHudComponent
  ├── Row 2: canvas-zone   → GameWorldComponent + (panel derecho condicional)
  └── Row 3: bottom-zone   → [safe-exit] [tool-dock] [context-bar]
```

**Altura top bar:**

| Breakpoint   | height                      |
|--------------|-----------------------------|
| Desktop      | `clamp(72px, 8vh, 104px)`   |
| Tablet ≤1024 | `clamp(64px, 7vh, 88px)`    |
| Mobile ≤760  | `clamp(56px, 9vh, 72px)`    |

`canvas-zone`: `flex: 1 / min-height: 0` — ocupa todo el espacio restante.  
`bottom-zone`: `height: auto` — se ajusta al contenido del dock.

### Canvas-zone: columnas condicionales

```css
/* explore / journal / outcome */
.canvas-zone { display: grid; grid-template-columns: 1fr; }

/* dialogue-right  →  [attr.data-mode="dialogue-right"] en game-container */
[data-mode="dialogue-right"] .canvas-zone {
  grid-template-columns: 1fr clamp(340px, 28vw, 480px);
  transition: grid-template-columns 220ms ease;
}

/* mobile ≤760px: nunca columna lateral */
@media (max-width: 760px) {
  [data-mode="dialogue-right"] .canvas-zone { grid-template-columns: 1fr; }
}
```

**Mobile (≤760px):** el panel derecho se convierte en bottom sheet
(`position: fixed; bottom: 0; inset-inline: 0; height: 65vh; z-index: 60`).

---

## `viewMode` computed

```typescript
type ViewMode = 'explore' | 'dialogue-right' | 'dialogue-cinematic' | 'journal' | 'outcome';

readonly viewMode = computed<ViewMode>(() => {
  const att = this.attempt();
  // null = cargando / error → explore (los overlays de loading/error se renderizan por separado)
  if (!att) return 'explore';
  // outcome solo con status real completado/abandonado
  if (att.status === 'COMPLETED' || att.status === 'SAFE_EXITED') return 'outcome';
  // journal tiene prioridad sobre diálogo activo
  if (this.journalOpen()) return 'journal';
  const dlg = this.dialogue();
  if (dlg) {
    const hasChoices = (dlg.choices?.length ?? 0) > 0;
    const isPerson   = this.selectedInteraction()?.type === 'PERSON'; // tipo real del modelo
    return (hasChoices && isPerson) ? 'dialogue-right' : 'dialogue-cinematic';
  }
  return 'explore';
});
```

### Señales adicionales nuevas

```typescript
readonly aiAssistantOpen = signal(false);
readonly socialMapOpen   = signal(false);
```

---

## DOM: qué desaparece

| Elemento actual                        | Acción                                          |
|----------------------------------------|-------------------------------------------------|
| `.simulator-hero` (big header)         | Eliminar — contenido absorbido por HudComponent |
| `.support-panel` (panel perm. derecho) | Eliminar — contenido redistribuido              |
| `app-minimap.minimap-layer`            | Eliminar de layout fijo (ver nota minimap)      |
| `.controls-hint`                       | Eliminar — redundante                           |
| `.journal-toggle` (botón flotante)     | Eliminar → botón en top bar                     |
| `.safe-exit-btn` (botón absoluto suelto)| Eliminar → bloque en `bottom-zone`             |
| `app-ai-assistant` permanente          | Eliminar del layout → overlay desde top bar     |
| Import de `MinimapComponent`           | Eliminar si minimap no se conserva como overlay |

**Nota minimap:** si se elimina del layout fijo sin crear overlay funcional, se elimina
también el botón de top bar correspondiente para no dejar UX muerta.

## Contenido redistribuido

| Contenido anterior           | Nuevo destino                                 |
|------------------------------|-----------------------------------------------|
| Narrativa + título nodo      | `DialoguePanelComponent` modo `side-panel`    |
| Advertencia ética            | Badge en `DialoguePanelComponent` Estado B    |
| Panel de decisión            | `DialoguePanelComponent` Estado B             |
| Bitácora / trazabilidad      | `JournalPanelComponent` (inputs nuevos)       |
| Recursos de apoyo            | `JournalPanelComponent` (section nueva)       |
| AI assistant                 | Overlay desde botón top bar                   |
| Social map                   | Overlay desde botón top bar                   |

---

## Cambios por componente

### `SimulationPlayComponent`

**Responsabilidad:** orquestador de layout y estado. No renderiza lógica de juego.

**Únicos cambios en TypeScript:**

```typescript
// Añadir import
import { getSceneObjective } from './scene-objectives.config';

// Señales nuevas
readonly aiAssistantOpen = signal(false);
readonly socialMapOpen   = signal(false);

// Computeds nuevos
readonly viewMode = computed<ViewMode>(() => { /* ver arriba */ });

// sceneObjective mueve de HudComponent al padre para usarse en objective-card
readonly sceneObjective = computed(() =>
  getSceneObjective(this.attempt()?.currentNode.key) ?? null);

// contextTip reutiliza sceneObjective
readonly contextTip = computed(() => this.sceneObjective());

// selectedToolCode: activo SOLO mientras haya diálogo abierto
// evita que el tool quede marcado después de cerrar el feedback
readonly selectedToolCode = computed(() =>
  this.dialogue() ? (this.selectedInteraction()?.toolCode ?? null) : null);
```

**Todos los métodos y señales existentes se mantienen sin cambio.**

**Template — estructura esquemática** (inline en el componente):

```html
<div class="game-container" [attr.data-mode]="viewMode()">

  <!-- Overlays globales existentes: loading, error, resume, scene-fade, vignette -->

  @if (attempt(); as game) {

    <!-- FILA 1: barra superior -->
    <app-simulation-hud
      class="top-bar"
      [attempt]="game"
      [stressPulse]="stressPulse()"
      [nearbyInteractionKey]="nearbyInteraction()?.key ?? null"
      [verbalTension]="verbalTension()"
      (openJournal)="journalOpen.set(true)"
      (openAI)="aiAssistantOpen.set(true)"
      (openSocialMap)="socialMapOpen.set(true)" />

    <!-- FILA 2: zona del canvas -->
    <div class="canvas-zone">

      <app-game-world
        #gameWorld id="game-area"
        [world]="world()"
        [nearbyInteraction]="nearbyInteraction()"
        [selectedInteractionKey]="selectedInteraction()?.key ?? null"
        (proximity)="nearbyInteraction.set($event)"
        (interact)="openInteraction($event)"
        (positionChange)="rememberPosition($event.x, $event.y)" />

      <!-- Tarjeta de objetivo flotante sobre canvas -->
      @if (sceneObjective(); as obj) {
        <div class="objective-card" role="status" aria-live="polite">
          <span class="obj-kicker">OBJETIVO ACTUAL</span>
          <p class="obj-text">{{ obj }}</p>
        </div>
      }

      <!-- Panel derecho: SOLO en Estado B, sin markup muerto en otros estados -->
      @if (viewMode() === 'dialogue-right') {
        <app-dialogue-panel
          class="right-panel"
          mode="side-panel"
          [dialogue]="dialogue()"
          [interaction]="selectedInteraction()"
          (close)="closeDialogue()"
          (execute)="executeDecision($event)"
          (useTool)="useTool($event)"
          (frontendChoice)="handleFrontendChoice($event)" />
      }

    </div>

    <!-- FILA 3: zona inferior -->
    <div class="bottom-zone">

      <!-- Salida segura: bloque separado izquierda, fuera del scroll del dock -->
      @if (game.status === 'IN_PROGRESS') {
        <button class="safe-exit" type="button"
          aria-label="Salida segura (Escape)"
          (click)="safeExit()" [disabled]="busy()">
          <mat-icon aria-hidden="true">exit_to_app</mat-icon>
          <span class="safe-exit__label">SALIDA SEGURA</span>
          <span class="safe-exit__sub">Finalizar simulación</span>
        </button>
      }

      <app-tool-inventory
        class="tool-dock"
        [tools]="world()?.tools ?? []"
        [inventory]="world()?.inventory ?? []"
        [selectedToolCode]="selectedToolCode()"
        (select)="selectTool($event)" />

      <div class="context-bar" aria-label="Contexto de la simulación">
        <span>{{ currentStageLabel() }}</span>
        <span class="ctx-sep" aria-hidden="true">|</span>
        <span>{{ game.currentNode.title }}</span>
        @if (contextTip(); as tip) {
          <span class="ctx-sep" aria-hidden="true">|</span>
          <span class="ctx-tip">{{ tip }}</span>
        }
      </div>

    </div>

    <!-- Proximity hint (sin cambios) -->
    @if (nearbyInteraction(); as nb) { ... }

    <!-- Diálogo cinematográfico (Estado C) — fuera del canvas-zone -->
    @if (viewMode() === 'dialogue-cinematic') {
      <app-dialogue-panel
        class="dialogue-cinematic-layer"
        mode="cinematic"
        [dialogue]="dialogue()"
        [interaction]="selectedInteraction()"
        (close)="closeDialogue()"
        (execute)="executeDecision($event)"
        (useTool)="useTool($event)"
        (frontendChoice)="handleFrontendChoice($event)" />
    }

    <!-- Journal overlay — se renderiza siempre; gestiona visibilidad internamente -->
    <app-journal-panel
      [open]="journalOpen()"
      [disabled]="game.status !== 'IN_PROGRESS' || busy()"
      [message]="journalMessage()"
      [saveState]="journalSaveState()"
      [visitedStages]="visitedStageLabels()"
      [supportResources]="supportResources()"
      (save)="saveReflection($event)"
      (closeSheet)="journalOpen.set(false)" />

    <!-- Outcome: solo cuando viewMode es outcome, para no interferir con journal/dialogue -->
    @if (viewMode() === 'outcome') {
      <app-attempt-outcome
        [report]="game.completionReport"
        [status]="game.status"
        (retry)="startNewAttempt()" />
    }

    <!-- AI assistant overlay -->
    @if (aiAssistantOpen()) {
      <div class="ai-overlay" role="dialog" aria-label="Asistente IA">
        <button class="overlay-close" type="button" aria-label="Cerrar asistente"
          (click)="aiAssistantOpen.set(false)">
          <mat-icon>close</mat-icon>
        </button>
        <app-ai-assistant
          [attemptId]="game.attemptId"
          [currentNodeId]="game.currentNode.key"
          [decisionAlreadyTaken]="game.status !== 'IN_PROGRESS'" />
      </div>
    }

    <!-- Social map overlay -->
    @if (socialMapOpen()) {
      <div class="social-overlay" role="dialog" aria-label="Mapa social">
        <button class="overlay-close" type="button" aria-label="Cerrar mapa social"
          (click)="socialMapOpen.set(false)">
          <mat-icon>close</mat-icon>
        </button>
        <app-social-map
          [nodes]="socialMapService.nodes()"
          [edges]="socialMapService.edges()" />
      </div>
    }

    <!-- Accessibility: sr-narrative-route y sr-only interaction list (sin cambios) -->
    <!-- scene-fade (sin cambios) -->

  }
</div>
```

---

### `SimulationHudComponent`

**Responsabilidad:** barra superior. Solo lectura de estado; emite eventos.

**Inputs — sin cambios** (todos son reales y ya existen):
`attempt`, `stressPulse`, `nearbyInteractionKey`, `patientState`, `verbalTension`

**Outputs nuevos:**
```typescript
readonly openJournal   = output<void>();
readonly openAI        = output<void>();
readonly openSocialMap = output<void>();
```

**Cambios en template:**
1. Eliminar `.hud-social-panel` completo (fila del social map — se mueve a overlay)
2. Expandir `.hud-strip` a `min-height: clamp(72px, 8vh, 104px)`
3. Añadir zona centro-izquierda: `game.caseTitle` en negrita + etapa (`sceneProgress`)
4. Añadir métricas compactas como bloques visuales: progreso (bloques violetas + %), estrés (bloques naranja/rojo + %), puntaje (⭐ + pts)
5. Añadir 3 botones icono a la derecha: libro (journal), red (social map), robot (AI)
6. Eliminar `.hud-objective-line` (se mueve al `objective-card` en canvas-zone del padre)

**El `sceneObjective()` computed se elimina de `SimulationHudComponent`** porque el padre ahora
lo computa directamente. Si el HudComponent lo necesitara, lo recibiría como input.

---

### `ToolInventoryComponent`

**Responsabilidad:** dock horizontal de herramientas psicopedagógicas.

**Input nuevo:**
```typescript
readonly selectedToolCode = input<string | null>(null);
```

**Cambios en template y estilos:**
- `.tool-hud`: `flex-direction: row; overflow-x: auto; scroll-snap-type: x mandatory; gap: 10px`
- Cada botón amplía su contenido: icono grande (28px) + `tool.label` + `tool.description`
  truncada (~40 chars) + número de atajo + borde violeta + glow cuando `tool.code === selectedToolCode()`
- Mobile: `scroll-snap-align: start` por botón → carrusel natural

**Contrato sin cambios:** `tools`, `inventory` (inputs), `select` (output).

---

### `DialoguePanelComponent`

**Responsabilidad:** diálogo en dos modos mutuamente excluyentes.

**Input nuevo:**
```typescript
readonly mode = input<'cinematic' | 'side-panel'>('cinematic');
```

**Modo `cinematic` (Estado C, default):**  
Layout actual casi sin cambios — strip inferior ancho, portrait izquierda, texto centro,
opciones derecha. Referencia visual: `docs/interfaces/interfaz_dialogos.png`.

**Modo `side-panel` (Estado B):**  
Panel columnar derecho con:
- Nombre + rol del NPC (desde `dialogue().speakerName`)
- Retrato pixel (portrait existente del componente)
- Texto NPC con typing animation existente
- Opciones como tarjetas verticales según `DialogueChoiceState`:
  - `isRecommended === true` → borde violeta + fondo violeta suave
  - `isProhibited === true` → borde rojo/naranja + fondo rojo suave
  - Sin flag → neutral (gris/blanco)
  - Colores dorado/azul por categoría son aspiracionales (requieren extensión del modelo)

El padre usa dos instancias `@if` separadas; el componente nunca renderiza dos modos a la vez.

---

### `JournalPanelComponent`

**Responsabilidad:** overlay modal centrado del diario de reflexión.

**Inputs nuevos:**
```typescript
readonly visitedStages    = input<string[]>([]);
readonly supportResources = input<string[]>([]);
```

**Cambio estructural (inline styles):**  
De `position: absolute; right: 0; width: min(400px, 88vw)`  
→ `position: fixed; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.72)`

Panel interno: `max-width: 720px; width: 92vw; max-height: 88vh; overflow-y: auto`

Al cerrarse durante un diálogo activo, el `viewMode` computed retoma automáticamente
`dialogue-right` o `dialogue-cinematic` porque `journalOpen` vuelve a `false`.

**Secciones nuevas en el panel:**
- Bitácora/trazabilidad (`visitedStages`)
- Recursos de apoyo (`supportResources`)
- Botón `CONTINUAR SIMULACIÓN` (llama `closeSheet.emit()`)

---

### `AttemptOutcomeComponent`

**Cambio:** se renderiza solo dentro de `@if (viewMode() === 'outcome')` en el padre.
Internamente ya se autooculta, pero el condicional exterior evita interferencia con journal
y diálogo cuando el intento todavía está `IN_PROGRESS`.

**Ajuste visual:** actualizar estilos para panel central con título `SIMULACIÓN COMPLETADA`,
métricas finales, retroalimentación y botones `VER RETROALIMENTACIÓN` / `REINTENTAR CASO` /
`VOLVER AL PORTAL`.

---

## Verificación requerida

```bash
npm run build            # debe pasar sin errores
# levantar servidor de desarrollo
# abrir navegador y verificar consola (0 errores, 0 assets 404)
```

**Capturas en `docs/audit-hud-redesign-2026-06-08/`:**

| Archivo                        | Estado validado                                          |
|--------------------------------|----------------------------------------------------------|
| `desktop-explore.png`          | Estado A: canvas dominante, top bar, dock, sin panel der |
| `desktop-dialogue-right.png`   | Estado B: panel lateral activo, canvas comprimido        |
| `desktop-dialogue-cinematic.png`| Estado C: strip inferior, escenario detrás             |
| `desktop-journal.png`          | Estado D: modal centrado, fondo oscurecido               |
| `desktop-outcome.png`          | Estado E: overlay de resultado                           |
| `mobile-explore.png`           | Canvas dominante 375px, dock horizontal scrollable       |
| `mobile-dialogue.png`          | Bottom sheet diálogo, sin columna lateral                |

---

## Criterios de aceptación

1. Exploración normal → top bar, canvas amplio, objetivo flotante, dock inferior, salida segura.
2. Canvas dominante; no aplastado por paneles.
3. Panel derecho solo en diálogo/decisión con NPC + opciones.
4. Diálogo cinematográfico sin chocar con dock.
5. Diario como overlay modal centrado.
6. Resultado como overlay modal; no interfiere con journal ni diálogo.
7. Mobile: sin textos cortados, sin solapamientos, sin botones inaccesibles.
8. Herramientas con icono + nombre + descripción + estado activo visual.
9. Progreso, estrés y puntaje como bloques compactos en top bar.
10. Salida segura: visible, funcional, separada del dock.
11. Sin errores 404 de assets ni errores de consola.
12. `npm run build` pasa.
13. Capturas reales desktop y mobile entregadas en `docs/audit-hud-redesign-2026-06-08/`.
