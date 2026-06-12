# Flujo Competitivo + NPCs Modulares Vivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el MVP en una vertical slice competitiva: caso jugable de 6 etapas con camino ideal, errores con consecuencias visibles, NPCs con el avatar modular del jugador, movimiento clínico por zonas, puertas entre salas vía `enterRoom`, y reporte final con línea de tiempo.

**Architecture:** Se respeta la frontera existente: `SceneRenderer` pinta arte; `GameWorldComponent` (escena Phaser) coordina actores/input/movimiento; `SimulationPlayComponent` maneja estado/decisiones/API; Django es autoridad de intento y mundo; los JSON de escenario configuran NPCs/visual. Los NPCs reutilizan la composición por capas del avatar (`phaser-avatar-renderer`) con texturas/animaciones por preset que no pisan las del jugador. El movimiento NPC son helpers puros nuevos en `scene-motion.util.ts`. Las puertas usan el endpoint `enter-room` existente con objetos EXIT sembrados por un management command idempotente.

**Tech Stack:** Angular 21 standalone + signals, Phaser 3, Jest (jsdom — ojo: `import type Phaser` en helpers puros), Django/DRF + pytest contra BD Postgres seedeada (docker, puerto 5433).

---

## Contexto verificado (2026-06-11) — NO re-derivar

- **Caso BD** (`SIM-VBG-001`, caseVersionId 1, Flyway seed): 6 nodos = 6 etapas: `urgencias-crisis`(start) → `ruta-proteccion` → `informe-integral` → `valoracion-comisaria` → `proteccion-nna` → `cierre-seguimiento`(terminal). Mapas 960×540, spawn (145,430), `ambient_json = {"music":"none","mood":"calm-institutional"}`.
- **Decisiones v1** (id | clasificación | prohibida): urgencias: 1 RISKY (llamar Policía), 2 INADEQUATE (cuestionario), 3 ADEQUATE (PAP). ruta: 4 RISKY, **5 INADEQUATE prohibida (contactar agresor)**, 6 ADEQUATE. informe: 7 INADEQUATE, 8 ADEQUATE. valoración: **9 INADEQUATE prohibida (citar agresor)**, 10 ADEQUATE. nna: 11 INADEQUATE, 12 ADEQUATE. → ya existen ≥3 errores recuperables y 2 graves; NO hay que tocar el DAG.
- **Herramientas BD** (tool_code MAYÚSCULAS): `PAP`, `SPIKES`, `RISK_METER`, `SAFETY_ROUTE`, `REFLECTION_JOURNAL`. `usedToolKeys` guarda `'PAP'` o `'PAP@target'`.
- **Objetos urgencias v1**: `aviso-policial`(WARNING,dec 1), `cuestionario-prematuro`(OBJECT,dec 2), `escucha-segura`(PERSON,dec 3 — la consultante), `tool-pap`, `tool-bitacora`. Objetos ruta v1: `psiquiatria-aislada`(dec 4), `mediacion-prohibida`(dec 5), `ruta-vbg`(dec 6), `tool-ruta`, `tool-riesgo`. **No hay objetos EXIT en v1.**
- **Diálogos BD**: `tree_key` = `object_key`; cada árbol de decisión tiene UNA choice `execute` con su `decisionOptionId` (texto "Preparar esta intervencion"). El jugador decide eligiendo CON QUÉ objeto comprometerse.
- **Gaps de cableado en `simulation-play.component.ts`** (el template de `app-game-world` y `app-simulation-hud`): NO están conectados `(roomExit)`, `(enterRoom)`, `[patientState]`, `[guide]`. `updatePatientVisualState` nunca se llama. El nudge usa salto fijo de 34px sin contrato.
- **`checkDbDoorTriggers` retorna temprano cuando hay `scenarioConfig`** — todos los nodos tienen JSON de escenario, así que las puertas BD hoy son inalcanzables; el plan las dispara con E desde `openInteraction`.
- **`positionAuthoredClinicalNpcs` remapea NPCs por índice a solo 2 posiciones** (`AUTHORED_NPC_POSITIONS`) — se elimina en Task 5 (los JSON traerán coords de la sala autoría).
- **Sala autoría**: 960×528, caminable x∈[96,864] y∈[240,486] menos muebles (`AUTHORED_CLINICAL_COLLISIONS`): escritorio {365,262,270,80}, sofá {121,288,138,70}, mesa {254,353,92,44}, plantas {796,366,48,44} y {92,372,48,44}. Spawn jugador (480,420). Markers remapeados vía `AUTHORED_MARKER_POSITIONS`.
- **Backend tests**: pytest contra la BD seedeada real (rollback por test); fixtures `estudiante`/`case_version_id`/`cl` por archivo de test (ver `tests/test_world.py:13-40`). El comando del prompt maestro es `manage.py test apps.simulation`; si falla por permisos de CREATE DATABASE usar `./.venv/Scripts/python.exe -m pytest apps/simulation` (equivalente aceptado).
- **Dev servers**: Django `./.venv/Scripts/python.exe manage.py runserver 8091` (BD docker arriba), Angular `npm start -- --host 127.0.0.1 --port 4201` (sin `--host` bindea solo ::1 y Playwright falla). Login demo: `estudiante@psychosim.edu.co`/`Estudiante123!`. La BD dev tiene residuos de tests (versiones duplicadas) — siempre filtrar por `case_version_id`.
- **Avatar modular**: hoja 192×288, 9 frames 64×96 (fila 0 down / 1 side-mira-IZQUIERDA / 2 up), pies del arte en y≈90 del frame ⇒ centro→pies = `42*scale` px. Idle frames {down:1, side:4, up:7}. Capas: hairBack→body→face→hairFront (espalda: body primero). Variantes reales: short_black, long_brown, tied_brown, red, none. Caras: neutral/calm/worried (mouth neutra/sonrisa/seria).

## File Structure (nuevos / modificados)

```
frontend/src/app/features/simulator/
  player-motion.util.ts            (mod: computeNudgeStep)        + spec
  npc-avatar-presets.ts            (NUEVO: presets + render hints) + spec NUEVO
  phaser-avatar-renderer.ts        (mod: texturas/anims con nombre) + spec
  scene-motion.util.ts             (mod: helpers de zona/behavior) + spec
  game-world.component.ts          (mod: nudge, NPCs modulares, movers, motionPaused, puertas, spawn)
  simulation-play.component.ts     (mod: patientState, evidencia, puertas, wiring outputs)
  evidence-gating.config.ts        (NUEVO: evidencia por nodo)     + spec NUEVO
  patient-state.util.ts            (NUEVO: estado paciente + reglas) + spec NUEVO
  scenario-npc-configs.spec.ts     (NUEVO: valida los JSON de escenario)
  dialogue-panel.component.ts      (mod: chip evidencia)
  attempt-outcome.component.ts     (mod: timeline + consecuencias) + spec
  authored-clinical-room.util.ts   (mod: posiciones puertas; borra AUTHORED_NPC_POSITIONS)
  scene-objectives.config.ts       (mod: objetivos faltantes)
frontend/src/app/core/models/simulation.model.ts  (mod: contrato NPC + timeline + evidenceWarning)
frontend/src/app/core/api/simulation.service.ts   (mod: getInterventionRules)
frontend/src/assets/game/scenarios/*.json          (mod: NPCs modulares con motion)
backend_django/apps/simulation/management/commands/seed_competitive_doors.py (NUEVO)
backend_django/apps/simulation/serializers/game_dtos.py (mod: timeline)
backend_django/apps/simulation/tests/test_world.py (mod: test seeds puertas)
backend_django/apps/simulation/tests/test_game.py  (mod: test timeline)
docs/audit-flujo-competitivo-npcs-2026-06-11/      (NUEVO: evidencia)
```

Commits pequeños en el orden del prompt maestro (§23). Antes de cada commit: `git status --short`.

---

### Task 0: Baseline (sin commit)

**Files:** crea `docs/audit-flujo-competitivo-npcs-2026-06-11/`

- [ ] **Step 0.1:** Verificar estado limpio y base:

```powershell
git status --short          # solo untracked docs/tools preexistentes
git log --oneline -3        # HEAD = 34b45c1
docker ps --filter "publish=5433"   # BD arriba; si no: cd ..\psicologia_proyecto; docker compose up -d db
```

- [ ] **Step 0.2:** Baseline de build/tests (anotar números):

```powershell
cd frontend
npm run build               # Esperado: OK
npm test -- --runInBand     # Esperado: 31 suites / 158 tests verdes (base fase C)
cd ..\backend_django
.\.venv\Scripts\python.exe manage.py test apps.simulation
# Si falla la creación de test-DB: .\.venv\Scripts\python.exe -m pytest apps\simulation -q  (esperado: todos verdes)
```

- [ ] **Step 0.3:** Carpeta de auditoría + capturas before. Levantar servers (`runserver 8091` + `npm start -- --host 127.0.0.1 --port 4201` en background). Leer `tools/smoke-test/capture.py --help` y `tools/smoke-test/c_phase_audit.py` (patrón a imitar). Capturar con capture.py:
  - `00-before-personaje.png` (ruta /portal/personaje)
  - `00-before-game-explore.png`, `00-before-npcs.png` (juego, caso 1)
  - `00-before-dialogue.png` (diálogo abierto), `00-before-mobile.png` (390×844)
  - `00-before-measurements.json`: viewport, canvas rect, scrollWidth/bodyScrollWidth, errores consola, 404s, `localStorage.psychosim_avatar`, `world().map.key` (vía estado visible), NPCs del scenarioConfig.

---

### Task 1: Nudge táctil con contrato de movimiento (Fase 1 del spec)

**Files:**
- Modify: `frontend/src/app/features/simulator/player-motion.util.ts`
- Modify: `frontend/src/app/features/simulator/player-motion.util.spec.ts`
- Modify: `frontend/src/app/features/simulator/game-world.component.ts` (método `nudge` de la escena, línea ~425)

- [ ] **Step 1.1: Test que falla.** Añadir al final de `player-motion.util.spec.ts`:

```ts
describe('computeNudgeStep (nudge táctil)', () => {
  it('nudge right produce dirección right, solo eje X y moving=true', () => {
    const step = computeNudgeStep('right', 'down');
    expect(step.direction).toBe('right');
    expect(step.moving).toBe(true);
    expect(step.dx).toBeCloseTo(PLAYER_SPEED * (PLAYER_MAX_DELTA_MS / 1000), 5);
    expect(step.dy).toBe(0);
  });

  it('no hay diagonal: cada llamada mueve un solo eje', () => {
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      const step = computeNudgeStep(dir, 'down');
      expect(step.dx === 0 || step.dy === 0).toBe(true);
      expect(Math.abs(step.dx) + Math.abs(step.dy)).toBeGreaterThan(0);
      expect(step.direction).toBe(dir);
    }
  });

  it('respeta PLAYER_SPEED con el delta clamp del contrato (sin salto fijo)', () => {
    const step = computeNudgeStep('up', 'up');
    expect(Math.hypot(step.dx, step.dy))
      .toBeLessThanOrEqual(PLAYER_SPEED * (PLAYER_MAX_DELTA_MS / 1000) + 1e-9);
  });

  it('NUDGE_SUBSTEPS acota el desplazamiento total de un tap (~20px)', () => {
    const total = NUDGE_SUBSTEPS * PLAYER_SPEED * (PLAYER_MAX_DELTA_MS / 1000);
    expect(total).toBeGreaterThanOrEqual(16);
    expect(total).toBeLessThanOrEqual(24);
  });
});
```

Ajustar el import del spec para incluir `computeNudgeStep, NUDGE_SUBSTEPS, PLAYER_MAX_DELTA_MS, PLAYER_SPEED`.

- [ ] **Step 1.2:** `cd frontend; npx jest player-motion --runInBand` → FALLA (computeNudgeStep no existe).

- [ ] **Step 1.3: Implementación.** Añadir al final de `player-motion.util.ts`:

```ts
/** Sub-pasos de un nudge táctil: 4 × clamp(34 ms) ≈ 20 px a PLAYER_SPEED. */
export const NUDGE_SUBSTEPS = 4;

/** Input sintético de una sola dirección (los botones táctiles no combinan ejes). */
export function nudgeInput(direction: PlayerDirection): PlayerMotionInput {
  return {
    left: direction === 'left',
    right: direction === 'right',
    up: direction === 'up',
    down: direction === 'down',
  };
}

/**
 * Paso de nudge táctil: un sub-paso del MISMO contrato que WASD
 * (computePlayerStep con el delta máximo por frame). El llamador lo aplica
 * NUDGE_SUBSTEPS veces con colisión por sub-paso — sin túneles ni saltos fijos.
 */
export function computeNudgeStep(
  direction: PlayerDirection,
  lastDirection: PlayerDirection,
): PlayerMotionStep {
  return computePlayerStep(nudgeInput(direction), lastDirection, PLAYER_MAX_DELTA_MS);
}
```

- [ ] **Step 1.4:** `npx jest player-motion --runInBand` → PASA.

- [ ] **Step 1.5: Reescribir `nudge` en la escena.** En `game-world.component.ts` reemplazar el método `nudge` de `DataDrivenWorldScene` (el de `const d = 34;`) por:

```ts
nudge(direction: 'up' | 'down' | 'left' | 'right') {
  if (!this.player) return;
  // Mismo contrato que WASD (player-motion.util): sub-pasos con colisión y
  // sliding, pose/dirección estables, sin caminar en el sitio contra paredes.
  let moved = false;
  for (let i = 0; i < NUDGE_SUBSTEPS; i++) {
    const step = computeNudgeStep(direction, this.lastDirection);
    if (!this.movePlayer(step.dx, step.dy)) break;
    moved = true;
  }
  this.lastDirection = direction;
  this.applyPlayerPose(direction, moved); // el update() del frame siguiente vuelve a idle
  if (moved) {
    this.callbacks.onPosition(Math.round(this.player.x), Math.round(this.player.y));
    this.ysort(this.player);
  }
  this.updateNearestInteraction();
}
```

Y sumar `computeNudgeStep, NUDGE_SUBSTEPS` al import existente de `./player-motion.util`.

- [ ] **Step 1.6:** `npm run build` → OK. `npm test -- --runInBand` → verde.

- [ ] **Step 1.7: Commit.**

