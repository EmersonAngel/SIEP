# Game Interface / HUD Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the in-game HUD and overlays (and fix the menu sign overlap) so nothing truncates or collides — keeping the existing clinical visual style, no new assets, no mechanic changes.

**Architecture:** Layout/CSS/template changes in four Angular+Phaser files, plus one new pure helper (the bottom-dock priority resolver) that is the only unit-testable seam. The top HUD becomes a two-tier stack (vitals/location/status row + a full-width objective line); the bottom transient messages are gated by the resolver so only one shows at a time, with the controls reminder demoted to a collapsed corner pill; the Phaser guide bubble is clamped to the camera view and world labels are softened; the menu sign is pinned as a top header so it no longer overlaps door titles.

**Tech Stack:** Angular 21 standalone + signals, Phaser 3, Jest (`ts-jest`, jsdom). All work in `psicologia_proyecto/admin-panel`. **Base branch: `feat/game-shell`.**

**Spec:** `docs/superpowers/specs/2026-06-02-game-interface-hud-design.md`

**Verification reality:** Only the dock resolver is unit-testable (Task 1, TDD). The rest is layout — verified by `tsc` + `ng build` + live screenshots, exactly as the spec's testing section states. A working live-drive recipe already exists (see Task 6).

---

## File Structure

All paths under `psicologia_proyecto/admin-panel/`.

- Create: `src/app/features/simulator/hud-dock.util.ts` — pure `resolveDock()` priority resolver.
- Create: `src/app/features/simulator/hud-dock.util.spec.ts` — Jest tests.
- Modify: `src/app/features/simulator/simulation-hud.component.ts` — two-tier top bar (template + styles); class logic unchanged.
- Modify: `src/app/features/simulator/simulation-play.component.ts` — wire `resolveDock` to gate the proximity dock; demote controls hint to a collapsed pill; nudge the minimap down.
- Modify: `src/app/features/simulator/game-world.component.ts` — clamp the guide bubble to the camera view; soften environment zone labels.
- Modify: `src/app/features/simulator/game-menu.component.ts` — pin the clinic sign as a top header; give door title/badge clearance.

---

## Task 1: Bottom-dock priority resolver (TDD)

The one piece of logic: decide which single message the bottom dock shows. Pure function, Jest-tested.

**Files:**
- Create: `src/app/features/simulator/hud-dock.util.ts`
- Create: `src/app/features/simulator/hud-dock.util.spec.ts`

All commands run from `D:\Sua_Files\IdeaProjects\psicologia_proyecto\admin-panel`.

- [ ] **Step 1: Write the failing test**

Create `src/app/features/simulator/hud-dock.util.spec.ts`:

```typescript
import { resolveDock } from './hud-dock.util';

describe('resolveDock', () => {
  it('hides the dock when a dialogue panel is open (even if near an interaction)', () => {
    expect(resolveDock({ dialogueOpen: true, hasNearbyInteraction: true })).toBeNull();
  });

  it('shows the interaction prompt when near an interaction and no dialogue', () => {
    expect(resolveDock({ dialogueOpen: false, hasNearbyInteraction: true })).toBe('interaction');
  });

  it('shows nothing when there is no nearby interaction', () => {
    expect(resolveDock({ dialogueOpen: false, hasNearbyInteraction: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/app/features/simulator/hud-dock.util.spec.ts`
Expected: FAIL — `Cannot find module './hud-dock.util'`.

- [ ] **Step 3: Implement the resolver**

Create `src/app/features/simulator/hud-dock.util.ts`:

```typescript
/**
 * Bottom "context dock" priority resolver (HUD reorganization).
 *
 * The dock shows at most ONE transient message at a time so overlays never
 * stack. The controls reminder is intentionally NOT part of the dock — it lives
 * in its own collapsed corner pill — so the only center-dock message today is
 * the interaction prompt. An open dialogue/feedback panel owns the bottom and
 * suppresses the dock entirely.
 */
export type DockKind = 'interaction';

export interface DockInput {
  /** A dialogue / feedback / tool panel is open (it owns the bottom strip). */
  dialogueOpen: boolean;
  /** The player is within range of an interactable. */
  hasNearbyInteraction: boolean;
}

export function resolveDock(input: DockInput): DockKind | null {
  if (input.dialogueOpen) return null;
  if (input.hasNearbyInteraction) return 'interaction';
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/app/features/simulator/hud-dock.util.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add admin-panel/src/app/features/simulator/hud-dock.util.ts admin-panel/src/app/features/simulator/hud-dock.util.spec.ts
git commit -m "feat(hud): bottom-dock priority resolver"
```

---

## Task 2: Two-tier top HUD (`simulation-hud.component.ts`)

Restructure the single 7-section strip into a vitals/location/status row plus a full-width objective line. The class body (computed signals, color helpers) is unchanged — only the `template` and `styles` change.

**Files:**
- Modify: `src/app/features/simulator/simulation-hud.component.ts`

- [ ] **Step 1: Replace the `template`**

In `simulation-hud.component.ts`, replace the entire `template: \`...\`,` (the block from `@if (attempt(); as game) {` through its closing `}` before `\`,`) with:

```html
    @if (attempt(); as game) {
      <div class="hud-shell liquid-glass"
        [class.hud--stress-high]="stressTier() === 'high'"
        [class.hud--stress-critical]="stressTier() === 'critical'">

        <div class="hud-strip">
          <!-- LEFT zone: case vitals -->
          <div class="hud-zone hud-zone--vitals">
            <div class="hud-score" aria-label="Seguimiento formativo: {{ game.accumulatedScore }} puntos">
              <mat-icon aria-hidden="true">fact_check</mat-icon>
              <strong>{{ game.accumulatedScore }}</strong>
            </div>

            <div class="hud-stress"
              [class.hud-stress--pulse]="stressPulse()"
              role="meter"
              [attr.aria-valuenow]="game.stressIndex" aria-valuemin="0" aria-valuemax="100"
              [attr.aria-label]="'Estado de estrés del caso: ' + game.stressIndex + '%. ' + stressLabel()">
              <span class="stress-pct" [style.color]="stressColor()">{{ game.stressIndex }}%</span>
              <div class="stress-track" aria-hidden="true">
                <span [style.width.%]="game.stressIndex" [style.background]="stressMeterGradient()"></span>
              </div>
            </div>

            @if (patientState(); as ps) {
              <div class="hud-patient" aria-label="Estado de la paciente">
                <div class="patient-bars">
                  <div class="patient-bar-row">
                    <span class="bar-icon" title="Confianza" aria-hidden="true">C</span>
                    <div class="mini-track" role="meter" [attr.aria-valuenow]="ps.trustLevel" aria-valuemin="0" aria-valuemax="100" aria-label="Confianza">
                      <span [style.width.%]="ps.trustLevel" [style.background]="trustColor(ps.trustLevel)"></span>
                    </div>
                  </div>
                  <div class="patient-bar-row">
                    <span class="bar-icon" title="Bienestar emocional" aria-hidden="true">B</span>
                    <div class="mini-track" role="meter" [attr.aria-valuenow]="ps.emotionalState" aria-valuemin="0" aria-valuemax="100" aria-label="Bienestar emocional">
                      <span [style.width.%]="ps.emotionalState" [style.background]="emotionColor(ps.emotionalState)"></span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- CENTER zone: location + step -->
          <div class="hud-zone hud-zone--center">
            <div class="hud-scene">
              <mat-icon aria-hidden="true">location_on</mat-icon>
              <span>{{ game.currentNode.title }}</span>
            </div>
            @if (sceneProgress(); as progress) {
              <div class="hud-step" aria-label="{{ progress.stepLabel }}">
                <mat-icon aria-hidden="true">timeline</mat-icon>
                <span>{{ progress.stepLabel }}@if (progress.step > 0) { ({{ progress.step }}/{{ progress.total }}) }</span>
              </div>
            }
          </div>

          <!-- RIGHT zone: status -->
          <div class="hud-zone hud-zone--right">
            <div class="hud-status" [class.hud-status--live]="game.status === 'IN_PROGRESS'">
              <span class="status-dot" aria-hidden="true"></span>
              <span>{{ statusLabel(game.status) }}</span>
            </div>
          </div>
        </div>

        @if (sceneObjective(); as objective) {
          <div class="hud-objective-line" role="status" aria-label="Objetivo actual: {{ objective }}">
            <mat-icon aria-hidden="true">flag</mat-icon>
            <span><strong>Objetivo:</strong> {{ objective }}</span>
          </div>
        }
      </div>
    }
```

- [ ] **Step 2: Replace the `styles`**

Replace the entire `styles: [\`...\`]` array content with:

```css
    .hud-shell {
      display: flex;
      flex-direction: column;
      border-radius: 0 0 16px 16px;
      background: rgba(8,12,18,.84);
      backdrop-filter: blur(18px) saturate(120%);
      border: 1px solid rgba(79,163,165,.18);
      border-top: none;
      color: rgba(232,240,244,.9);
      transition: border-color var(--psy-motion-ui);
    }
    .hud--stress-high  { border-color: rgba(212,160,80,.4); }
    .hud--stress-critical { border-color: rgba(168,80,98,.5); }

    .hud-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 50px;
      padding: 0 14px;
    }
    .hud-zone { display: flex; align-items: center; }
    .hud-zone--vitals { gap: 14px; flex-shrink: 0; }
    .hud-zone--center { flex: 1; min-width: 0; gap: 10px; justify-content: center; }
    .hud-zone--right { flex-shrink: 0; margin-left: auto; }

    .hud-score { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .hud-score mat-icon { color: var(--siep-blue-soft); font-size: 18px; width: 18px; height: 18px; }
    .hud-score strong { font-family: 'JetBrains Mono', monospace; font-size: .9rem; letter-spacing: .04em; }

    .hud-stress { display: flex; align-items: center; gap: 8px; flex: 0 0 150px; }
    .hud-stress--pulse { animation: stress-pulse .6s ease-out; }
    .stress-pct { font-family: 'JetBrains Mono', monospace; font-size: .78rem; min-width: 38px; transition: color var(--psy-motion-ui); }
    .stress-track { flex: 1; height: 5px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; }
    .stress-track span { display: block; height: 100%; border-radius: inherit; transition: width .5s cubic-bezier(.4,0,.2,1), background .5s ease; }

    .hud-patient { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .patient-bars { display: flex; flex-direction: column; gap: 3px; }
    .patient-bar-row { display: flex; align-items: center; gap: 4px; }
    .bar-icon { width: 12px; font-size: .62rem; line-height: 1; color: rgba(232,240,244,.7); font-weight: 800; text-align: center; }
    .mini-track { width: 56px; height: 5px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; }
    .mini-track span { display: block; height: 100%; border-radius: inherit; transition: width .5s ease, background .5s ease; }

    .hud-scene { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; }
    .hud-scene mat-icon { color: var(--siep-blue-soft); font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; }
    .hud-scene span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8rem; color: rgba(232,240,244,.7); }

    .hud-step {
      display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      padding: 4px 8px; border-radius: 8px;
      background: rgba(79,122,172,.1); border: 1px solid rgba(79,122,172,.2);
    }
    .hud-step mat-icon { color: rgba(157,192,232,.85); font-size: 14px; width: 14px; height: 14px; }
    .hud-step span { font-size: .68rem; font-weight: 700; color: rgba(157,192,232,.85); white-space: nowrap; }

    .hud-status { display: flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: .7rem; color: rgba(232,240,244,.4); white-space: nowrap; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.25); }
    .hud-status--live .status-dot { background: var(--siep-blue-soft); animation: dot-blink 2s ease-in-out infinite; }

    .hud-objective-line {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 5px 14px 7px;
      border-top: 1px solid rgba(79,163,165,.14);
      background: rgba(79,163,165,.06);
    }
    .hud-objective-line mat-icon { color: var(--siep-blue-soft); font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
    .hud-objective-line span { font-size: .74rem; line-height: 1.3; color: rgba(232,240,244,.82); }
    .hud-objective-line strong { color: rgba(157,192,232,.9); font-weight: 800; margin-right: 4px; }

    @keyframes stress-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(212,160,80,.4); }
      70%  { box-shadow: 0 0 0 6px rgba(212,160,80,0); }
      100% { box-shadow: none; }
    }
    @keyframes dot-blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

    @media (max-width: 640px) {
      .hud-scene { display: none; }
      .hud-zone--vitals { gap: 10px; }
      .hud-stress { flex: 0 0 96px; }
      .hud-patient { display: none; }
      .hud-objective-line span { font-size: .7rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hud-stress--pulse { animation: none; }
      .stress-track span { transition: none; }
      .status-dot { animation: none !important; }
    }
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Then: `npx ng build --configuration development`
Expected: both succeed (the pre-existing `dialogue-panel.component.ts` NG8107 warning is unrelated and OK).

- [ ] **Step 4: Commit**

```bash
git add admin-panel/src/app/features/simulator/simulation-hud.component.ts
git commit -m "feat(hud): two-tier top bar — vitals/location/status row + objective line"
```

---

## Task 3: Bottom dock wiring + collapsed controls pill + minimap offset (`simulation-play.component.ts`)

**Files:**
- Modify: `src/app/features/simulator/simulation-play.component.ts`

- [ ] **Step 1: Import the resolver**

After the `scene-guide.config` import (added in B1), add:

```typescript
import { resolveDock } from './hud-dock.util';
```

- [ ] **Step 2: Add the `dockKind` computed**

Next to the other computed signals (e.g. right after `guideEntry`), add:

```typescript
  readonly dockKind = computed(() => resolveDock({
    dialogueOpen: !!this.activeDialogue(),
    hasNearbyInteraction: !!this.nearbyInteraction(),
  }));