```powershell
git status --short
git add frontend/src/app/features/simulator/player-motion.util.ts frontend/src/app/features/simulator/player-motion.util.spec.ts frontend/src/app/features/simulator/game-world.component.ts
git commit -m "fix(game): unificar nudge tactil con movimiento de jugador"
```

---

### Task 2: Contrato NPC modular + presets (Fases 2-3)

**Files:**
- Modify: `frontend/src/app/core/models/simulation.model.ts` (junto a `NpcConfig`, línea ~698)
- Create: `frontend/src/app/features/simulator/npc-avatar-presets.ts`
- Create: `frontend/src/app/features/simulator/npc-avatar-presets.spec.ts`

- [ ] **Step 2.1: Extender el modelo.** En `simulation.model.ts`, ANTES de `export interface NpcConfig` insertar:

```ts
// ─── NPC modular (flujo competitivo) ──────────────────────────────────────────

export type NpcAvatarPresetKey =
  | 'madre-vbg'
  | 'paciente-vbg'
  | 'colega-clinica'
  | 'supervisor-clinico'
  | 'seguridad'
  | 'adolescente-nna';

export type NpcMotionBehavior =
  | 'idle'
  | 'subtle-wander'
  | 'pace'
  | 'patrol'
  | 'avoidant'
  | 'attentive';

export interface NpcMotionAnchor {
  x: number;
  y: number;
  pauseMs?: number;
  face?: 'down' | 'up' | 'left' | 'right';
}

export interface NpcMovementZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NpcMotionConfig {
  behavior: NpcMotionBehavior;
  zone?: NpcMovementZone;
  anchors?: NpcMotionAnchor[];
  radius?: number;
  speed?: number;
  pauseMs?: number;
  startDelayMs?: number;
}
```

Y dentro de `NpcConfig`, después de `dialogue: NpcDialogue;` añadir los campos opcionales (frameIndex queda como fallback legacy):

```ts
  /** Preset modular (mismo universo visual que el avatar). Si falta → sprite legacy. */
  avatarPresetKey?: NpcAvatarPresetKey;
  motion?: NpcMotionConfig;
  facing?: 'down' | 'up' | 'left' | 'right';
  /** Override de escala de render (default: el del preset). */
  scale?: number;
  emotion?: 'neutral' | 'calm' | 'worried' | 'anxious' | 'receptive' | 'closed';
```

- [ ] **Step 2.2: Spec que falla.** Crear `npc-avatar-presets.spec.ts`:

```ts
import { coerceAvatar, isValidAvatar } from '../character/avatar-config.util';
import {
  MAP_OBJECT_PRESETS,
  NPC_AVATAR_PRESETS,
  NPC_PRESET_RENDER,
  npcPresetConfig,
  npcPresetRender,
} from './npc-avatar-presets';
import { NpcAvatarPresetKey } from '../../core/models/simulation.model';

const PRESET_KEYS = Object.keys(NPC_AVATAR_PRESETS) as NpcAvatarPresetKey[];

describe('npc-avatar-presets', () => {
  it('cubre los 6 presets del caso competitivo', () => {
    expect(PRESET_KEYS.sort()).toEqual([
      'adolescente-nna', 'colega-clinica', 'madre-vbg',
      'paciente-vbg', 'seguridad', 'supervisor-clinico',
    ]);
  });

  it('cada preset es un AvatarConfig 100% real (sin opciones inventadas)', () => {
    for (const key of PRESET_KEYS) {
      const preset = NPC_AVATAR_PRESETS[key];
      expect(isValidAvatar(preset)).toBe(true);
      // coerceAvatar no debe corregir nada: todos los ids existen en los helpers
      expect(coerceAvatar(preset)).toEqual(preset);
    }
  });

  it('escalas dentro del rango del spec: adultos 0.78-0.85, adolescente 0.70-0.76', () => {
    for (const key of PRESET_KEYS) {
      const { scale } = NPC_PRESET_RENDER[key];
      if (key === 'adolescente-nna') {
        expect(scale).toBeGreaterThanOrEqual(0.70);
        expect(scale).toBeLessThanOrEqual(0.76);
      } else {
        expect(scale).toBeGreaterThanOrEqual(0.78);
        expect(scale).toBeLessThanOrEqual(0.85);
      }
    }
  });

  it('lookups seguros y mapeo de markers PERSON a presets existentes', () => {
    expect(npcPresetConfig('madre-vbg')).toBe(NPC_AVATAR_PRESETS['madre-vbg']);
    expect(npcPresetConfig(undefined)).toBeNull();
    expect(npcPresetRender('seguridad').scale).toBeGreaterThan(0);
    for (const preset of Object.values(MAP_OBJECT_PRESETS)) {
      expect(NPC_AVATAR_PRESETS[preset]).toBeDefined();
    }
    expect(MAP_OBJECT_PRESETS['escucha-segura']).toBe('paciente-vbg');
  });
});
```

- [ ] **Step 2.3:** `npx jest npc-avatar-presets --runInBand` → FALLA (módulo no existe).

- [ ] **Step 2.4: Implementación.** Crear `npc-avatar-presets.ts`:

```ts
import { AvatarConfig } from '../character/avatar.model';
import { NpcAvatarPresetKey } from '../../core/models/simulation.model';

/**
 * Presets visuales fijos de NPC (Fase 3 del flujo competitivo).
 *
 * Mismo universo modular que el avatar del jugador: cada preset es un
 * AvatarConfig REAL (solo ids que existen en avatar.model — el spec lo
 * garantiza con coerceAvatar). El cuerpo es compartido por ahora
 * (body_orientadora_purple): la identidad sale de pelo, cara, escala y un
 * tint sutil. No se exponen en /portal/personaje.
 *
 * Nota de adaptación: el prompt pedía hairStyle 'rojizo' para la adolescente;
 * ese id no existe — el contrato real es hairVariantPatch('red') =
 * { hairStyle: 'medio', hairColor: 'rojizo' } (variante con arte `red`).
 */
export const NPC_AVATAR_PRESETS: Record<NpcAvatarPresetKey, AvatarConfig> = {
  'madre-vbg': {
    skinTone: 'media', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'amables', brows: 'suaves', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'paciente-vbg': {
    skinTone: 'clara', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'colega-clinica': {
    skinTone: 'morena', hairStyle: 'recogido', hairColor: 'castano', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutra', accessory: 'pin',
    uniform: 'sin-bata',
  },
  'supervisor-clinico': {
    skinTone: 'media', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'seguridad': {
    skinTone: 'morena', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'adolescente-nna': {
    skinTone: 'clara', hairStyle: 'medio', hairColor: 'rojizo', fringe: false,
    eyes: 'neutros', brows: 'suaves', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
};

export interface NpcPresetRenderHints {
  /** Escala de render (jugador = 0.85; adultos 0.78-0.85; adolescente 0.70-0.76). */
  scale: number;
  /** Tint sutil para diferenciar presets que comparten pelo (opcional). */
  tint?: number;
}

export const NPC_PRESET_RENDER: Record<NpcAvatarPresetKey, NpcPresetRenderHints> = {
  'madre-vbg':          { scale: 0.82 },
  'paciente-vbg':       { scale: 0.78, tint: 0xf3ecff },
  'colega-clinica':     { scale: 0.82 },
  'supervisor-clinico': { scale: 0.84 },
  'seguridad':          { scale: 0.84, tint: 0xdde6f2 },
  'adolescente-nna':    { scale: 0.72 },
};

/**
 * Markers PERSON del backend que deben renderizarse con preset modular
 * (la consultante 'escucha-segura' es la paciente del caso).
 */
export const MAP_OBJECT_PRESETS: Record<string, NpcAvatarPresetKey> = {
  'escucha-segura': 'paciente-vbg',
};

export function npcPresetConfig(key: string | undefined | null): AvatarConfig | null {
  if (!key) return null;
  return NPC_AVATAR_PRESETS[key as NpcAvatarPresetKey] ?? null;
}

export function npcPresetRender(key: NpcAvatarPresetKey): NpcPresetRenderHints {
  return NPC_PRESET_RENDER[key];
}
```

- [ ] **Step 2.5:** `npx jest npc-avatar-presets --runInBand` → PASA. `npm run build` → OK.

- [ ] **Step 2.6: Commit.**

```powershell
git add frontend/src/app/core/models/simulation.model.ts frontend/src/app/features/simulator/npc-avatar-presets.ts frontend/src/app/features/simulator/npc-avatar-presets.spec.ts
git commit -m "feat(game): agregar presets de npc modular"
```

---

### Task 3: Render modular de NPC en Phaser (Fase 4)

**Files:**
- Modify: `frontend/src/app/features/simulator/phaser-avatar-renderer.ts`
- Modify: `frontend/src/app/features/simulator/phaser-avatar-renderer.spec.ts`
- Modify: `frontend/src/app/features/simulator/game-world.component.ts` (`preload`, `create`, `spawnNpcs`, `createMarker`, `updatePatientVisualState`)

- [ ] **Step 3.1: Spec que falla.** Añadir a `phaser-avatar-renderer.spec.ts` (sumar `npcAvatarAnimKeys, npcAvatarTextureKey, AVATAR_ANIM_KEYS, AVATAR_TEXTURE_KEY` al import):

```ts
describe('texturas/animaciones de NPC modular (fase competitiva)', () => {
  it('dos presets distintos producen texture keys distintas y ninguna pisa la del jugador', () => {
    const madre = npcAvatarTextureKey('madre-vbg');
    const colega = npcAvatarTextureKey('colega-clinica');
    expect(madre).toBe('npc-avatar-madre-vbg');
    expect(colega).toBe('npc-avatar-colega-clinica');
    expect(madre).not.toBe(colega);
    expect(madre).not.toBe(AVATAR_TEXTURE_KEY);
  });

  it('las anim keys de NPC no colisionan entre presets ni con las del jugador', () => {
    const a = npcAvatarAnimKeys('madre-vbg');
    const b = npcAvatarAnimKeys('seguridad');
    expect(a).toEqual({
      down: 'npc-madre-vbg-walk-down',
      side: 'npc-madre-vbg-walk-side',
      up: 'npc-madre-vbg-walk-up',
    });
    const all = [...Object.values(a), ...Object.values(b)];
    expect(new Set(all).size).toBe(all.length);
    for (const key of all) {
      expect(Object.values(AVATAR_ANIM_KEYS)).not.toContain(key);
    }
  });
});
```

- [ ] **Step 3.2:** `npx jest phaser-avatar-renderer --runInBand` → FALLA.

- [ ] **Step 3.3: Generalizar el renderer.** En `phaser-avatar-renderer.ts`:

(a) Después de `AVATAR_WALK_FRAMES` añadir:

```ts
/** Clave de textura compuesta de un preset de NPC (no pisa la del jugador). */
export function npcAvatarTextureKey(presetKey: string): string {
  return `npc-avatar-${presetKey}`;
}

export interface AvatarAnimKeySet { down: string; side: string; up: string; }

/** Claves de animación de caminata por preset de NPC. */
export function npcAvatarAnimKeys(presetKey: string): AvatarAnimKeySet {
  return {
    down: `npc-${presetKey}-walk-down`,
    side: `npc-${presetKey}-walk-side`,
    up: `npc-${presetKey}-walk-up`,
  };
}
```

(b) Renombrar el cuerpo de `composeAvatarTexture` a una versión parametrizada y delegar (la firma pública del jugador NO cambia):

```ts
/** Compone capas ya cargadas en un CanvasTexture con la clave dada (jugador o NPC). */
export function composeAvatarTextureAs(
  scene: Phaser.Scene,
  textureKey: string,
  specs: AvatarLayerSpec[],
): boolean {
  const available = specs.filter(spec => scene.textures.exists(spec.textureKey));
  if (!available.length) return false;

  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  const canvasTexture = scene.textures.createCanvas(textureKey, AVATAR_SHEET_WIDTH, AVATAR_SHEET_HEIGHT);
  if (!canvasTexture) return false;
  // ... (cuerpo idéntico al actual: ctx, bucle por filas con avatarRowLayerOrder,
  //      refresh y registro de avatarFrameRects) ...
  return true;
}

export function composeAvatarTexture(scene: Phaser.Scene, specs: AvatarLayerSpec[]): boolean {
  return composeAvatarTextureAs(scene, AVATAR_TEXTURE_KEY, specs);
}
```

(c) Igual con las animaciones:

```ts
/** (Re)crea animaciones de caminata para una textura compuesta con claves dadas. */
export function createAvatarAnimationsFor(
  scene: Phaser.Scene,
  textureKey: string,
  animKeys: AvatarAnimKeySet,
): void {
  for (const dir of ['down', 'side', 'up'] as const) {
    const key = animKeys[dir];
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: AVATAR_WALK_FRAMES[dir].map(frame => ({ key: textureKey, frame })),
      frameRate: 7,
      repeat: -1,
    });
  }
}

export function createAvatarAnimations(scene: Phaser.Scene): void {
  createAvatarAnimationsFor(scene, AVATAR_TEXTURE_KEY, AVATAR_ANIM_KEYS);
}
```

- [ ] **Step 3.4:** `npx jest phaser-avatar-renderer --runInBand` → PASA (los tests viejos siguen verdes: la API del jugador no cambió).

- [ ] **Step 3.5: game-world — precarga y composición por preset.**

(a) Imports nuevos en `game-world.component.ts`:

```ts
import {
  MAP_OBJECT_PRESETS, NPC_AVATAR_PRESETS, NPC_PRESET_RENDER, npcPresetConfig,
} from './npc-avatar-presets';
import { NpcAvatarPresetKey } from '../../core/models/simulation.model';
```

y sumar al import de `./phaser-avatar-renderer`: `composeAvatarTextureAs, createAvatarAnimationsFor, npcAvatarAnimKeys, npcAvatarTextureKey, AVATAR_FRAME_HEIGHT`.

(b) En `preload()`, justo después del bucle que carga `this.avatarSpecs`, añadir:

```ts
    // ── Capas modulares de los presets de NPC (mismas hojas que el avatar;
    //    claves idénticas se deduplican solas en el loader) ──────────────────
    for (const presetConfig of Object.values(NPC_AVATAR_PRESETS)) {
      for (const spec of avatarLayerSpecs(presetConfig)) {
        this.load.image(spec.textureKey, spec.assetPath);
      }
    }
```

(c) Nuevo campo y helper en la escena (junto a `avatarReady`):