```

- [ ] **Step 3: Gate the proximity dock with the resolver**

In the template, change the proximity-hint guard from:

```html
        @if (nearbyInteraction(); as nb) {
          <div class="proximity-hint"
```
to:
```html
        @if (dockKind() === 'interaction' && nearbyInteraction(); as nb) {
          <div class="proximity-hint"
```

- [ ] **Step 4: Replace the always-on controls hint with a collapsed pill**

In the template, replace:

```html
        <div class="controls-hint" aria-hidden="true">Mover: WASD/flechas · E decisión o interacción · J bitácora reflexiva · Esc salida segura</div>
```
with:
```html
        <div class="controls-pill" tabindex="0"
          aria-label="Controles: mover con WASD o flechas, E para interactuar, J para la bitácora, Escape para salida segura">
          <mat-icon aria-hidden="true">keyboard</mat-icon>
          <span class="controls-pill__text">WASD/flechas mover · E interactuar · J bitácora · Esc salida segura</span>
        </div>
```

- [ ] **Step 5: Swap the controls-hint styles for the pill, and nudge the minimap down**

In the component `styles`, replace the `.controls-hint { ... }` rule:

```css
    .controls-hint {
      position: absolute; bottom: 116px; left: 50%; transform: translateX(-50%); z-index: 50;
      padding: 5px 12px; border-radius: 999px; background: rgba(8,12,18,.5);
      color: rgba(232,240,244,.3); font-size: .66rem; font-weight: 700; letter-spacing: .05em;
      pointer-events: none; white-space: nowrap;
    }
```
with:
```css
    .controls-pill {
      position: absolute; bottom: 70px; left: 12px; z-index: 50;
      display: flex; align-items: center; gap: 6px;
      max-width: 38px; height: 34px; padding: 0 9px; overflow: hidden;
      border-radius: 999px; background: rgba(8,12,18,.7);
      border: 1px solid rgba(79,163,165,.28); color: rgba(79,163,165,.85);
      white-space: nowrap; transition: max-width .25s ease, background .2s ease;
    }
    .controls-pill:hover, .controls-pill:focus-visible { max-width: 540px; background: rgba(8,12,18,.86); outline: none; }
    .controls-pill mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .controls-pill__text { font-size: .66rem; font-weight: 700; letter-spacing: .03em; color: rgba(232,240,244,.6); }
    @media (max-width: 900px) { .controls-pill { display: none; } }
    @media (prefers-reduced-motion: reduce) { .controls-pill { transition: none; } }
```

Then change the minimap rule from:
```css
    app-minimap.minimap-layer { position: absolute; top: 62px; right: 12px; z-index: 50; }
```
to:
```css
    app-minimap.minimap-layer { position: absolute; top: 88px; right: 12px; z-index: 50; }
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Then: `npx ng build --configuration development`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add admin-panel/src/app/features/simulator/simulation-play.component.ts
git commit -m "feat(hud): single bottom dock + collapsed controls pill + minimap offset"
```

---

## Task 4: Phaser guide-bubble clamp + softer world labels (`game-world.component.ts`)

**Files:**
- Modify: `src/app/features/simulator/game-world.component.ts`

- [ ] **Step 1: Add bubble-dimension fields**

Next to the other guide fields (added in B1: `private guideArrived = false;` etc.), add:

```typescript
  private guideBubbleHeight = 0;
  private guideBubbleHalfW = 0;
```

- [ ] **Step 2: Store bubble dimensions when building it**

In `buildGuideBubble`, replace:

```typescript
    const b = text.getBounds();
    const bg = this.add.rectangle(0, 0, b.width + 16, b.height + 12, 0x141b2e, 0.94)
      .setStrokeStyle(1, 0x6f7cff, 0.6).setOrigin(0.5, 1);
    return this.add.container(0, 0, [bg, text]).setDepth(26).setVisible(false);
```
with:
```typescript
    const b = text.getBounds();
    const bg = this.add.rectangle(0, 0, b.width + 16, b.height + 12, 0x141b2e, 0.94)
      .setStrokeStyle(1, 0x6f7cff, 0.6).setOrigin(0.5, 1);
    this.guideBubbleHeight = b.height + 12;
    this.guideBubbleHalfW = (b.width + 16) / 2;
    return this.add.container(0, 0, [bg, text]).setDepth(26).setVisible(false);
```

- [ ] **Step 3: Clamp the bubble to the camera view**

Replace the whole `showGuideBubble` method:

```typescript
  private showGuideBubble(show: boolean) {
    if (!this.guideBubble || !this.guideContainer) return;
    if (show) {
      this.guideBubble.setPosition(this.guideContainer.x, this.guideContainer.y - 30).setVisible(true);
    } else {
      this.guideBubble.setVisible(false);
    }
  }
```
with:
```typescript
  private showGuideBubble(show: boolean) {
    if (!this.guideBubble || !this.guideContainer) return;
    if (!show) { this.guideBubble.setVisible(false); return; }
    // The bubble is bottom-anchored at (x, y); keep the whole bubble inside the
    // camera's visible world rect so it never clips at an edge.
    const view = this.cameras.main.worldView;
    const margin = 6;
    const x = Phaser.Math.Clamp(
      this.guideContainer.x,
      view.left + this.guideBubbleHalfW + margin,
      view.right - this.guideBubbleHalfW - margin,
    );
    const bottomY = Phaser.Math.Clamp(
      this.guideContainer.y - 30,
      view.top + margin + this.guideBubbleHeight,
      view.bottom - margin,
    );
    this.guideBubble.setPosition(x, bottomY).setVisible(true);
  }
```

- [ ] **Step 4: Soften the hospital zone labels**

In `renderHospitalEnvironment`, replace the zone label text block:

```typescript
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#9dc0e8',
        fontStyle: 'bold',
        backgroundColor: 'rgba(8,12,18,.78)',
        padding: { x: 5, y: 3 },
      }).setDepth(4);
```
with:
```typescript
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: 'rgba(157,192,232,.75)',
        backgroundColor: 'rgba(8,12,18,.5)',
        padding: { x: 4, y: 2 },
      }).setDepth(4).setAlpha(0.85);
```

- [ ] **Step 5: Soften the comisaría zone labels**

In `renderComisariaEnvironment`, replace the zone label text block:

```typescript
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#b8a8e8',
        fontStyle: 'bold',
        backgroundColor: 'rgba(8,12,18,.78)',
        padding: { x: 5, y: 3 },
      }).setDepth(4);
```
with:
```typescript
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: 'rgba(184,168,232,.75)',
        backgroundColor: 'rgba(8,12,18,.5)',
        padding: { x: 4, y: 2 },
      }).setDepth(4).setAlpha(0.85);
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Then: `npx ng build --configuration development`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add admin-panel/src/app/features/simulator/game-world.component.ts
git commit -m "feat(world): clamp guide bubble to camera + soften zone labels"
```

---

## Task 5: Menu sign/title anti-overlap (`game-menu.component.ts`)

**Files:**
- Modify: `src/app/features/simulator/game-menu.component.ts`

- [ ] **Step 1: Pin the clinic sign as a top header (out of the door-title band)**

In `ClinicMenuScene.create()`, replace the sign block (added in B1):

```typescript
    // Backlit clinic sign
    const sign = this.add.rectangle(24, 132, 250, 40, 0x12202f, 0.92).setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x4f7cac, 0.5);
    this.add.text(sign.x + 14, 132, 'CLÍNICA · SIEP', {
      fontFamily: 'monospace', fontSize: '22px', color: '#9dc0e8',
    }).setOrigin(0, 0.5);
```
with:
```typescript
    // Backlit clinic sign — pinned top-left header (screen space), above the
    // building band, so it never collides with door titles inside the band.
    const sign = this.add.rectangle(24, 36, 232, 36, 0x12202f, 0.92).setOrigin(0, 0)
      .setScrollFactor(0).setStrokeStyle(2, 0x4f7cac, 0.5);
    this.add.text(sign.x + 14, 54, 'CLÍNICA · SIEP', {
      fontFamily: 'monospace', fontSize: '20px', color: '#9dc0e8',
    }).setOrigin(0, 0.5).setScrollFactor(0);