```ts
  private readonly npcCompositesReady = new Set<string>();

  /** Compone (una vez) textura+anims del preset. false → fallback Kenney. */
  private ensureNpcComposite(presetKey: NpcAvatarPresetKey): boolean {
    if (this.npcCompositesReady.has(presetKey)) return true;
    const config = npcPresetConfig(presetKey);
    if (!config) return false;
    const ok = composeAvatarTextureAs(this, npcAvatarTextureKey(presetKey), avatarLayerSpecs(config));
    if (!ok) return false;
    createAvatarAnimationsFor(this, npcAvatarTextureKey(presetKey), npcAvatarAnimKeys(presetKey));
    this.npcCompositesReady.add(presetKey);
    return true;
  }
```

- [ ] **Step 3.6: spawnNpcs modular.** Reemplazar el cuerpo del `for (const npc of npcs)` en `spawnNpcs` para bifurcar: si `npc.avatarPresetKey` y `ensureNpcComposite` → rama modular; si no → rama Kenney actual (queda como fallback, sin Kenney nuevo). Rama modular:

```ts
      const presetKey = npc.avatarPresetKey;
      if (presetKey && this.ensureNpcComposite(presetKey)) {
        const render = NPC_PRESET_RENDER[presetKey];
        const scale = npc.scale ?? render.scale;
        // Contrato de pies: (x,y) del contenedor = pies; el frame trae los pies
        // en y≈90 ⇒ centro del sprite a -42*scale (mismo cálculo que el jugador).
        const spriteOffsetY = -Math.round(42 * scale);
        const shadowSoft = this.add.ellipse(0, 0, 42 * scale, 13 * scale, 0x000000, .15);
        const shadow = this.add.ellipse(0, 0, 28 * scale, 9 * scale, 0x000000, .27);
        const sprite = this.add.sprite(0, spriteOffsetY, npcAvatarTextureKey(presetKey), AVATAR_IDLE_FRAMES.down)
          .setScale(scale);
        const baseTint = render.tint ?? null;
        if (baseTint != null) sprite.setTint(baseTint);

        const headY = spriteOffsetY - Math.round((AVATAR_FRAME_HEIGHT / 2) * scale);
        const label = this.add.text(0, headY - 4, npc.displayName, {
          fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#e8f0f4',
          backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 }, align: 'center',
        }).setOrigin(0.5, 1).setAlpha(0);
        const hint = this.add.text(0, headY - 18, '▲ E', {
          fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#4fa3a5', align: 'center',
        }).setOrigin(0.5, 1).setAlpha(0);

        const container = this.add.container(npc.x, npc.y, [shadowSoft, shadow, sprite, label, hint]);
        this.setFeetOffset(container, 0);   // pies = origen del contenedor
        this.npcMarkers.set(npc.key, container);
        const bag = container as unknown as Record<string, unknown>;
        bag['__npcConfig'] = npc;
        bag['__hintSprite'] = hint;
        bag['__labelSprite'] = label;
        bag['__npcSprite'] = sprite;
        bag['__npcPreset'] = presetKey;
        bag['__npcBaseTint'] = baseTint;
        this.applyNpcFacing(container, npc.facing ?? 'down');
        continue;
      }
      // ── fallback legacy Kenney (cuerpo actual del bucle, sin cambios) ──
```

Y añadir el helper de facing (idle según dirección; la fila lateral mira a la IZQUIERDA):

```ts
  /** Frame de reposo del NPC modular según dirección (sin animación). */
  private applyNpcFacing(container: Phaser.GameObjects.Container, direction: 'down' | 'up' | 'left' | 'right'): void {
    const sprite = (container as unknown as Record<string, unknown>)['__npcSprite'] as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;
    sprite.stop();
    const frame = direction === 'up' ? AVATAR_IDLE_FRAMES.up
      : direction === 'down' ? AVATAR_IDLE_FRAMES.down
      : AVATAR_IDLE_FRAMES.side;
    sprite.setFrame(frame);
    sprite.setFlipX(direction === 'right');
  }
```

- [ ] **Step 3.7: Marker PERSON modular.** En `createMarker`, reemplazar la rama `object.type === 'PERSON'` por:

```ts
      } else if (object.type === 'PERSON' && MAP_OBJECT_PRESETS[object.key]
          && this.ensureNpcComposite(MAP_OBJECT_PRESETS[object.key])) {
        const presetKey = MAP_OBJECT_PRESETS[object.key];
        const render = NPC_PRESET_RENDER[presetKey];
        const sprite = this.add.sprite(0, -Math.round(42 * render.scale) + 16,
          npcAvatarTextureKey(presetKey), AVATAR_IDLE_FRAMES.down).setScale(render.scale);
        if (render.tint != null) sprite.setTint(render.tint);
        (sprite as unknown as Record<string, unknown>)['__personBaseTint'] = render.tint ?? null;
        main = sprite;
      } else if (object.type === 'PERSON' && this.textures.exists('characters')) {
        // fallback legacy (rama actual)
```

(El `+16` alinea los pies del arte con la sombra del marker, que vive en y=16.)

- [ ] **Step 3.8: updatePatientVisualState sobre la paciente real.** Reemplazar el método para cubrir markers PERSON modulares y restaurar el tint base en lugar de `clearTint`:

```ts
  updatePatientVisualState(state: import('../../core/models/simulation.model').PatientState) {
    const targets: Array<{ sprite: Phaser.GameObjects.Sprite; container: Phaser.GameObjects.Container; baseTint: number | null }> = [];
    for (const [key, container] of this.npcMarkers) {
      if (!key.startsWith('paciente-')) continue;
      const bag = container as unknown as Record<string, unknown>;
      const sprite = (bag['__npcSprite'] as Phaser.GameObjects.Sprite | undefined)
        ?? container.list.find((c): c is Phaser.GameObjects.Sprite => c instanceof Phaser.GameObjects.Sprite);
      if (sprite) targets.push({ sprite, container, baseTint: (bag['__npcBaseTint'] as number | null) ?? null });
    }
    for (const [key, preset] of Object.entries(MAP_OBJECT_PRESETS)) {
      if (preset !== 'paciente-vbg') continue;
      const marker = this.markers.get(key);
      const sprite = marker?.list.find((c): c is Phaser.GameObjects.Sprite => c instanceof Phaser.GameObjects.Sprite);
      if (marker && sprite) {
        targets.push({ sprite, container: marker, baseTint: ((sprite as unknown as Record<string, unknown>)['__personBaseTint'] as number | null) ?? null });
      }
    }
    for (const { sprite, container, baseTint } of targets) {
      if (state.crisisLevel >= 70) {
        sprite.setTint(0xff8888);
        if (!this.callbacks.reduceMotion) {
          this.tweens.add({ targets: container, x: container.x + 2, duration: 60, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
        }
      } else if (state.trustLevel >= 60 && state.emotionalState >= 60) {
        sprite.setTint(0xaaffcc);
      } else if (state.emotionalState <= 25) {
        sprite.setTint(0x8888ff);
      } else if (baseTint != null) {
        sprite.setTint(baseTint);
      } else {
        sprite.clearTint();
      }
    }
  }
```

- [ ] **Step 3.9:** `npm run build` → OK. `npm test -- --runInBand` → verde.

- [ ] **Step 3.10: Commit.**

```powershell
git add frontend/src/app/features/simulator/phaser-avatar-renderer.ts frontend/src/app/features/simulator/phaser-avatar-renderer.spec.ts frontend/src/app/features/simulator/game-world.component.ts
git commit -m "feat(game): renderizar npcs con avatar modular"
```

---

### Task 4: Movimiento NPC por zonas (Fase 5)

**Files:**
- Modify: `frontend/src/app/features/simulator/scene-motion.util.ts`
- Modify: `frontend/src/app/features/simulator/scene-motion.util.spec.ts`
- Modify: `frontend/src/app/features/simulator/game-world.component.ts`
- Modify: `frontend/src/app/features/simulator/simulation-play.component.ts` (binding `motionPaused`)

- [ ] **Step 4.1: Spec que falla.** Añadir a `scene-motion.util.spec.ts` (sumar imports nuevos):

```ts
describe('movimiento NPC por zonas (flujo competitivo)', () => {
  const zone = { x: 100, y: 200, width: 80, height: 40 };

  it('pickZoneTarget queda SIEMPRE dentro de la zona', () => {
    const rands = [0, 0.25, 0.5, 0.75, 0.999];
    for (const a of rands) for (const b of rands) {
      const seq = [a, b];
      const target = pickZoneTarget(zone, () => seq.shift() ?? 0.5);
      expect(target.x).toBeGreaterThanOrEqual(zone.x);
      expect(target.x).toBeLessThanOrEqual(zone.x + zone.width);
      expect(target.y).toBeGreaterThanOrEqual(zone.y);
      expect(target.y).toBeLessThanOrEqual(zone.y + zone.height);
    }
  });

  it('clampToZone/pointInZone delimitan la zona', () => {
    expect(pointInZone({ x: 120, y: 210 }, zone)).toBe(true);
    expect(pointInZone({ x: 90, y: 210 }, zone)).toBe(false);
    expect(clampToZone({ x: 0, y: 999 }, zone)).toEqual({ x: 100, y: 240 });
  });

  it('npcZone usa zone explícita o caja por radius alrededor del origen', () => {
    expect(npcZone({ behavior: 'pace', zone }, { x: 0, y: 0 })).toEqual(zone);
    expect(npcZone({ behavior: 'subtle-wander', radius: 20 }, { x: 50, y: 60 }))
      .toEqual({ x: 30, y: 40, width: 40, height: 40 });
  });

  it('pace/patrol recorren anchors en orden cíclico', () => {
    expect(nextAnchorIndex(0, 3)).toBe(1);
    expect(nextAnchorIndex(2, 3)).toBe(0);
  });

  it('avoidant elige un objetivo dentro de la zona y más lejos del jugador', () => {
    const player = { x: 100, y: 200 };  // esquina superior izquierda de la zona
    const from = { x: 110, y: 210 };
    const target = avoidantTarget(zone, from, player, Math.random);
    expect(pointInZone(target, zone)).toBe(true);
    const before = Math.hypot(from.x - player.x, from.y - player.y);
    const after = Math.hypot(target.x - player.x, target.y - player.y);
    expect(after).toBeGreaterThanOrEqual(before);
    // paso corto, no huida arcade
    expect(Math.hypot(target.x - from.x, target.y - from.y)).toBeLessThanOrEqual(AVOIDANT_STEP_MAX + 1e-9);
  });

  it('velocidades/pausas: default por behavior y override por config', () => {
    expect(npcSpeed({ behavior: 'subtle-wander' })).toBe(18);
    expect(npcSpeed({ behavior: 'patrol', speed: 30 })).toBe(30);
    expect(npcPause({ behavior: 'pace' }, null)).toBe(1600);
    expect(npcPause({ behavior: 'pace', pauseMs: 500 }, { x: 0, y: 0, pauseMs: 900 })).toBe(900);
  });

  it('reduced motion fuerza idle salvo attentive (solo facing)', () => {
    expect(effectiveNpcBehavior('patrol', true)).toBe('idle');
    expect(effectiveNpcBehavior('subtle-wander', true)).toBe('idle');
    expect(effectiveNpcBehavior('attentive', true)).toBe('attentive');
    expect(effectiveNpcBehavior('pace', false)).toBe('pace');
  });
});
```

- [ ] **Step 4.2:** `npx jest scene-motion --runInBand` → FALLA.

- [ ] **Step 4.3: Helpers puros.** Añadir al final de `scene-motion.util.ts` (con import arriba):

```ts
import {
  NpcMotionAnchor, NpcMotionBehavior, NpcMotionConfig, NpcMovementZone,
} from '../../core/models/simulation.model';

// ─── NPC motion (flujo competitivo) — sobrio, clínico, nada arcade ───────────

export const NPC_BEHAVIOR_SPEED: Record<NpcMotionBehavior, number> = {
  idle: 0, 'subtle-wander': 18, pace: 24, patrol: 28, avoidant: 20, attentive: 0,
};

export const NPC_BEHAVIOR_PAUSE: Record<NpcMotionBehavior, number> = {
  idle: 0, 'subtle-wander': 2400, pace: 1600, patrol: 900, avoidant: 1400, attentive: 0,
};

export const DEFAULT_NPC_ZONE_HALF = 26;
/** Distancia a la que un avoidant reacciona al jugador. */
export const AVOIDANT_TRIGGER_RANGE = 70;
/** Paso corto máximo del avoidant (no debe parecer huida). */
export const AVOIDANT_STEP_MAX = 16;

export function npcSpeed(cfg: NpcMotionConfig): number {
  return cfg.speed ?? NPC_BEHAVIOR_SPEED[cfg.behavior] ?? 0;
}

export function npcPause(cfg: NpcMotionConfig, anchor?: NpcMotionAnchor | null): number {
  return anchor?.pauseMs ?? cfg.pauseMs ?? NPC_BEHAVIOR_PAUSE[cfg.behavior] ?? 0;
}

export function npcZone(cfg: NpcMotionConfig, origin: { x: number; y: number }): NpcMovementZone {
  if (cfg.zone) return cfg.zone;
  const r = cfg.radius ?? DEFAULT_NPC_ZONE_HALF;
  return { x: origin.x - r, y: origin.y - r, width: r * 2, height: r * 2 };
}

export function pointInZone(p: { x: number; y: number }, zone: NpcMovementZone): boolean {
  return p.x >= zone.x && p.x <= zone.x + zone.width
    && p.y >= zone.y && p.y <= zone.y + zone.height;
}

export function clampToZone(p: { x: number; y: number }, zone: NpcMovementZone): { x: number; y: number } {
  return {
    x: Math.min(Math.max(p.x, zone.x), zone.x + zone.width),
    y: Math.min(Math.max(p.y, zone.y), zone.y + zone.height),
  };
}

export function pickZoneTarget(zone: NpcMovementZone, rand: () => number): { x: number; y: number } {
  return { x: zone.x + rand() * zone.width, y: zone.y + rand() * zone.height };
}

export function nextAnchorIndex(idx: number, length: number): number {
  return length > 0 ? (idx + 1) % length : 0;
}

/**
 * Objetivo avoidant: paso CORTO (≤ AVOIDANT_STEP_MAX) hacia el punto de la zona
 * que más se aleja del jugador, muestreando candidatos. Postura, no huida.
 */
export function avoidantTarget(
  zone: NpcMovementZone,
  from: { x: number; y: number },
  player: { x: number; y: number },
  rand: () => number,
  samples = 6,
): { x: number; y: number } {
  let best = from;
  let bestDist = Math.hypot(from.x - player.x, from.y - player.y);
  for (let i = 0; i < samples; i++) {
    const candidate = pickZoneTarget(zone, rand);
    const d = Math.hypot(candidate.x - player.x, candidate.y - player.y);
    if (d > bestDist) { best = candidate; bestDist = d; }
  }
  return clampToZone(stepToward(from, best, AVOIDANT_STEP_MAX), zone);
}

/** Con reduced motion solo se permite idle, o attentive (facing sin traslación). */
export function effectiveNpcBehavior(behavior: NpcMotionBehavior, reducedMotion: boolean): NpcMotionBehavior {
  if (!reducedMotion) return behavior;
  return behavior === 'attentive' ? 'attentive' : 'idle';
}
```