```

- [ ] **Step 2: Give the door title clearance above the badge**

In the `this.items.forEach(...)` loop, change the title's y from `this.doorY - 168` to `this.doorY - 176`. Replace:

```typescript
      this.add.text(x, this.doorY - 168, item.title, {
        fontFamily: 'sans-serif', fontSize: '15px', color: open ? '#e8f0f4' : '#7a808a',
        align: 'center', wordWrap: { width: 180 },
      }).setOrigin(0.5, 1);
```
with:
```typescript
      this.add.text(x, this.doorY - 176, item.title, {
        fontFamily: 'sans-serif', fontSize: '15px', color: open ? '#e8f0f4' : '#7a808a',
        align: 'center', wordWrap: { width: 180 },
      }).setOrigin(0.5, 1);
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Then: `npx ng build --configuration development`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add admin-panel/src/app/features/simulator/game-menu.component.ts
git commit -m "fix(menu): pin clinic sign as header so it no longer overlaps door titles"
```

---

## Task 6: Verification — full sweep + live screenshots

**Files:** none (verification only).

- [ ] **Step 1: Full Jest suite**

Run: `npx jest`
Expected: all suites PASS, including the new `hud-dock.util.spec.ts` (the count grows by 1 suite / 3 tests vs B1's 9 suites / 38 tests → 10 suites / 41 tests). `*.e2e.ts` stays excluded.

- [ ] **Step 2: Production build**

Run: `npx ng build`
Expected: succeeds.

- [ ] **Step 3: Live screenshots (drive the running app)**

Start the stack if not running — backend `python manage.py runserver 8091` (from `backend_django`, using its `.venv`) and `npm start` (from `admin-panel`, serves `:4200`, proxies `/api` to `:8091`). Authenticate by injecting a JWT from `POST /api/auth/login` (`estudiante@psychosim.edu.co` / `Estudiante123!`) into `localStorage['psychosim_token']`, then drive with Playwright/`webapp-testing` (this exact recipe worked during B1 verification). Capture and confirm:
- **Top bar:** the objective shows on its own full-width line with **no "…" truncation**; vitals (score/stress/patient) sit left, location+step center, status right.
- **Minimap** sits below the objective line (no overlap).
- **Bottom:** only one message at a time — the proximity prompt appears near an interactable and is gone inside a dialogue; the controls pill sits collapsed bottom-left and expands on hover/focus; nothing overlaps the proximity prompt.
- **Guide bubble:** approach the guide near a screen edge → the bubble stays fully on-screen (no clip).
- **Menu (`/portal/jugar`):** the "CLÍNICA · SIEP" sign no longer overlaps the case title or the "Disponible" badge.

- [ ] **Step 4: Finish**

Use superpowers:finishing-a-development-branch to merge/PR `feat/game-interface-hud` into `feat/game-shell`.

---

## Self-Review

**Spec coverage:**
- §2.1 two-tier top bar (vitals/center/status + objective line, narrowed stress, minimap offset) → **Task 2** (+ minimap in Task 3).
- §2.2 single bottom dock (resolver, collapsed controls pill, corner spacing) → **Tasks 1 + 3**.
- §2.3 guide-bubble clamp + softer labels → **Task 4**.
- §2.4 menu sign/title anti-overlap → **Task 5**.
- §2.5 isolation/accessibility (reduced-motion preserved, no mechanic/backend change) → respected across Tasks 2–5.
- §3 testing (Jest resolver; build; live screenshots) → **Tasks 1, 6**.

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `resolveDock(DockInput): DockKind | null` is defined in Task 1 and consumed identically in Task 3 (`dockKind()` computed; template checks `dockKind() === 'interaction'`). `guideBubbleHeight`/`guideBubbleHalfW` are declared (Task 4 Step 1), set (Step 2), and read (Step 3) with matching names. The HUD CSS classes in the Task 2 template (`hud-shell`, `hud-strip`, `hud-zone--vitals/center/right`, `hud-objective-line`, `controls-pill`) all have matching style rules.

**Note:** Task 3 references `activeDialogue()` and `nearbyInteraction()` — both already exist on `SimulationPlayComponent` (the `activeDialogue` computed merges main + NPC dialogue; `nearbyInteraction` is a signal). No new wiring needed beyond the `dockKind` computed.