- [ ] **Step 4.4:** `npx jest scene-motion --runInBand` → PASA.

- [ ] **Step 4.5: Movers en la escena.** En `game-world.component.ts`:

(a) Imports: sumar a `./scene-motion.util`: `avoidantTarget, AVOIDANT_TRIGGER_RANGE, effectiveNpcBehavior, npcPause, npcSpeed, npcZone, pickZoneTarget`; a `./player-motion.util`: `resolveDirection`; al import del modelo: `NpcMotionConfig, NpcMovementZone`.

(b) Tipos y estado junto a `AmbientMover`:

```ts
interface NpcMover {
  key: string;
  cfg: NpcMotionConfig;
  zone: NpcMovementZone;
  target: { x: number; y: number } | null;
  anchorIdx: number;
  pauseUntil: number;
  lastPose: { direction: PlayerDirection | null; walking: boolean };
  presetKey: string | null;   // null = sprite legacy (solo flip, sin anims)
}
```

En la escena: `private readonly npcMovers = new Map<string, NpcMover>();` y `private motionPaused = false;` con setter público:

```ts
  /** Pausa el movimiento del mundo (diálogo/journal/outcome abiertos). */
  setMotionPaused(paused: boolean) { this.motionPaused = paused; }
```

(c) Limpiar `npcMovers` en los dos bloques de reset (`renderWorld` y `renderRoom`, junto a `this.npcMarkers.clear()`): `this.npcMovers.clear();`.

(d) Al final del bucle de `spawnNpcs` (ambas ramas, modular y legacy), registrar el mover si hay motion:

```ts
      if (npc.motion) {
        const origin = { x: npc.x, y: npc.y };
        this.npcMovers.set(npc.key, {
          key: npc.key,
          cfg: npc.motion,
          zone: npcZone(npc.motion, origin),
          target: null,
          anchorIdx: 0,
          pauseUntil: this.time.now + (npc.motion.startDelayMs ?? 600),
          lastPose: { direction: (npc.facing ?? 'down') as PlayerDirection, walking: false },
          presetKey: npc.avatarPresetKey ?? null,
        });
      }
```

(e) Pose de NPC con cache (junto a `applyNpcFacing`):

```ts
  /** Pose del NPC (dirección + walking) solo si cambió — como el jugador. */
  private applyNpcPose(mover: NpcMover, container: Phaser.GameObjects.Container, direction: PlayerDirection, walking: boolean): void {
    if (mover.lastPose.direction === direction && mover.lastPose.walking === walking) return;
    mover.lastPose = { direction, walking };
    const sprite = (container as unknown as Record<string, unknown>)['__npcSprite'] as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;
    if (!mover.presetKey) { sprite.setFlipX(direction === 'left'); return; }  // legacy: solo flip
    if (walking && !this.callbacks.reduceMotion) {
      sprite.setFlipX(direction === 'right');
      const keys = npcAvatarAnimKeys(mover.presetKey);
      sprite.play(direction === 'down' ? keys.down : direction === 'up' ? keys.up : keys.side, true);
      return;
    }
    this.applyNpcFacing(container, direction);
  }
```

(f) El loop de movimiento (método nuevo en la escena):

```ts
  private updateNpcMovers(time: number, delta: number) {
    if (this.motionPaused || this.npcMovers.size === 0) return;
    for (const mover of this.npcMovers.values()) {
      const container = this.npcMarkers.get(mover.key);
      if (!container) continue;
      const behavior = effectiveNpcBehavior(mover.cfg.behavior, this.callbacks.reduceMotion);
      const lastDir = mover.lastPose.direction ?? 'down';

      if (behavior === 'idle') { this.applyNpcPose(mover, container, lastDir, false); continue; }

      if (behavior === 'attentive') {
        // Gira hacia el jugador cuando está cerca; nunca se traslada.
        if (this.player) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
          if (d <= 110) {
            const dir = resolveDirection(this.player.x - container.x, this.player.y - container.y, lastDir);
            this.applyNpcPose(mover, container, dir, false);
          }
        }
        continue;
      }

      if (time < mover.pauseUntil) { this.applyNpcPose(mover, container, lastDir, false); continue; }

      if (!mover.target) {
        mover.target = this.nextNpcTarget(mover, container);
        if (!mover.target) { mover.pauseUntil = time + 600; continue; }
      }

      const next = stepToward(container, mover.target, npcSpeed(mover.cfg) * (delta / 1000));
      const dir = resolveDirection(next.x - container.x, next.y - container.y, lastDir);
      if (!this.wouldCollide(next.x, next.y)) {
        container.setPosition(next.x, next.y);
        this.applyNpcPose(mover, container, dir, true);
      } else if (!this.wouldCollide(next.x, container.y)) {
        container.setPosition(next.x, container.y);
        this.applyNpcPose(mover, container, dir, true);
      } else if (!this.wouldCollide(container.x, next.y)) {
        container.setPosition(container.x, next.y);
        this.applyNpcPose(mover, container, dir, true);
      } else {
        // Bloqueado del todo: nuevo objetivo después, nunca caminar en el sitio.
        mover.target = null;
        mover.pauseUntil = time + 900;
        this.applyNpcPose(mover, container, dir, false);
        continue;
      }

      if (reached(container, mover.target, 2)) {
        const anchors = mover.cfg.anchors ?? [];
        const anchor = anchors.length ? anchors[mover.anchorIdx] : null;
        this.applyNpcPose(mover, container, (anchor?.face as PlayerDirection | undefined) ?? dir, false);
        mover.pauseUntil = time + npcPause(mover.cfg, anchor);
        if ((mover.cfg.behavior === 'pace' || mover.cfg.behavior === 'patrol') && anchors.length) {
          mover.anchorIdx = nextAnchorIndex(mover.anchorIdx, anchors.length);
        }
        mover.target = null;
      }
    }
  }

  private nextNpcTarget(mover: NpcMover, container: Phaser.GameObjects.Container): { x: number; y: number } | null {
    const behavior = mover.cfg.behavior;
    if (behavior === 'subtle-wander') {
      const candidate = pickZoneTarget(mover.zone, Math.random);
      return this.wouldCollide(candidate.x, candidate.y) ? null : candidate;
    }
    if ((behavior === 'pace' || behavior === 'patrol') && mover.cfg.anchors?.length) {
      const anchor = mover.cfg.anchors[mover.anchorIdx];
      return { x: anchor.x, y: anchor.y };
    }
    if (behavior === 'avoidant') {
      if (!this.player) return null;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      if (d > AVOIDANT_TRIGGER_RANGE) return null;
      const candidate = avoidantTarget(mover.zone, container, this.player, Math.random);
      return this.wouldCollide(candidate.x, candidate.y) ? null : candidate;
    }
    return null;
  }
```

`nextAnchorIndex` también va en el import de scene-motion.

(g) En `update(...)`: después de `this.updateAmbientMovers(time, delta);` añadir `this.updateNpcMovers(time, delta);` y en el bloque de y-sort sumar:

```ts
    for (const container of this.npcMarkers.values()) this.ysort(container);
```

Además, condicionar ambient movers a la pausa: primera línea de `updateAmbientMovers` pasa a `if (this.motionPaused || this.callbacks.reduceMotion || this.ambientMovers.size === 0) return;`.

- [ ] **Step 4.6: Input `motionPaused`.** En `GameWorldComponent` (parte Angular):

```ts
  readonly motionPaused = input(false);
```

en `ngOnChanges`: `if (changes['motionPaused']) this.scene?.setMotionPaused(this.motionPaused());`
y en el `window.setTimeout` de `boot()`: `this.scene?.setMotionPaused(this.motionPaused());`.

En `simulation-play.component.ts`: añadir computed

```ts
  /** El mundo se congela con diálogo, journal u outcome abiertos (Fase 5/13). */
  readonly worldMotionPaused = computed(() =>
    this.dialogue() !== null || this.journalOpen() || (this.attempt()?.status ?? 'IN_PROGRESS') !== 'IN_PROGRESS');
```

y en el template, dentro de `<app-game-world ...>`: `[motionPaused]="worldMotionPaused()"`.

- [ ] **Step 4.7:** `npm run build` → OK. `npm test -- --runInBand` → verde.

- [ ] **Step 4.8: Commit.**

```powershell
git add frontend/src/app/features/simulator/scene-motion.util.ts frontend/src/app/features/simulator/scene-motion.util.spec.ts frontend/src/app/features/simulator/game-world.component.ts frontend/src/app/features/simulator/simulation-play.component.ts
git commit -m "feat(game): movimiento de npc por zonas"
```

---

### Task 5: NPCs vivos del caso principal (Fase 6)

**Files:**
- Modify: `frontend/src/assets/game/scenarios/urgencias-crisis.json` (reescritura)
- Modify: `frontend/src/assets/game/scenarios/ruta-proteccion.json` (reescritura)
- Modify: `frontend/src/assets/game/scenarios/comisaria-familia.json`, `informe-integral.json`, `proteccion-nna.json`, `cierre-seguimiento.json` (presets a NPCs existentes)
- Create: `frontend/src/app/features/simulator/scenario-npc-configs.spec.ts`
- Modify: `frontend/src/app/features/simulator/game-world.component.ts` (quitar remapeo por índice)
- Modify: `frontend/src/app/features/simulator/authored-clinical-room.util.ts` (borrar `AUTHORED_NPC_POSITIONS`)

- [ ] **Step 5.1: Spec de validación (falla primero).** Crear `scenario-npc-configs.spec.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { NPC_AVATAR_PRESETS } from './npc-avatar-presets';
import { collidesInAuthoredRoom } from './authored-clinical-room.util';
import { NpcConfig, RoomConfig, ScenarioConfig } from '../../core/models/simulation.model';

const SCENARIOS_DIR = path.join(__dirname, '..', '..', '..', 'assets', 'game', 'scenarios');
const SCENARIO_FILES = [
  'urgencias-crisis', 'ruta-proteccion', 'informe-integral',
  'comisaria-familia', 'proteccion-nna', 'cierre-seguimiento',
];
const BEHAVIORS = ['idle', 'subtle-wander', 'pace', 'patrol', 'avoidant', 'attentive'];
const AUTHORED_TILED_KEYS = new Set([
  'map-urgencias-sala', 'map-ruta-sala', 'map-informe-oficina', 'map-nna-sala', 'map-cierre-sala',
]);

function loadScenario(name: string): ScenarioConfig {
  return JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf-8'));
}

function allNpcs(): Array<{ file: string; room: RoomConfig; npc: NpcConfig }> {
  return SCENARIO_FILES.flatMap(file =>
    loadScenario(file).rooms.flatMap(room => room.npcs.map(npc => ({ file, room, npc }))));
}

describe('scenario-npc-configs (assets JSON del caso competitivo)', () => {
  it('todo avatarPresetKey referencia un preset real', () => {
    for (const { file, npc } of allNpcs()) {
      if (npc.avatarPresetKey !== undefined) {
        expect(Object.keys(NPC_AVATAR_PRESETS)).toContain(npc.avatarPresetKey);
      }
      expect(typeof npc.frameIndex).toBe('number');  // fallback legacy conservado
      expect(npc.dialogue.lines.length).toBeGreaterThan(0);
      expect(`${file}:${npc.key}`).toBeTruthy();
    }
  });

  it('motion válido: behavior conocido, anchors numéricos dentro de la zona si ambos existen', () => {
    for (const { npc } of allNpcs()) {
      if (!npc.motion) continue;
      expect(BEHAVIORS).toContain(npc.motion.behavior);
      for (const anchor of npc.motion.anchors ?? []) {
        expect(Number.isFinite(anchor.x)).toBe(true);
        expect(Number.isFinite(anchor.y)).toBe(true);
        if (npc.motion.zone) {
          expect(anchor.x).toBeGreaterThanOrEqual(npc.motion.zone.x);
          expect(anchor.x).toBeLessThanOrEqual(npc.motion.zone.x + npc.motion.zone.width);
          expect(anchor.y).toBeGreaterThanOrEqual(npc.motion.zone.y);
          expect(anchor.y).toBeLessThanOrEqual(npc.motion.zone.y + npc.motion.zone.height);
        }
      }
    }
  });

  it('en salas autoría los NPCs y sus anchors caen en piso caminable (no muebles/paredes)', () => {
    for (const { room, npc } of allNpcs()) {
      if (!AUTHORED_TILED_KEYS.has(room.tiledMapKey)) continue;
      expect(collidesInAuthoredRoom(npc.x, npc.y)).toBe(false);
      for (const anchor of npc.motion?.anchors ?? []) {
        expect(collidesInAuthoredRoom(anchor.x, anchor.y)).toBe(false);
      }
    }
  });

  it('el caso principal tiene ≥4 NPCs modulares y ≥3 behaviors distintos', () => {
    const urgencias = loadScenario('urgencias-crisis').rooms[0].npcs;
    const modular = urgencias.filter(n => n.avatarPresetKey);
    expect(modular.length).toBeGreaterThanOrEqual(4);
    const behaviors = new Set(modular.map(n => n.motion?.behavior).filter(Boolean));
    expect(behaviors.size).toBeGreaterThanOrEqual(3);
  });
});
```

`npx jest scenario-npc-configs --runInBand` → FALLA (urgencias tiene 2 NPCs sin preset).

- [ ] **Step 5.2: urgencias-crisis.json** — reescribir completo (coords de la sala autoría 960×528; piso x∈[96,864] y∈[240,486]; muebles según `AUTHORED_CLINICAL_COLLISIONS`):

```json
{
  "scenarioKey": "urgencias-crisis",
  "startRoomKey": "sala-urgencias",
  "rooms": [
    {
      "key": "sala-urgencias",
      "tiledMapKey": "map-urgencias-sala",
      "tiledJsonPath": "/assets/game/maps/urgencias-sala.json",
      "displayName": "Sala de Urgencias — Hospital",
      "spawnX": 480,
      "spawnY": 420,
      "exits": [],
      "npcs": [
        {
          "key": "enfermera-urgencias",
          "npcType": "colleague",
          "displayName": "Enfermera de turno",
          "portrait": "👩‍⚕️",
          "x": 736,
          "y": 372,
          "frameIndex": 428,
          "avatarPresetKey": "colega-clinica",
          "facing": "down",
          "emotion": "calm",
          "motion": { "behavior": "attentive" },
          "dialogue": {
            "lines": [
              { "text": "Llegó hace 20 minutos. Hematomas en rostro y brazos, llanto contenido. Los niños están en la sala de espera con otra enfermera.", "emotion": "neutral" },
              { "text": "Esta es la tercera vez en seis meses. La última vez solo se le dio el alta sin seguimiento.", "emotion": "negative" },
              { "text": "Cuando tengas el contexto completo, la sala de escucha está lista. Empieza por estabilizar: nada de cuestionarios todavía.", "emotion": "neutral" }
            ]
          }
        },
        {
          "key": "madre-familiar",
          "npcType": "family",
          "displayName": "Madre de la consultante",
          "portrait": "👩",
          "x": 190,
          "y": 444,
          "frameIndex": 266,
          "avatarPresetKey": "madre-vbg",
          "facing": "right",
          "emotion": "anxious",
          "motion": {
            "behavior": "pace",
            "speed": 22,
            "zone": { "x": 150, "y": 424, "width": 110, "height": 56 },
            "anchors": [
              { "x": 170, "y": 436, "pauseMs": 1900, "face": "right" },
              { "x": 240, "y": 452, "pauseMs": 1400, "face": "up" },
              { "x": 198, "y": 470, "pauseMs": 2400, "face": "left" }
            ]
          },
          "dialogue": {
            "lines": [
              { "text": "Es mi hija. Llevaba meses diciéndome que todo estaba bien… y hoy llegó así.", "emotion": "anxious" },
              { "text": "Los niños están afuera con mi hermana. Tienen 7 y 10 años; el menor lo vio todo.", "emotion": "negative" },
              { "text": "Ella no quiere denunciar. Dice que si habla, él la mata. Por favor, no la presionen.", "emotion": "anxious" }
            ]
          }
        },
        {
          "key": "seguridad-entrada",
          "npcType": "witness",
          "displayName": "Seguridad del hospital",
          "portrait": "💂",
          "x": 620,
          "y": 464,
          "frameIndex": 432,
          "avatarPresetKey": "seguridad",
          "facing": "left",
          "emotion": "neutral",
          "motion": {
            "behavior": "patrol",
            "speed": 26,
            "anchors": [
              { "x": 560, "y": 462, "pauseMs": 1300, "face": "left" },
              { "x": 760, "y": 462, "pauseMs": 1300, "face": "right" }
            ]
          },
          "dialogue": {
            "lines": [
              { "text": "¿Quiere que llame a la Policía de una vez? Yo los hago pasar ya mismo.", "emotion": "neutral" },
              { "text": "(Activar a la autoridad sin protocolo ni consentimiento puede escalar el peligro. La decisión clínica es tuya.)", "emotion": "negative" }
            ]
          }
        },
        {
          "key": "colega-guardia",
          "npcType": "colleague",
          "displayName": "Colega de guardia",
          "portrait": "🧑‍⚕️",
          "x": 320,
          "y": 306,
          "frameIndex": 428,
          "avatarPresetKey": "supervisor-clinico",
          "facing": "down",
          "emotion": "neutral",
          "motion": { "behavior": "subtle-wander", "radius": 18, "pauseMs": 2800 },
          "dialogue": {
            "lines": [
              { "text": "Recuerda: primero estabilización emocional. Los PAP son la primera línea, no los cuestionarios.", "emotion": "neutral" }
            ]
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 5.3: ruta-proteccion.json** — reescribir:

```json
{
  "scenarioKey": "ruta-proteccion",
  "startRoomKey": "sala-atencion",
  "rooms": [
    {
      "key": "sala-atencion",
      "tiledMapKey": "map-ruta-sala",
      "tiledJsonPath": "/assets/game/maps/ruta-sala.json",
      "displayName": "Sala de Escucha — Ruta de Protección",
      "spawnX": 480,
      "spawnY": 420,
      "exits": [],
      "npcs": [
        {
          "key": "trabajadora-social",
          "npcType": "colleague",
          "displayName": "Trabajadora social",
          "portrait": "👩‍💼",
          "x": 736,
          "y": 372,
          "frameIndex": 428,
          "avatarPresetKey": "colega-clinica",
          "facing": "down",
          "emotion": "receptive",
          "motion": { "behavior": "attentive" },
          "dialogue": {
            "lines": [
              { "text": "La Resolución 459 de 2012 del MSPS marca el protocolo. ¿Ya activaste la notificación a la Comisaría de Familia?", "emotion": "neutral" },
              { "text": "El ICBF debe ser notificado si los menores estuvieron presentes durante la agresión. Eso es Ley 1098.", "emotion": "neutral" }
            ]
          }
        },
        {
          "key": "supervisor-ruta",
          "npcType": "supervisor",
          "displayName": "Supervisora clínica",
          "portrait": "👨‍💼",
          "x": 320,
          "y": 306,
          "frameIndex": 428,
          "avatarPresetKey": "supervisor-clinico",
          "facing": "down",
          "emotion": "neutral",
          "motion": { "behavior": "attentive" },
          "dialogue": {
            "lines": [
              { "text": "Antes de activar o descartar una ruta, valora el riesgo con un instrumento estructurado. La intuición no es evidencia.", "emotion": "neutral" },
              { "text": "Si te falta contexto, vuelve a urgencias por la puerta. Las salas están conectadas por algo.", "emotion": "neutral" }
            ]
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 5.4: presets en los demás escenarios.** Abrir `comisaria-familia.json`, `informe-integral.json`, `proteccion-nna.json`, `cierre-seguimiento.json` y a cada NPC existente añadirle SOLO campos nuevos (sin tocar coords, que en comisaría son Tiled):
  - mapeo por rol: familiar/madre → `"avatarPresetKey": "madre-vbg", "motion": { "behavior": "pace", "radius": 24 }`; colega/trabajadora → `"colega-clinica"` + `{ "behavior": "attentive" }`; supervisor/funcionario → `"supervisor-clinico"` + `{ "behavior": "attentive" }`; paciente/sobreviviente → `"paciente-vbg"` + `{ "behavior": "avoidant", "radius": 26 }`; adolescente/NNA → `"adolescente-nna"` + `{ "behavior": "idle" }`; seguridad/recepción → `"seguridad"` + `{ "behavior": "idle" }`.
  - en comisaria-familia: `familiar-comisaria`→madre-vbg/pace, `colega-comisaria`→colega-clinica/attentive, `paciente-comisaria`→paciente-vbg/avoidant, `supervisor-comisaria`→supervisor-clinico/attentive. Añadir `"facing"` coherente con su posición.

- [ ] **Step 5.5: quitar el remapeo por índice.** En `game-world.component.ts`:
  - reemplazar `this.spawnNpcs(authoredClinicalRoom ? this.positionAuthoredClinicalNpcs(roomConfig.npcs) : roomConfig.npcs);` por `this.spawnNpcs(roomConfig.npcs);`
  - borrar el método `positionAuthoredClinicalNpcs` y quitar `AUTHORED_NPC_POSITIONS` del import de `./authored-clinical-room.util`.
  - red de seguridad al inicio del bucle de `spawnNpcs` (vale para ambas ramas — usar `pos.x/pos.y` al crear el container y registrar el mover):

```ts
      const pos = this.wouldCollide(npc.x, npc.y)
        ? freeTileNear({ x: npc.x, y: npc.y }, (x, y) => this.wouldCollide(x, y), 18, 3)
        : { x: npc.x, y: npc.y };
```

  En `authored-clinical-room.util.ts` borrar la constante `AUTHORED_NPC_POSITIONS` y su doc-comment.

- [ ] **Step 5.6:** `npx jest scenario-npc-configs --runInBand` → PASA. `npm run build` y `npm test -- --runInBand` → verdes.

- [ ] **Step 5.7: Verificación live rápida.** Con servers arriba: entrar al caso 1 y confirmar en navegador: 4 figuras modulares (nada Kenney en la sala principal), madre paseando con pausas, seguridad patrullando lento, NPCs quietos al abrir diálogo. Capturar `01-player-and-modular-npcs.png` y `02-npc-motion-zone.png` en la carpeta de auditoría.

- [ ] **Step 5.8: Commit.**

```powershell
git add frontend/src/assets/game/scenarios frontend/src/app/features/simulator/scenario-npc-configs.spec.ts frontend/src/app/features/simulator/game-world.component.ts frontend/src/app/features/simulator/authored-clinical-room.util.ts
git commit -m "feat(game): configurar npcs vivos en caso principal"
```

---

### Task 6: Estado de paciente + evidencia antes de decidir (Fases 8, 9, 12)

**Files:**
- Create: `frontend/src/app/features/simulator/patient-state.util.ts` + `patient-state.util.spec.ts`
- Create: `frontend/src/app/features/simulator/evidence-gating.config.ts` + `evidence-gating.config.spec.ts`
- Modify: `frontend/src/app/core/models/simulation.model.ts` (`DialogueChoiceState.evidenceWarning`)
- Modify: `frontend/src/app/core/api/simulation.service.ts` (`getInterventionRules`)
- Modify: `frontend/src/app/features/simulator/simulation-play.component.ts`
- Modify: `frontend/src/app/features/simulator/dialogue-panel.component.ts` (chip)
- Modify: `frontend/src/app/features/simulator/scene-objectives.config.ts`

- [ ] **Step 6.1: Specs que fallan.** Crear `patient-state.util.spec.ts`:

```ts
import {
  DEFAULT_INTERVENTION_RULES, PATIENT_INITIAL_STATE,
  applyFeedbackToPatient, applyPatientDelta, parseInterventionRules,
} from './patient-state.util';

describe('patient-state.util', () => {
  it('estado inicial documentado del contrato PatientState', () => {
    expect(PATIENT_INITIAL_STATE).toEqual({ emotionalState: 40, trustLevel: 20, openness: 15, crisisLevel: 60 });
  });

  it('aplica deltas por clasificación y clampa a [0,100]', () => {
    const next = applyFeedbackToPatient(PATIENT_INITIAL_STATE, DEFAULT_INTERVENTION_RULES,
      { classification: 'ADEQUATE', prohibitedConduct: false });
    expect(next).toEqual({ emotionalState: 50, trustLevel: 33, openness: 22, crisisLevel: 50 });
    let s = PATIENT_INITIAL_STATE;
    for (let i = 0; i < 10; i++) {
      s = applyFeedbackToPatient(s, DEFAULT_INTERVENTION_RULES, { classification: 'ADEQUATE', prohibitedConduct: false });
    }
    expect(s.trustLevel).toBeLessThanOrEqual(100);
    expect(s.crisisLevel).toBeGreaterThanOrEqual(0);
  });

  it('prohibida pisa la clasificación (deltas de "prohibited")', () => {
    const next = applyFeedbackToPatient(PATIENT_INITIAL_STATE, DEFAULT_INTERVENTION_RULES,
      { classification: 'INADEQUATE', prohibitedConduct: true });
    expect(next.trustLevel).toBe(0);          // 20 - 28 clampado
    expect(next.crisisLevel).toBe(83);        // 60 + 23
  });

  it('applyPatientDelta tolera deltas parciales', () => {
    expect(applyPatientDelta(PATIENT_INITIAL_STATE, { openness: 5 }).openness).toBe(20);
  });

  it('parseInterventionRules valida y cae al default ante basura', () => {
    expect(parseInterventionRules(null)).toEqual(DEFAULT_INTERVENTION_RULES);
    expect(parseInterventionRules({ nope: 1 })).toEqual(DEFAULT_INTERVENTION_RULES);
    const ok = parseInterventionRules(JSON.parse(JSON.stringify(DEFAULT_INTERVENTION_RULES)));
    expect(ok.byClassification.ADEQUATE.trustLevel).toBe(13);
  });
});
```

Crear `evidence-gating.config.spec.ts`:

```ts
import { SimulationWorldState } from '../../core/models/simulation.model';
import { NODE_EVIDENCE, missingEvidence, nodeEvidence, toolUsed, unlockedExtraLines } from './evidence-gating.config';

function worldWith(partial: Partial<SimulationWorldState>): SimulationWorldState {
  return {
    attemptId: 'a', status: 'IN_PROGRESS',
    map: { id: 1, key: 'urgencias-crisis', title: '', width: 960, height: 540, theme: '', spawnX: 0, spawnY: 0, ambient: {} },
    player: { x: 0, y: 0 }, objects: [], collisions: [], tools: [],
    inventory: [], inspectedObjectKeys: [], viewedDialogueKeys: [], usedToolKeys: [], flags: {},
    ...partial,
  };
}

describe('evidence-gating.config', () => {
  it('toolUsed acepta uso directo y uso con target (PAP@escucha-segura)', () => {
    expect(toolUsed(worldWith({ usedToolKeys: ['PAP'] }), 'PAP')).toBe(true);
    expect(toolUsed(worldWith({ usedToolKeys: ['PAP@escucha-segura'] }), 'PAP')).toBe(true);
    expect(toolUsed(worldWith({ usedToolKeys: ['RISK_METER'] }), 'PAP')).toBe(false);
  });

  it('urgencias exige enfermera + PAP; reporta exactamente lo que falta', () => {
    const def = nodeEvidence('urgencias-crisis')!;
    expect(missingEvidence(def, worldWith({}), new Set()))
      .toEqual(['npc:enfermera-urgencias', 'tool:PAP']);
    expect(missingEvidence(def, worldWith({ usedToolKeys: ['PAP'] }), new Set(['enfermera-urgencias'])))
      .toEqual([]);
  });

  it('las líneas extra solo se desbloquean con la evidencia completa y el diálogo correcto', () => {
    const def = nodeEvidence('urgencias-crisis')!;
    const ready = worldWith({ usedToolKeys: ['PAP'] });
    expect(unlockedExtraLines(def, 'escucha-segura', worldWith({}), new Set())).toEqual([]);
    expect(unlockedExtraLines(def, 'otro-dialogo', ready, new Set(['enfermera-urgencias']))).toEqual([]);
    expect(unlockedExtraLines(def, 'escucha-segura', ready, new Set(['enfermera-urgencias'])).length).toBeGreaterThan(0);
  });

  it('nodos sin definición no bloquean nada', () => {
    expect(nodeEvidence('cierre-seguimiento')).toBeNull();
    expect(missingEvidence(null, worldWith({}), new Set())).toEqual([]);
  });

  it('toda herramienta exigida usa tool_code reales de la BD (mayúsculas)', () => {
    const real = ['PAP', 'SPIKES', 'RISK_METER', 'SAFETY_ROUTE', 'REFLECTION_JOURNAL'];
    for (const def of Object.values(NODE_EVIDENCE)) {
      for (const tool of def.tools ?? []) expect(real).toContain(tool);
    }
  });
});
```

`npx jest patient-state evidence-gating --runInBand` → FALLA (módulos no existen).

- [ ] **Step 6.2: patient-state.util.ts.**

```ts
import {
  InterventionRuleSet, PatientState, PatientStateDelta, SimulationFeedback,
} from '../../core/models/simulation.model';

/** Estado inicial documentado en el contrato PatientState (Plan 3). */
export const PATIENT_INITIAL_STATE: PatientState = {
  emotionalState: 40, trustLevel: 20, openness: 15, crisisLevel: 60,
};

/** Espejo de assets/game/scenarios/intervention-rules.json (fallback offline). */
export const DEFAULT_INTERVENTION_RULES: InterventionRuleSet = {
  byClassification: {
    ADEQUATE:   { trustLevel: 13, emotionalState: 10, crisisLevel: -10, openness: 7 },
    RISKY:      { trustLevel: -7, crisisLevel: 9, openness: -3 },
    INADEQUATE: { trustLevel: -5, crisisLevel: 12, emotionalState: -6 },
  },
  prohibited: { trustLevel: -28, crisisLevel: 23, emotionalState: -18, openness: -17 },
};

const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

export function applyPatientDelta(state: PatientState, delta: PatientStateDelta): PatientState {
  return {
    emotionalState: clamp(state.emotionalState + (delta.emotionalState ?? 0)),
    trustLevel: clamp(state.trustLevel + (delta.trustLevel ?? 0)),
    openness: clamp(state.openness + (delta.openness ?? 0)),
    crisisLevel: clamp(state.crisisLevel + (delta.crisisLevel ?? 0)),
  };
}

/** Conducta prohibida pisa la clasificación (contrato InterventionRuleSet). */
export function applyFeedbackToPatient(
  state: PatientState,
  rules: InterventionRuleSet,
  feedback: Pick<SimulationFeedback, 'classification' | 'prohibitedConduct'>,
): PatientState {
  const delta = feedback.prohibitedConduct
    ? rules.prohibited
    : rules.byClassification[feedback.classification];
  return applyPatientDelta(state, delta ?? {});
}

function isDelta(x: unknown): x is PatientStateDelta {
  if (!x || typeof x !== 'object') return false;
  return Object.entries(x as Record<string, unknown>).every(
    ([k, v]) => ['emotionalState', 'trustLevel', 'openness', 'crisisLevel'].includes(k) && typeof v === 'number');
}

export function parseInterventionRules(raw: unknown): InterventionRuleSet {
  const r = raw as InterventionRuleSet | null;
  const by = r?.byClassification;
  if (by && isDelta(by.ADEQUATE) && isDelta(by.RISKY) && isDelta(by.INADEQUATE) && isDelta(r.prohibited)) {
    return r;
  }
  return DEFAULT_INTERVENTION_RULES;
}
```

- [ ] **Step 6.3: evidence-gating.config.ts.**

```ts
import { SimulationWorldState } from '../../core/models/simulation.model';

/**
 * Evidencia antes de decisión (Fase 9). Gating de PRESENTACIÓN: las opciones
 * siguen existiendo y el backend sigue siendo la autoridad del puntaje; aquí
 * solo se marca la decisión con información incompleta y se desbloquean líneas
 * narrativas al explorar. Nunca se revela cuál opción es la correcta.
 *
 * Claves reales: npcs = keys de NpcConfig (registro local de sesión);
 * tools = tool_code BD ('PAP', 'RISK_METER'…) contra world.usedToolKeys;
 * inspected = object_key contra world.inspectedObjectKeys.
 */
export interface NodeEvidenceDef {
  npcs?: string[];
  tools?: string[];
  inspected?: string[];
  missingMessage: string;
  unlockLines?: { dialogueKey: string; lines: string[] }[];
}

export const NODE_EVIDENCE: Record<string, NodeEvidenceDef> = {
  'urgencias-crisis': {
    npcs: ['enfermera-urgencias'],
    tools: ['PAP'],
    missingMessage: 'Información insuficiente: habla con la enfermera de turno y aplica Primeros Auxilios Psicológicos antes de definir la intervención.',
    unlockLines: [{
      dialogueKey: 'escucha-segura',
      lines: ['(Respira más despacio y te sostiene la mirada.) La semana pasada… él me amenazó con un cuchillo. No lo había contado. Tengo miedo por mis hijos.'],
    }],
  },
  'ruta-proteccion': {
    tools: ['RISK_METER'],
    missingMessage: 'Información insuficiente: aplica la valoración estructurada de riesgo antes de activar o descartar una ruta.',
  },
  'valoracion-comisaria': {
    tools: ['RISK_METER'],
    missingMessage: 'Información insuficiente: usa el instrumento de valoración estructurada antes de proponer medidas de protección.',
  },
};

export function nodeEvidence(nodeKey: string | undefined | null): NodeEvidenceDef | null {
  if (!nodeKey) return null;
  return NODE_EVIDENCE[nodeKey] ?? null;
}

export function toolUsed(world: SimulationWorldState, code: string): boolean {
  return world.usedToolKeys.some(k => k === code || k.startsWith(`${code}@`));
}

/** Lista lo que falta ('npc:x' | 'tool:X' | 'inspected:y'); vacía = evidencia completa. */
export function missingEvidence(
  def: NodeEvidenceDef | null | undefined,
  world: SimulationWorldState | null,
  viewedNpcKeys: ReadonlySet<string>,
): string[] {
  if (!def || !world) return [];
  const missing: string[] = [];
  for (const npc of def.npcs ?? []) if (!viewedNpcKeys.has(npc)) missing.push(`npc:${npc}`);
  for (const tool of def.tools ?? []) if (!toolUsed(world, tool)) missing.push(`tool:${tool}`);
  for (const key of def.inspected ?? []) if (!world.inspectedObjectKeys.includes(key)) missing.push(`inspected:${key}`);
  return missing;
}

/** Líneas narrativas desbloqueadas para un diálogo cuando la evidencia está completa. */
export function unlockedExtraLines(
  def: NodeEvidenceDef | null | undefined,
  dialogueKey: string,
  world: SimulationWorldState | null,
  viewedNpcKeys: ReadonlySet<string>,
): string[] {
  if (!def?.unlockLines || missingEvidence(def, world, viewedNpcKeys).length) return [];
  return def.unlockLines.filter(u => u.dialogueKey === dialogueKey).flatMap(u => u.lines);
}
```

`npx jest patient-state evidence-gating --runInBand` → PASA.

- [ ] **Step 6.4: modelo + servicio.** En `simulation.model.ts`, dentro de `DialogueChoiceState` (tras `isProhibited`):

```ts
  /** UI: la decisión se tomaría con información incompleta (gating frontend, Fase 9). */
  evidenceWarning?: string;
```

En `simulation.service.ts` (junto a `getScenarioConfig`):

```ts
  /** Reglas de reacción del paciente (asset frontend versionado). */
  getInterventionRules() {
    return this.http.get<unknown>('/assets/game/scenarios/intervention-rules.json');
  }
```

- [ ] **Step 6.5: integración en simulation-play.** Cambios en `simulation-play.component.ts`:

(a) Imports nuevos:

```ts
import { PatientState, InterventionRuleSet } from '../../core/models/simulation.model'; // sumar a los existentes
import {
  DEFAULT_INTERVENTION_RULES, PATIENT_INITIAL_STATE, applyFeedbackToPatient, parseInterventionRules,
} from './patient-state.util';
import { missingEvidence, nodeEvidence, unlockedExtraLines } from './evidence-gating.config';
```

(b) Estado nuevo (junto a los signals):

```ts
  readonly patientState = signal<PatientState>(PATIENT_INITIAL_STATE);
  private interventionRules: InterventionRuleSet = DEFAULT_INTERVENTION_RULES;
  private readonly viewedNpcKeys = signal<ReadonlySet<string>>(new Set<string>());
  private pendingEvidenceDecisionId: number | null = null;
```

(c) En `ngOnInit` (primera línea útil):

```ts
    this.simulationService.getInterventionRules().subscribe({
      next: raw => { this.interventionRules = parseInterventionRules(raw); },
      error: () => { this.interventionRules = DEFAULT_INTERVENTION_RULES; },
    });
```

(d) En `bootstrapAttempt`, tras `this.attempt.set(attempt);`:

```ts
    this.patientState.set(PATIENT_INITIAL_STATE);
    this.viewedNpcKeys.set(new Set<string>());
    this.pendingEvidenceDecisionId = null;
```

(e) En `openNpcDialogue`, primera línea del método (antes del guard de lines):

```ts
    this.viewedNpcKeys.update(prev => new Set(prev).add(npc.key));
```

(f) Decoración del diálogo backend — en `openBackendInteraction`, reemplazar `this.dialogue.set(result.dialogue ?? result.interaction.dialogue);` por `this.dialogue.set(this.decorateDialogue(result.dialogue ?? result.interaction.dialogue));` y añadir:

```ts
  /** Fase 9: líneas desbloqueadas por evidencia + marca de información incompleta
   *  + alerta honesta en choices de decisiones prohibidas. Solo presentación. */
  private decorateDialogue(dialogue: DialogueState | null): DialogueState | null {
    if (!dialogue) return null;
    const node = this.attempt()?.currentNode;
    const def = nodeEvidence(node?.key);
    const extras = unlockedExtraLines(def, dialogue.key, this.world(), this.viewedNpcKeys());
    const lines = extras.length
      ? [...dialogue.lines, ...extras.map((text, i) => ({
          order: dialogue.lines.length + i + 1,
          speakerName: dialogue.speakerName, text, emotion: 'positive',
        }))]
      : dialogue.lines;
    const missing = missingEvidence(def, this.world(), this.viewedNpcKeys());
    const optionById = new Map((node?.options ?? []).map(o => [o.id, o]));
    const choices = dialogue.choices.map(choice => {
      if (choice.decisionOptionId == null) return choice;
      const option = optionById.get(choice.decisionOptionId);
      return {
        ...choice,
        isProhibited: choice.isProhibited || option?.prohibitedConduct || false,
        ...(missing.length && def ? { evidenceWarning: def.missingMessage } : {}),
      };
    });
    return { ...dialogue, lines, choices };
  }
```

(g) Gate de decisión — al inicio de `executeDecision`, tras el guard `if (!game || this.busy()) return;`:

```ts
    if (!(game.currentNode.options ?? []).some(o => o.id === decisionOptionId)) {
      this.showActionError('Esta intervención pertenece a otra etapa del caso. Vuelve cuando el flujo te lleve a esta sala.');
      return;
    }
    const def = nodeEvidence(game.currentNode.key);
    const missing = missingEvidence(def, this.world(), this.viewedNpcKeys());
    if (def && missing.length && this.pendingEvidenceDecisionId !== decisionOptionId) {
      this.pendingEvidenceDecisionId = decisionOptionId;
      this.dialogue.set(this.buildEvidenceGateDialogue(def.missingMessage, decisionOptionId));
      this.announce(def.missingMessage);
      return;
    }
    this.pendingEvidenceDecisionId = null;
```

con el builder:

```ts
  private buildEvidenceGateDialogue(message: string, decisionOptionId: number): DialogueState {
    return {
      key: `evidence-gate-${decisionOptionId}`,
      speakerName: 'Criterio profesional', portraitKey: 'info', emotion: 'concerned',
      lines: [
        { order: 1, speakerName: 'Criterio profesional', text: message, emotion: 'concerned' },
        { order: 2, speakerName: 'Criterio profesional', text: 'Puedes intervenir igualmente, pero quedará registrada como una decisión con información incompleta.', emotion: 'neutral' },
      ],
      choices: [
        { key: 'frontend:cancel-evidence', text: 'Explorar primero', decisionOptionId: null, requiredToolCode: null, effect: {}, isRecommended: true },
        { key: `frontend:proceed-evidence:${decisionOptionId}`, text: 'Decidir con información incompleta', decisionOptionId: null, requiredToolCode: null, effect: {} },
      ],
    };
  }
```

(h) En `handleFrontendChoice`, añadir antes de los branches actuales:

```ts
    if (key === 'frontend:cancel-evidence') {
      this.pendingEvidenceDecisionId = null;
      this.closeDialogue();
      return;
    }
    if (key.startsWith('frontend:proceed-evidence:')) {
      const id = Number(key.split(':')[2]);
      this.dialogue.set(null);
      if (Number.isFinite(id)) this.executeDecision(id);
      return;
    }
```

(i) Consecuencia visible en la paciente — en `executeDecision` → `next:`, dentro del `if (updated.feedback)` existente, antes del `setTimeout`:

```ts
            const nextPatient = applyFeedbackToPatient(this.patientState(), this.interventionRules, updated.feedback);
            this.patientState.set(nextPatient);
            this.gameWorld?.updatePatientVisualState(nextPatient);
```

(j) Wiring HUD — en el template, dentro de `<app-simulation-hud ...>`: añadir `[patientState]="patientState()"`.

- [ ] **Step 6.6: chip de evidencia en el panel.** En `dialogue-panel.component.ts`, tras el bloque `@if (choice.isProhibited) {...}` del template:

```html
                    @if (choice.evidenceWarning) {
                      <span class="choice-btn__meta choice-btn__meta--evidence">Información incompleta</span>
                    }
```

estilo (junto a `.choice-btn--prohibited`):

```css
    .choice-btn__meta--evidence {
      border-color: rgba(245,184,75,.6);
      color: #f5d49b;
    }
```

y en el `aria-label` del botón sumar `+ (choice.evidenceWarning ? ' (información incompleta)' : '')`.

- [ ] **Step 6.7: objetivos faltantes.** En `scene-objectives.config.ts` añadir a `SCENE_OBJECTIVES`:

```ts
  'ruta-proteccion':
    'Activa la ruta institucional con criterio: valora el riesgo con instrumento estructurado y prioriza la seguridad de la consultante y sus hijos.',
  'informe-integral':
    'Documenta un informe integral no revictimizante: motivo de consulta, estado mental, riesgo de feminicidio e impacto en los niños.',
```

- [ ] **Step 6.8:** `npm run build` → OK. `npm test -- --runInBand` → verde (si algún spec de dialogue-panel/simulation-hud rompe por el campo nuevo, ajustarlo aquí mismo).

- [ ] **Step 6.9: Commit.**

```powershell
git add frontend/src/app/features/simulator/patient-state.util.ts frontend/src/app/features/simulator/patient-state.util.spec.ts frontend/src/app/features/simulator/evidence-gating.config.ts frontend/src/app/features/simulator/evidence-gating.config.spec.ts frontend/src/app/core/models/simulation.model.ts frontend/src/app/core/api/simulation.service.ts frontend/src/app/features/simulator/simulation-play.component.ts frontend/src/app/features/simulator/dialogue-panel.component.ts frontend/src/app/features/simulator/scene-objectives.config.ts
git commit -m "feat(game): fortalecer flujo de decisiones y evidencia"
```

---

### Task 7: Puertas entre salas con `enterRoom` (Fase 10)

**Files:**
- Create: `backend_django/apps/simulation/management/commands/seed_competitive_doors.py`
- Modify: `backend_django/apps/simulation/tests/test_world.py`
- Modify: `frontend/src/app/features/simulator/authored-clinical-room.util.ts` (posiciones de puertas)
- Modify: `frontend/src/app/features/simulator/game-world.component.ts` (spawn respeta entrada, marker de puerta autoría)
- Modify: `frontend/src/app/features/simulator/simulation-play.component.ts` (E sobre puerta → `enterRoom`, gating, wiring outputs)

- [ ] **Step 7.1: Test backend que falla.** Añadir al final de `test_world.py` (usa el helper `_start` y fixtures ya presentes en el archivo):

```python
def test_seed_competitive_doors_idempotente_y_jugable(estudiante, case_version_id):
    import json as _json
    from django.core.management import call_command
    from apps.simulation.models import MapObject, SceneMap

    call_command("seed_competitive_doors", case_version=case_version_id)
    call_command("seed_competitive_doors", case_version=case_version_id)  # idempotente

    urgencias = SceneMap.objects.filter(
        case_version_id=case_version_id, node__node_key="urgencias-crisis"
    ).first()
    doors = MapObject.objects.filter(scene_map_id=urgencias.id, object_key="puerta-sala-escucha")
    assert doors.count() == 1
    door = doors.first()
    assert door.object_type == "EXIT"
    meta = _json.loads(door.metadata_json)
    assert meta["targetNodeKey"] == "ruta-proteccion"
    assert meta["requiresNpcs"] == ["enfermera-urgencias"]

    ruta = SceneMap.objects.filter(
        case_version_id=case_version_id, node__node_key="ruta-proteccion"
    ).first()
    back = MapObject.objects.filter(scene_map_id=ruta.id, object_key="puerta-urgencias").first()
    assert back is not None
    assert _json.loads(back.metadata_json)["targetNodeKey"] == "urgencias-crisis"

    # la puerta es jugable con el endpoint enter-room existente
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    resp = c.post(
        f"/api/simulation/attempts/{attempt_id}/enter-room",
        {"attemptToken": token, "targetNodeKey": meta["targetNodeKey"],
         "entryX": meta["entryX"], "entryY": meta["entryY"]},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["data"]["map"]["key"] == "ruta-proteccion"
```

(Si `test_world.py` no define `_start`, copiar el helper de 2 líneas desde `test_game.py` — verificarlo al editar.)

Correr: `cd backend_django; .\.venv\Scripts\python.exe -m pytest apps\simulation\tests\test_world.py -q` → FALLA (comando no existe).

- [ ] **Step 7.2: Management command.** Crear `backend_django/apps/simulation/management/commands/seed_competitive_doors.py`:

```python
"""Puertas espaciales del caso competitivo (vertical slice SIM-VBG-001).

Crea/actualiza objetos EXIT cuyo metadata {targetNodeKey, entryX, entryY,
requiresNpcs?, lockedMessage?} consume el frontend junto al endpoint
enter-room existente (Fase 5 del editor). Idempotente: corre N veces sin
duplicar. No toca el DAG ni las decisiones.
"""
import json

from django.core.management.base import BaseCommand, CommandError

from apps.simulation.models import CaseVersion, MapObject, SceneMap

DOORS = [
    {
        "node_key": "urgencias-crisis",
        "object_key": "puerta-sala-escucha",
        "label": "Sala de escucha",
        "prompt": "Pasar a la sala de escucha",
        "position": (912, 330),
        "metadata": {
            "targetNodeKey": "ruta-proteccion",
            "entryX": 170,
            "entryY": 430,
            "requiresNpcs": ["enfermera-urgencias"],
            "lockedMessage": (
                "La sala de escucha se está preparando. Habla primero con la "
                "enfermera de turno para recibir el contexto clínico."
            ),
        },
    },
    {
        "node_key": "ruta-proteccion",
        "object_key": "puerta-urgencias",
        "label": "Sala de urgencias",
        "prompt": "Volver a la sala de urgencias",
        "position": (48, 330),
        "metadata": {"targetNodeKey": "urgencias-crisis", "entryX": 800, "entryY": 330},
    },
]


class Command(BaseCommand):
    help = "Crea/actualiza las puertas EXIT del caso competitivo (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--case-code", default="SIM-VBG-001")
        parser.add_argument("--case-version", type=int, default=None,
                            help="Id de case_version explícito (tests).")

    def handle(self, *args, **options):
        if options["case_version"]:
            version = CaseVersion.objects.filter(pk=options["case_version"]).first()
        else:
            version = (
                CaseVersion.objects.filter(
                    simulation_case__code=options["case_code"], status="PUBLISHED"
                ).order_by("id").first()
            )
        if not version:
            raise CommandError("No se encontró la versión del caso para sembrar puertas")

        created = updated = 0
        for door in DOORS:
            scene_map = SceneMap.objects.filter(
                case_version_id=version.id, node__node_key=door["node_key"]
            ).first()
            if not scene_map:
                self.stderr.write(f"Sin mapa para nodo {door['node_key']} — puerta omitida")
                continue
            _, was_created = MapObject.objects.update_or_create(
                scene_map=scene_map,
                object_key=door["object_key"],
                defaults={
                    "label": door["label"],
                    "object_type": "EXIT",
                    "position_x": door["position"][0],
                    "position_y": door["position"][1],
                    "width": 36,
                    "height": 48,
                    "color_hex": "#B69CFF",
                    "icon": "door_front",
                    "short_code": "EXIT",
                    "collision": False,
                    "visible": True,
                    "interaction_prompt": door["prompt"],
                    "interaction_text": door["label"],
                    "metadata_json": json.dumps(door["metadata"]),
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f"Puertas: {created} creadas, {updated} actualizadas"))
```

- [ ] **Step 7.3:** pytest de nuevo → PASA. Aplicar a la BD dev (las puertas de la demo): `.\.venv\Scripts\python.exe manage.py seed_competitive_doors` → "Puertas: 2 creadas, 0 actualizadas".

- [ ] **Step 7.4: Posiciones autoría de las puertas.** En `authored-clinical-room.util.ts`, añadir a `AUTHORED_MARKER_POSITIONS`:

```ts
  'puerta-sala-escucha':     { x: 838, y: 316 },  // puerta derecha → sala de escucha
  'puerta-urgencias':        { x: 122, y: 316 },  // puerta izquierda → volver a urgencias
```

- [ ] **Step 7.5: game-world — spawn de entrada + marker de puerta.**

(a) En `renderRoom`, reemplazar el cálculo de `spawn` por uno que respete la posición que `enter_room` persistió en el backend (entryX/entryY → `world.player`):

```ts
    const persisted = this.world ? { x: this.world.player.x, y: this.world.player.y } : null;
    const spawn = keepPosition ?? (authoredClinicalRoom
      ? (persisted && !this.wouldCollide(persisted.x, persisted.y)
          ? persisted
          : { x: AUTHORED_PLAYER_SPAWN.x, y: AUTHORED_PLAYER_SPAWN.y })
      : { x: spawnX, y: spawnY });
```

(b) En `createMarker`, rama `isExit`: cuando `this.authoredRoomActive`, en lugar del tile Kenney dibujar una puerta sobria (la sala premium no debe mezclar estilos):

```ts
      if (isExit && this.authoredRoomActive) {
        const frame = this.add.rectangle(0, -10, 34, 46, 0x1a1530, 0.92).setStrokeStyle(2, 0xb69cff, 0.8);
        const panel = this.add.rectangle(0, -10, 24, 36, 0x2a2348, 1);
        const knob = this.add.circle(7, -8, 2.5, 0xb69cff, 1);
        main = this.add.container(0, 0, [frame, panel, knob]);
      } else if (isExit && this.textures.exists('dungeon-tiles')) {
        // rama Kenney actual sin cambios
```

- [ ] **Step 7.6: simulation-play — E sobre puerta → enterRoom con gating.**

(a) Template `<app-game-world ...>`: añadir `(roomExit)="onRoomExit($event)"` y `(enterRoom)="onDoorTrigger($event)"`.

(b) En `openInteraction`, tras el guard de status:

```ts
    if (interaction.type === 'EXIT' && this.doorTargetNodeKey(interaction)) {
      this.tryOpenDoor(interaction);
      return;
    }
```

(c) Métodos nuevos (junto a `openBackendInteraction`):

```ts
  private doorTargetNodeKey(obj: MapObjectState): string | null {
    const target = (obj.metadata as { targetNodeKey?: unknown } | undefined)?.targetNodeKey;
    return typeof target === 'string' && target ? target : null;
  }

  /** Fase 10: puerta espacial NO puntuada — usa el enterRoom existente. */
  private tryOpenDoor(door: MapObjectState) {
    const game = this.attempt();
    const target = this.doorTargetNodeKey(door);
    if (!game || !target || this.busy()) return;
    const meta = (door.metadata ?? {}) as {
      entryX?: number; entryY?: number; requiresNpcs?: string[];
      requiresTools?: string[]; requiresInspected?: string[]; lockedMessage?: string;
    };
    const missing = missingEvidence(
      { npcs: meta.requiresNpcs, tools: meta.requiresTools, inspected: meta.requiresInspected, missingMessage: '' },
      this.world(), this.viewedNpcKeys(),
    );
    if (missing.length) {
      const message = meta.lockedMessage ?? 'Aún no puedes pasar: te falta información clave de esta sala.';
      this.audioDirector.playSfx('ui_cancel');
      this.dialogue.set({
        key: `door-locked-${door.key}`, speakerName: door.label, portraitKey: 'door', emotion: 'neutral',
        lines: [{ order: 1, speakerName: door.label, text: message, emotion: 'neutral' }],
        choices: [],
      });
      this.announce(message);
      return;
    }
    this.busy.set(true);
    this.triggerFade(() => {
      this.simulationService.enterRoom(
        game.attemptId, game.attemptToken, target, Number(meta.entryX ?? 0), Number(meta.entryY ?? 0),
      ).subscribe({
        next: world => {
          this.selectedInteraction.set(null);
          this.nearbyInteraction.set(null);
          this.dialogue.set(null);
          this.applyWorldWithScenario(world);
          this.announce(`Entraste a ${world.map.title}.`);
        },
        error: () => { this.showActionError('No pudimos cruzar la puerta.'); this.busy.set(false); this.fadeActive.set(false); },
      });
    });
  }

  onRoomExit(event: { targetRoomKey: string; entryX: number; entryY: number }) {
    this.gameWorld?.transitionToRoom(event.targetRoomKey, event.entryX, event.entryY);
  }

  /** Disparo walk-over legacy (mapas sin scenarioConfig) — misma puerta gateada. */
  onDoorTrigger(event: { targetNodeKey: string; entryX: number; entryY: number }) {
    const door = this.world()?.objects.find(
      o => o.type === 'EXIT' && this.doorTargetNodeKey(o) === event.targetNodeKey,
    );
    if (door) this.tryOpenDoor(door);
  }

  /** Carga el ScenarioConfig que corresponde al mapa del mundo y aplica ambos. */
  private applyWorldWithScenario(world: SimulationWorldState): void {
    this.scenarioConfig.set(null);
    this.simulationService.getScenarioConfig(world.map.key).subscribe({
      next: config => { this.scenarioConfig.set(config); this.applyLoadedWorld(world); },
      error: () => this.applyLoadedWorld(world),
    });
  }
```

(d) Refactor de `loadWorld` para usar el helper (mismo comportamiento): el cuerpo del `next:` pasa a ser `next: world => this.applyWorldWithScenario(world),` (se elimina el `getScenarioConfig` anidado duplicado).

- [ ] **Step 7.7:** `npm run build` + `npm test -- --runInBand` → verdes. Backend: `.\.venv\Scripts\python.exe -m pytest apps\simulation -q` → verde.

- [ ] **Step 7.8: Verificación live.** En el navegador: cerca de la puerta derecha el context bar dice "Sala de escucha →"; con E sin hablar con la enfermera → diálogo de puerta bloqueada; tras hablarle → fade y cambio a la sala de escucha apareciendo a la izquierda; volver por `puerta-urgencias` funciona y se conserva al refrescar (persistencia `enter_room`). Decisiones de la otra etapa muestran el toast claro. Capturas: `03-door-prompt.png`, `04-room-transition.png`.

- [ ] **Step 7.9: Commit.**

```powershell
git add backend_django/apps/simulation/management/commands/seed_competitive_doors.py backend_django/apps/simulation/tests/test_world.py frontend/src/app/features/simulator/authored-clinical-room.util.ts frontend/src/app/features/simulator/game-world.component.ts frontend/src/app/features/simulator/simulation-play.component.ts
git commit -m "feat(game): conectar salas por puertas de caso"
```

---

### Task 8: Reporte final con línea de tiempo (Fase 11)

**Files:**
- Modify: `backend_django/apps/simulation/serializers/game_dtos.py`
- Modify: `backend_django/apps/simulation/tests/test_game.py`
- Modify: `frontend/src/app/core/models/simulation.model.ts`
- Modify: `frontend/src/app/features/simulator/attempt-outcome.component.ts`
- Modify: `frontend/src/app/features/simulator/attempt-outcome.component.spec.ts`

- [ ] **Step 8.1: Test backend que falla.** En `test_game.py` (reusar fixtures/helpers del archivo — elegir una decisión y luego safe-exit para cerrar el intento):

```python
def test_completion_report_includes_timeline(estudiante, case_version_id):
    c = cl(estudiante)
    attempt = c.post("/api/simulation/attempts",
                     {"caseVersionId": case_version_id, "forceNew": True}, format="json").data["data"]
    attempt_id, token = attempt["attemptId"], attempt["attemptToken"]
    option_id = attempt["currentNode"]["options"][0]["id"]
    c.post(f"/api/simulation/attempts/{attempt_id}/decisions",
           {"attemptToken": token, "decisionOptionId": option_id}, format="json")
    c.post(f"/api/simulation/attempts/{attempt_id}/safe-exit",
           {"attemptToken": token, "reason": "test"}, format="json")

    report = c.get(
        f"/api/simulation/attempts/{attempt_id}/completion-report?attemptToken={token}"
    ).data["data"]

    assert "timeline" in report
    decisions = [t for t in report["timeline"]
                 if t["type"] in ("DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED")]
    assert decisions, "la decisión elegida debe aparecer en la línea de tiempo"
    entry = decisions[0]
    assert entry["label"]
    assert entry["classification"] in ("ADEQUATE", "RISKY", "INADEQUATE")
    assert entry["time"].count(":") == 1          # mm:ss
    assert isinstance(entry["scoreDelta"], int)
    assert isinstance(entry["stressDelta"], int)
    assert report["totalDurationSeconds"] is None or report["totalDurationSeconds"] >= 0
```

pytest → FALLA (`timeline` no existe).

- [ ] **Step 8.2: Backend.** En `game_dtos.py`, antes de `build_completion_report` añadir:

```python
TIMELINE_EVENT_TYPES = {
    "DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED",
    "TOOL_USED", "ROOM_ENTERED", "SAFE_EXIT_REQUESTED",
}


def _format_mmss(seconds):
    if seconds is None:
        return "--:--"
    minutes, secs = divmod(max(0, int(seconds)), 60)
    return f"{minutes:02d}:{secs:02d}"


def build_timeline(attempt, events):
    """Línea de tiempo de decisiones/acciones clave para el reporte del estudiante."""
    start = attempt.started_at
    timeline = []
    for ev in events:
        if ev.event_type not in TIMELINE_EVENT_TYPES:
            continue
        seconds = None
        if start and ev.occurred_at:
            seconds = int((ev.occurred_at - start).total_seconds())
        decision = ev.decision_option if ev.decision_option_id else None
        timeline.append({
            "atSeconds": seconds,
            "time": _format_mmss(seconds),
            "type": ev.event_type,
            "classification": decision.classification if decision else None,
            "prohibited": bool(decision.prohibited_conduct) if decision else False,
            "label": (decision.text if decision else ev.detail) or "",
            "scoreDelta": ev.score_delta,
            "stressDelta": ev.stress_delta,
        })
    return timeline
```

y en el dict que retorna `build_completion_report`, después de `"summaryMessage": summary,` (dentro del dict) añadir:

```python
        "totalDurationSeconds": (
            int((attempt.ended_at - attempt.started_at).total_seconds())
            if attempt.started_at and attempt.ended_at else None
        ),
        "timeline": build_timeline(attempt, events),
```

- [ ] **Step 8.3:** pytest → PASA (suite completa `apps\simulation`).

- [ ] **Step 8.4: Frontend modelo.** En `simulation.model.ts`, antes de `AttemptCompletionReport`:

```ts
export interface AttemptTimelineEntry {
  atSeconds: number | null;
  time: string;
  type: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE' | null;
  prohibited: boolean;
  label: string;
  scoreDelta: number;
  stressDelta: number;
}
```

y dentro de `AttemptCompletionReport`: `timeline?: AttemptTimelineEntry[];`.

- [ ] **Step 8.5: Outcome UI.** En `attempt-outcome.component.ts`, después del bloque `oc-bars`/`oc-chips` (dentro del `@if (report(); as r)`) añadir:

```html
          <div class="oc-block">
            <p class="oc-label">Consecuencias del caso</p>
            <div class="oc-chips">
              <span class="oc-chip">Confianza final: {{ r.metrics.userTrust }}%</span>
              <span class="oc-chip">Riesgo final: {{ r.metrics.victimRisk }}%</span>
              <span class="oc-chip" [class.oc-chip--ok]="r.metrics.institutionalRouteActivated">
                Ruta institucional: {{ r.metrics.institutionalRouteActivated ? 'activada' : 'no activada' }}
              </span>
              @if (r.metrics.revictimizationRisk) {
                <span class="oc-chip oc-chip--alert">Riesgo de revictimización detectado</span>
              }
            </div>
          </div>

          @if (r.timeline?.length) {
            <div class="oc-block">
              <p class="oc-label">Línea de tiempo de decisiones clave</p>
              <ol class="oc-timeline">
                @for (t of r.timeline; track $index) {
                  <li class="oc-tl" [attr.data-tl]="t.prohibited ? 'PROHIBITED' : (t.classification ?? 'EVENT')">
                    <span class="oc-tl__time">{{ t.time }}</span>
                    <span class="oc-tl__label">{{ t.label }}</span>
                    @if (t.scoreDelta || t.stressDelta) {
                      <span class="oc-tl__delta">{{ t.scoreDelta >= 0 ? '+' : '' }}{{ t.scoreDelta }} pts · estrés {{ t.stressDelta >= 0 ? '+' : '' }}{{ t.stressDelta }}%</span>
                    }
                  </li>
                }
              </ol>
            </div>
          }
```

estilos (junto a `.oc-chip--alert`):

```css
    .oc-chip--ok { border-color: rgba(110,198,122,.5); color: #a9e2b1; }
    .oc-timeline { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .oc-tl {
      display: grid; grid-template-columns: 52px 1fr auto; gap: 10px; align-items: baseline;
      padding: 8px 10px; border-radius: 10px; border-left: 3px solid rgba(182,156,255,.4);
      background: rgba(255,255,255,.04); font-size: .82rem;
    }
    .oc-tl[data-tl='ADEQUATE']   { border-left-color: #6EC67A; }
    .oc-tl[data-tl='RISKY']      { border-left-color: #F5B84B; }
    .oc-tl[data-tl='INADEQUATE'] { border-left-color: #E25A4F; }
    .oc-tl[data-tl='PROHIBITED'] { border-left-color: #E25A4F; background: rgba(226,90,79,.08); }
    .oc-tl__time { font-family: 'JetBrains Mono', monospace; color: var(--sim-lavender, #B69CFF); }
    .oc-tl__label { color: var(--sim-ink-soft, rgba(244,247,251,.74)); line-height: 1.4; }
    .oc-tl__delta { font-family: 'JetBrains Mono', monospace; font-size: .72rem; color: var(--sim-ink-mute, rgba(244,247,251,.5)); white-space: nowrap; }
```

- [ ] **Step 8.6: Spec de outcome.** En `attempt-outcome.component.spec.ts`, extender el report de prueba existente con `timeline` (una entrada ADEQUATE y una prohibited) y asertar que el DOM contiene `Línea de tiempo de decisiones clave`, el `time` y los `data-tl` correctos (seguir el patrón de aserciones del archivo).

- [ ] **Step 8.7:** `npm run build` + `npm test -- --runInBand` → verdes.

- [ ] **Step 8.8: Commit.**

```powershell
git add backend_django/apps/simulation/serializers/game_dtos.py backend_django/apps/simulation/tests/test_game.py frontend/src/app/core/models/simulation.model.ts frontend/src/app/features/simulator/attempt-outcome.component.ts frontend/src/app/features/simulator/attempt-outcome.component.spec.ts
git commit -m "feat(game): mejorar reporte final de consecuencias"
```

---

### Task 9: Auditoría E2E live + cierre (Fases 19-21)

**Files:**
- Create: `tools/smoke-test/flujo_competitivo_audit.py` (adaptación de `c_phase_audit.py`)
- Create: `docs/audit-flujo-competitivo-npcs-2026-06-11/REPORTE.md` + capturas + `14-measurements.json`

- [ ] **Step 9.1: Gate completo de tests.**

```powershell
cd frontend
npm run build               # OK sin errores
npm test -- --runInBand     # todas las suites verdes
cd ..\backend_django
.\.venv\Scripts\python.exe manage.py test apps.simulation   # o pytest equivalente — verde
git status --short
```

- [ ] **Step 9.2: Script de auditoría.** Leer `tools/smoke-test/c_phase_audit.py` y `capture.py`; crear `flujo_competitivo_audit.py` sobre ese patrón (login estudiante, focus canvas, acciones hold:key) que recorra y capture en `docs/audit-flujo-competitivo-npcs-2026-06-11/`:
  - `01-player-and-modular-npcs.png` (sala urgencias con los 4 NPCs modulares + paciente)
  - `02-npc-motion-zone.png` (segunda captura ≥6s después — madre/seguridad en otra posición)
  - `03-door-prompt.png` (jugador junto a la puerta, context bar con destino)
  - `04-room-transition.png` (sala de escucha tras cruzar)
  - `05-stage-1-good-path.png` (feedback tras PAP→escucha-segura adecuada)
  - `06-stage-1-risky-path.png` (gate de evidencia o aviso-policial riesgosa)
  - `07-stage-2-dialogue.png` (diálogo con línea desbloqueada de la paciente)
  - `08-stage-3-risk-assessment.png` (tool-riesgo / ficha en ruta)
  - `09-final-report-good.png` y `10-final-report-bad-or-risky.png` (outcome con timeline; el malo forzando decisiones riesgosas/prohibidas + safe-exit)
  - `11-mobile-explore.png`, `12-mobile-dialogue.png`, `13-mobile-report.png` (390×844, tocar los botones táctiles del nudge)
  - `14-measurements.json`: viewport, canvas rect, `document.documentElement.scrollWidth` vs `clientWidth` (sin overflow), errores de consola, requests 404, lista de NPCs modulares detectados.
- [ ] **Step 9.3: Pasada manual de los 20 puntos** de la prueba E2E del prompt maestro (§20) en desktop 1600×900 y 1366×768 + mobile 390×844; anotar resultados.
- [ ] **Step 9.4: REPORTE.md** con la tabla de los 24 criterios de aceptación (§21) → cada uno con evidencia (captura/medición/test). Cualquier criterio rojo se arregla ANTES de cerrar.
- [ ] **Step 9.5: Commit final.**

```powershell
git add tools/smoke-test/flujo_competitivo_audit.py docs/audit-flujo-competitivo-npcs-2026-06-11 docs/superpowers/plans/2026-06-11-flujo-competitivo-npcs-modulares.md
git commit -m "test(game): auditoria e2e de flujo competitivo"
git status --short
```

---

## Self-review (cobertura del spec)

| Spec § | Cubierto por |
|---|---|
| §6 nudge táctil | Task 1 |
| §7 contrato NPC | Task 2 (modelo) |
| §8 presets visuales | Task 2 (presets + render hints; 'rojizo' adaptado a `hairVariantPatch('red')`) |
| §9 render modular Phaser | Task 3 (texturas/anims por preset, fallback Kenney, paciente PERSON modular) |
| §10 movimiento por zonas | Task 4 (6 behaviors, colisión, pausa en diálogo, reduced motion, y-sort por pies) |
| §11 NPCs del caso | Task 5 (urgencias 4 modulares + paciente, ruta 2, comisaría 4; zonas validadas por spec contra colisiones reales) |
| §12 flujo 6 etapas | Ya existe en BD (verificado); reforzado por Tasks 6-8; objetivos faltantes en Task 6.7 |
| §13 consecuencias visibles | Task 6 (PatientState + HUD bars + tint/shake paciente) — `decision_effects` backend ya aplica métricas |
| §14 evidencia antes de decidir | Task 6 (gate + unlock lines + chip; prohibidas ya gateadas por `risky-interaction.config`) |
| §15 puertas con propósito | Task 7 (seed EXIT + enterRoom existente + bloqueo con feedback + volver) |
| §16 reporte competitivo | Task 8 (timeline mm:ss + consecuencias + recomendación existente) |
| §17 HUD | Task 6 (patientState cableado; stage/objective ya existían; sin rediseño) |
| §18 a11y/reduced motion | Task 4 (idle/facing), Task 6-7 (announce, diálogos accesibles existentes) |
| §19 tests | Tasks 1-8 (jest + pytest por task) |
| §20 auditoría live | Tasks 0 y 9 |
| §22 prohibiciones | Sin Babylon/HUD nuevo/puertas paralelas/Kenney nuevo; renderer no toca gameplay |

**Riesgos conocidos para el ejecutor:**
1. `manage.py test apps.simulation` puede fallar creando la test-DB en Postgres docker; el equivalente aceptado es `python -m pytest apps/simulation` (mismo runner de los 129 tests históricos).
2. Jest + jsdom: NUNCA usar `Phaser` en posición de valor a nivel de módulo en helpers testeados (patrón `import type` — ver memoria fase C).
3. La BD dev está sucia con versiones duplicadas: el comando de puertas usa `--case-version` en tests y `status=PUBLISHED + order_by(id).first()` en dev (la v1 canónica es id=1).
4. Si `escucha-segura` se ve tapada por la madre en live, ajustar anchors del JSON (la auditoría lo detecta).
5. Posiciones/zonas de NPC pueden requerir afinado visual en Step 5.7/9.x — el spec de colisiones garantiza lo estructural, el ojo decide lo estético.
