import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SimulationService } from '../../core/api/simulation.service';
import {
  DialogueState, MapObjectState, NpcConfig, ProgressMapState, SimulationAttemptState,
  ScenarioConfig, SimulationFeedback, SimulationWorldState, ToolUseResult
} from '../../core/models/simulation.model';
import { DialoguePanelComponent } from './dialogue-panel.component';
import { GameWorldComponent } from './game-world.component';
import { JournalPanelComponent, JournalSaveState } from './journal-panel.component';
import { SimulationHudComponent } from './simulation-hud.component';
import { ToolInventoryComponent } from './tool-inventory.component';
import { AudioDirectorService } from './audio-director.service';
import {
  PROTOCOL_INFO_MESSAGE,
} from './hospital-map.config';
import { COMISARIA_AMBIENT_INFO } from './comisaria-map.config';
import {
  getRiskyInteractionDef,
  isRiskyInteraction,
} from './risky-interaction.config';
import {
  getSceneDisplayLabel,
  getSceneInteractionDescription,
  isSceneAmbientInteraction,
} from './scene-map-display.util';
import { getSceneObjective } from './scene-objectives.config';
import { AttemptOutcomeComponent } from './attempt-outcome.component';
import { resolveViewMode, SimulationViewMode } from './simulation-view-mode.util';

@Component({
  selector: 'app-simulation-play',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule, MatProgressBarModule,
    SimulationHudComponent, GameWorldComponent, DialoguePanelComponent,
    ToolInventoryComponent, JournalPanelComponent, AttemptOutcomeComponent
  ],
  template: `
    <div class="game-container" id="main-content" tabindex="-1" [attr.data-mode]="viewMode()">
      <div class="sr-only" aria-live="assertive" role="status" aria-atomic="true">{{ a11yAnnouncement() }}</div>

      @if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" aria-label="Cargando simulación" /></div>
      }
      @if (error()) {
        <div class="error-overlay" role="alert">
          <mat-icon>error</mat-icon><p>{{ error() }}</p>
          <a class="psy-button psy-button--ghost" routerLink="/portal/simulador">Volver al simulador</a>
        </div>
      }
      @if (actionError()) {
        <div class="action-toast" role="alert">{{ actionError() }}</div>
      }

      @if (showResumePrompt() && pendingActiveAttempt(); as active) {
        <section class="resume-overlay" role="dialog" aria-labelledby="resume-title">
          <article class="resume-card liquid-glass">
            <p class="psy-eyebrow">Intento en progreso</p>
            <h2 id="resume-title">Continuar simulación formativa</h2>
            <p>
              Ya tienes un intento activo en <strong>{{ active.caseTitle }}</strong>.
              Puedes retomarlo desde <strong>{{ active.currentNode.title }}</strong> o iniciar uno nuevo.
            </p>
            <div class="resume-metrics">
              <span>Puntaje: {{ active.accumulatedScore }}</span>
              <span>Estrés: {{ active.stressIndex }}%</span>
              <span>Riesgo: {{ active.metrics.victimRisk }}%</span>
            </div>
            <div class="resume-actions">
              <button class="psy-button psy-button--primary" type="button" (click)="resumeAttempt()">
                Continuar intento en progreso
              </button>
              <button class="psy-button psy-button--ghost" type="button" (click)="startNewAttempt()">
                Iniciar nuevo intento
              </button>
              <a class="psy-button psy-button--ghost" routerLink="/portal/simulador">Volver al catálogo</a>
            </div>
          </article>
        </section>
      }

      @if (attempt(); as game) {
        <header class="top-bar">
          <app-simulation-hud
            [attempt]="game"
            [stressPulse]="stressPulse()"
            [nearbyInteractionKey]="nearbyInteraction()?.key ?? null"
            [stageLabel]="currentStageLabel()"
            [progressLabel]="progressLabel()"
            [journalOpen]="journalOpen()"
            (toggleJournal)="journalOpen.set(!journalOpen())" />
        </header>

        <main class="main-zone">
          <section class="canvas-zone" aria-label="Escena de la simulación">
            @if (sceneObjective(); as objective) {
              <div class="objective-card" role="status">
                <mat-icon aria-hidden="true">flag</mat-icon>
                <div class="objective-card__body">
                  <strong>Objetivo</strong>
                  <p>{{ objective }}</p>
                  @if (game.currentNode.warningMessage || game.currentNode.safeExitRequired) {
                    <p class="objective-card__ethic">
                      {{ game.currentNode.warningMessage || 'Este momento permite salida segura: prioriza confidencialidad y rutas institucionales.' }}
                    </p>
                  }
                </div>
              </div>
            }

            @if (world(); as w) {
              <app-game-world #gameWorld id="game-area" class="game-surface" [world]="w"
                [scenarioConfig]="scenarioConfig()"
                [nearbyInteraction]="nearbyInteraction()" [selectedInteractionKey]="selectedInteraction()?.key ?? null"
                (proximity)="nearbyInteraction.set($event)" (interact)="openInteraction($event)"
                (npcInteract)="openNpcDialogue($event)"
                (positionChange)="rememberPosition($event.x, $event.y)" />
            } @else {
              <div id="game-area" class="world-skeleton" aria-label="Cargando mapa"></div>
            }

            <div class="stress-vignette" [class.vignette--active]="stressVignetteLevel() > 0"
              [style.--vignette-opacity]="stressVignetteLevel()" aria-hidden="true"></div>
          </section>

          @if (viewMode() === 'dialogue-right') {
            <aside class="right-panel" aria-label="Decisión formativa en curso">
              <header class="right-panel__scene">
                <p class="right-panel__kicker">{{ currentStageLabel() }}</p>
                <h2>{{ game.currentNode.title }}</h2>
                @if (game.currentNode.narrative) {
                  <p class="right-panel__narrative">{{ game.currentNode.narrative }}</p>
                }
              </header>
              <app-dialogue-panel class="dialogue-side" mode="side"
                [dialogue]="dialogue()" [interaction]="selectedInteraction()"
                (close)="closeDialogue()" (execute)="executeDecision($event)" (useTool)="useTool($event)"
                (frontendChoice)="handleFrontendChoice($event)" />
            </aside>
          }
        </main>

        <footer class="bottom-zone">
          @if (game.status === 'IN_PROGRESS') {
            <button class="safe-exit" type="button" (click)="safeExit()" [disabled]="busy()"
              aria-label="Salida segura (Escape)">
              <mat-icon aria-hidden="true">exit_to_app</mat-icon>
              <span class="safe-exit__copy"><strong>Salida segura</strong><kbd>Esc</kbd></span>
            </button>
          }

          <app-tool-inventory class="tool-dock" [tools]="world()?.tools ?? []"
            [inventory]="world()?.inventory ?? []"
            [selectedToolCode]="selectedToolCode()"
            (select)="selectTool($event)" />

          <div class="context-bar" aria-live="polite" aria-atomic="true">
            @if (nearbyInteraction(); as nb) {
              <div class="context-bar__interaction" [class.context-bar__interaction--exit]="nb.type === 'EXIT'">
                <kbd>E</kbd>
                <div class="context-bar__copy">
                  <strong>{{ proximityLabel(nb) }}</strong>
                  @if (proximityDescription(nb); as desc) {
                    <p>{{ desc }}</p>
                  }
                </div>
              </div>
            } @else {
              <p class="context-bar__hint">WASD mover · <kbd>E</kbd> interactuar · <kbd>J</kbd> bitácora · <kbd>Esc</kbd> salida segura</p>
            }
          </div>
        </footer>

        @if (viewMode() === 'dialogue-cinematic') {
          <app-dialogue-panel class="dialogue-cinematic" [dialogue]="dialogue()" [interaction]="selectedInteraction()"
            (close)="closeDialogue()" (execute)="executeDecision($event)" (useTool)="useTool($event)"
            (frontendChoice)="handleFrontendChoice($event)" />
        }

        @if (journalOpen()) {
          <div class="overlay-backdrop" aria-hidden="true" (click)="journalOpen.set(false)"></div>
        }
        <app-journal-panel #journalPanel class="journal-layer" [open]="journalOpen()"
          [disabled]="game.status !== 'IN_PROGRESS' || busy()" [message]="journalMessage()"
          [saveState]="journalSaveState()"
          [timeline]="visitedStageLabels()"
          [resources]="supportResources()"
          (save)="saveReflection($event)" (closeSheet)="journalOpen.set(false)" />

        <!-- Screen-reader narrative route -->
        <section class="sr-narrative-route" aria-label="Ruta narrativa accesible">
          <h4 class="sr-only">Escena: {{ game.currentNode.title }}</h4>
          <p class="sr-only">{{ game.currentNode.narrative }}</p>
          @if (game.currentNode.warningMessage) {
            <p class="sr-only" role="alert">Advertencia: {{ game.currentNode.warningMessage }}</p>
          }
          @if (game.currentNode.sensitiveContent) {
            <p class="sr-only" role="note">Contenido sensible. Salida segura con Escape.</p>
          }
          <div class="sr-only">Puntaje: {{ game.accumulatedScore }}. Estrés: {{ game.stressIndex }}%. Estado: {{ statusLabelA11y(game.status) }}.</div>
        </section>

        <!-- Accessible interaction list -->
        <section class="sr-only" aria-label="Lista accesible de puntos interactivos">
          <div role="list">
            @for (obj of world()?.objects ?? []; track obj.key) {
              <button role="listitem" type="button" class="sr-only"
                [attr.aria-label]="proximityLabel(obj) + ': ' + proximityDescription(obj)"
                (click)="openInteraction(obj)">{{ proximityLabel(obj) }}</button>
            }
          </div>
        </section>

        <app-attempt-outcome [report]="game.completionReport" [status]="game.status" (retry)="startNewAttempt()" />

        <div class="scene-fade" [class.scene-fade--active]="fadeActive()" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .game-container {
      --sim-purple: #7C4DFF;
      --sim-lavender: #B69CFF;
      --sim-blue: #6CC0C7;
      --sim-green: #6EC67A;
      --sim-orange: #F5B84B;
      --sim-red: #E25A4F;
      --sim-ink: #F4F7FB;
      --sim-ink-soft: rgba(244,247,251,.74);
      --sim-ink-mute: rgba(244,247,251,.5);
      --sim-surface: rgba(27,33,51,.72);
      --sim-surface-2: rgba(18,24,42,.6);
      --sim-border: rgba(182,156,255,.22);
      --sim-glow: 0 18px 48px -28px rgba(124,77,255,.6);
      position: fixed;
      inset: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      /* La columna explícita clampa el track al viewport: sin ella, el
         min-content de la bottom-zone (dock + salida segura) ensancha el track
         implícito y desborda canvas + objective-card en mobile. */
      grid-template-columns: minmax(0, 1fr);
      overflow: hidden;
      color: var(--sim-ink);
      background:
        linear-gradient(90deg, rgba(124,77,255,.05) 1px, transparent 1px) 0 0 / 24px 24px,
        linear-gradient(rgba(124,77,255,.05) 1px, transparent 1px) 0 0 / 24px 24px,
        linear-gradient(180deg, #111827 0%, #0e1322 100%);
    }

    /* ── Top bar ─────────────────────────────────────────────────────────── */
    .top-bar { z-index: 40; }

    /* ── Main zone: canvas + optional right panel ────────────────────────── */
    .main-zone {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      min-height: 0;
      padding: 10px 12px 0;
    }
    .game-container[data-mode='dialogue-right'] .main-zone {
      grid-template-columns: minmax(0, 1fr) clamp(340px, 28vw, 480px);
    }
    .canvas-zone {
      position: relative;
      min-height: 0;
      border: 1px solid rgba(182,156,255,.18);
      border-radius: 16px;
      overflow: hidden;
      background: #0e1322;
      box-shadow: var(--sim-glow);
    }
    .game-surface { position: absolute; inset: 0; }
    .world-skeleton { position: absolute; inset: 0; background: #0e1322; }

    .objective-card {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 20;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      max-width: min(380px, 58%);
      padding: 8px 11px;
      border: 1px solid rgba(182,156,255,.32);
      border-radius: 10px;
      background: rgba(8,12,18,.88);
      backdrop-filter: blur(10px);
      /* Marco doble: línea interna oscura — acabado pixel-art sobrio. */
      box-shadow:
        inset 0 0 0 1px rgba(8,12,18,.95),
        0 12px 30px -22px rgba(124,77,255,.55);
    }
    .objective-card mat-icon {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 22px; height: 22px;
      margin-top: 1px;
      font-size: 14px;
      border-radius: 6px;
      border: 1px solid rgba(182,156,255,.3);
      background: rgba(124,77,255,.16);
      color: var(--sim-lavender);
    }
    .objective-card__body { display: grid; gap: 2px; min-width: 0; }
    .objective-card__body strong {
      font-size: .6rem; font-weight: 900; letter-spacing: .12em;
      text-transform: uppercase; color: #cdbcff;
    }
    .objective-card__body p { margin: 0; font-size: .76rem; line-height: 1.35; color: rgba(232,240,244,.85); }
    .objective-card__ethic {
      color: rgba(232,207,154,.85) !important;
      font-size: .68rem !important;
      border-top: 1px solid rgba(245,184,75,.18);
      padding-top: 4px;
      margin-top: 2px !important;
    }

    .stress-vignette {
      position: absolute; inset: 0; pointer-events: none; z-index: 18; opacity: 0;
      transition: opacity 1.2s cubic-bezier(.4,0,.2,1);
      background: radial-gradient(ellipse at center, transparent 55%, rgba(120,40,55,.22) 100%);
    }
    .vignette--active { opacity: var(--vignette-opacity, 0); }

    /* ── Right panel (solo en dialogue-right) ────────────────────────────── */
    .right-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 0;
      border: 1px solid var(--sim-border);
      border-radius: 16px;
      overflow: hidden;
      background: var(--sim-surface);
      backdrop-filter: blur(18px) saturate(120%);
      box-shadow: var(--sim-glow);
      animation: panel-in 180ms cubic-bezier(.2,.8,.2,1) both;
    }
    .right-panel__scene {
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--sim-border);
      background: rgba(124,77,255,.08);
    }
    .right-panel__kicker {
      margin: 0;
      color: var(--sim-lavender);
      font-size: .66rem;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .right-panel__scene h2 { margin: 4px 0 0; font-size: 1.02rem; line-height: 1.2; color: var(--sim-ink); }
    .right-panel__narrative {
      margin: 8px 0 0;
      max-height: 88px;
      overflow-y: auto;
      color: var(--sim-ink-soft);
      font-size: .78rem;
      line-height: 1.5;
    }
    .dialogue-side { display: block; min-height: 0; overflow: hidden; }

    /* ── Bottom zone: salida segura + dock + contexto ────────────────────── */
    .bottom-zone {
      display: flex;
      align-items: stretch;
      gap: 10px;
      padding: 8px 12px 10px;
      min-height: 64px;
      z-index: 30;
    }
    .safe-exit {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      padding: 6px 14px;
      border: 1px solid rgba(226,90,79,.4);
      border-radius: 12px;
      background: rgba(226,90,79,.1);
      color: #f1a79f;
      cursor: pointer;
      transition: border-color 160ms, background 160ms;
    }
    .safe-exit:hover { border-color: rgba(226,90,79,.7); background: rgba(226,90,79,.18); }
    .safe-exit:focus-visible { outline: 2px solid rgba(226,90,79,.6); outline-offset: 2px; }
    .safe-exit:active { transform: translateY(1px); }
    .safe-exit:disabled { opacity: .4; cursor: not-allowed; }
    .safe-exit mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .safe-exit__copy { display: grid; gap: 1px; text-align: left; }
    .safe-exit__copy strong { font-size: .72rem; font-weight: 900; letter-spacing: .03em; }
    .safe-exit__copy kbd {
      font-size: .58rem; font-family: 'JetBrains Mono', monospace;
      color: rgba(241,167,159,.7);
    }
    .tool-dock { display: block; min-width: 0; flex: 0 1 auto; }
    .context-bar {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
    }
    .context-bar__interaction {
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 100%;
      padding: 7px 14px;
      border: 1px solid rgba(182,156,255,.35);
      border-radius: 12px;
      background: rgba(8,12,18,.88);
      animation: hint-rise 160ms ease both;
    }
    .context-bar__interaction--exit { border-color: rgba(182,156,255,.65); }
    .context-bar__interaction kbd {
      flex-shrink: 0;
      padding: 3px 9px;
      border-radius: 6px;
      background: rgba(124,77,255,.22);
      border: 1px solid rgba(124,77,255,.4);
      font-size: .8rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      color: #c9b8ff;
    }
    .context-bar__copy { display: grid; min-width: 0; }
    .context-bar__copy strong { font-size: .8rem; color: #cdbcff; line-height: 1.25; }
    .context-bar__copy p {
      margin: 0;
      font-size: .7rem;
      line-height: 1.3;
      color: rgba(232,240,244,.7);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .context-bar__hint {
      margin: 0;
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .04em;
      color: rgba(232,240,244,.34);
      white-space: nowrap;
    }
    .context-bar__hint kbd {
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(124,77,255,.16);
      font-family: 'JetBrains Mono', monospace;
      font-size: .64rem;
      color: rgba(201,184,255,.6);
    }

    /* ── Overlays ────────────────────────────────────────────────────────── */
    .dialogue-cinematic { position: absolute; bottom: 0; left: 0; right: 0; z-index: 60; }
    .overlay-backdrop {
      position: absolute; inset: 0; z-index: 95;
      background: rgba(8,12,18,.62);
      backdrop-filter: blur(3px);
      animation: fade-in 180ms ease both;
    }
    .scene-fade {
      position: fixed; inset: 0; z-index: 200; background: #0a0f14; opacity: 0;
      pointer-events: none; transition: opacity 320ms ease;
    }
    .scene-fade--active { opacity: 1; pointer-events: auto; }
    .loading-overlay { position: absolute; top: 0; left: 0; right: 0; z-index: 300; }
    .error-overlay {
      position: absolute; inset: 0; z-index: 300; display: flex; flex-direction: column;
      gap: 14px; align-items: center; justify-content: center;
      background: rgba(8,12,18,.9); color: #e8f0f4; padding: 24px; text-align: center;
    }
    .error-overlay mat-icon { font-size: 36px; color: rgba(168,80,98,.8); }
    .error-overlay p { margin: 0; color: rgba(232,240,244,.6); }
    .action-toast {
      position: absolute; top: 64px; left: 50%; transform: translateX(-50%); z-index: 320;
      max-width: min(92vw, 520px); padding: 10px 16px; border-radius: 12px;
      background: rgba(143,47,61,.92); color: #fff; font-weight: 700; text-align: center;
    }
    .resume-overlay {
      position: absolute; inset: 0; z-index: 400; display: grid; place-items: center;
      padding: 24px; background: rgba(8,12,18,.88);
    }
    .resume-card {
      width: min(560px, 100%); padding: clamp(24px, 4vw, 36px); color: #e8f0f4; text-align: left;
    }
    .resume-card h2 { margin: 12px 0; color: #fff; font-size: 1.6rem; }
    .resume-card p { margin: 0; color: rgba(232,240,244,.72); line-height: 1.6; }
    .resume-metrics { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }
    .resume-metrics span {
      padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.08); font-size: .82rem; font-weight: 700;
    }
    .resume-actions { display: grid; gap: 10px; margin-top: 20px; }
    .resume-actions .psy-button { width: 100%; }

    @keyframes hint-rise {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes panel-in {
      from { opacity: 0; transform: translateX(14px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Mobile: panel derecho como bottom sheet, dock scrolleable ───────── */
    @media (max-width: 760px) {
      .main-zone { padding: 8px 8px 0; }
      .game-container[data-mode='dialogue-right'] .main-zone {
        grid-template-columns: minmax(0, 1fr);
      }
      .right-panel {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        max-height: 62vh;
        z-index: 80;
        border-radius: 18px 18px 0 0;
        animation: sheet-up 200ms cubic-bezier(.2,.8,.2,1) both;
      }
      .objective-card {
        left: 8px;
        right: 8px;
        max-width: none;
        width: auto;
        padding: 7px 10px;
      }
      .objective-card__body p {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .objective-card__ethic { -webkit-line-clamp: 1; }
      .bottom-zone { flex-wrap: wrap; min-height: 0; padding: 6px 8px 8px; }
      /* El dock cede ancho (flex-basis 0) y scrollea por dentro: nunca debe
         empujar el ancho de la página. */
      .tool-dock { flex: 1 1 0; }
      .context-bar { justify-content: center; flex-basis: 100%; order: 3; }
      .context-bar__hint { display: none; }
      .safe-exit__copy strong { font-size: .66rem; }
    }
    @keyframes sheet-up {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .stress-vignette, .scene-fade { transition: none; }
      .right-panel, .context-bar__interaction, .overlay-backdrop { animation: none; }
    }
  `]
})
export class SimulationPlayComponent implements OnInit, OnDestroy {
  private readonly simulationService = inject(SimulationService);
  private readonly route = inject(ActivatedRoute);
  private readonly audioDirector = inject(AudioDirectorService);

  @ViewChild('gameWorld')    private gameWorld?: GameWorldComponent;
  @ViewChild('journalPanel') private journalPanel?: JournalPanelComponent;

  readonly attempt    = signal<SimulationAttemptState | null>(null);
  readonly pendingActiveAttempt = signal<SimulationAttemptState | null>(null);
  readonly showResumePrompt = signal(false);
  readonly progressMap = signal<ProgressMapState | null>(null);
  readonly world      = signal<SimulationWorldState | null>(null);
  readonly scenarioConfig = signal<ScenarioConfig | null>(null);
  readonly loading    = signal(true);
  readonly busy       = signal(false);
  readonly error      = signal('');
  readonly actionError = signal('');
  readonly journalMessage      = signal('');
  readonly journalSaveState    = signal<JournalSaveState>('idle');
  readonly nearbyInteraction   = signal<MapObjectState | null>(null);
  private readonly pendingRestrictedInteraction = signal<MapObjectState | null>(null);
  readonly selectedInteraction = signal<MapObjectState | null>(null);
  readonly dialogue    = signal<DialogueState | null>(null);
  readonly stressPulse = signal(false);
  readonly a11yAnnouncement = signal('');
  readonly journalOpen  = signal(false);
  readonly fadeActive   = signal(false);

  /** Estado de vista del gameplay — gobierna el layout vía [attr.data-mode]. */
  readonly viewMode = computed<SimulationViewMode>(() => resolveViewMode({
    status: this.attempt()?.status ?? null,
    journalOpen: this.journalOpen(),
    dialogue: this.dialogue(),
  }));

  readonly sceneObjective = computed(() => getSceneObjective(this.attempt()?.currentNode.key));

  readonly selectedToolCode = computed(() => {
    const sel = this.selectedInteraction();
    return sel?.type === 'TOOL' ? sel.toolCode : null;
  });

  readonly stressVignetteLevel = computed(() => {
    const s = this.attempt()?.stressIndex ?? 0;
    if (s < 40) return 0;
    return Math.min(0.45, 0.05 + ((s - 40) / 60) * 0.4);
  });

  private lastPosition: { x: number; y: number } | null = null;
  private positionSaveHandle: number | null = null;

  ngOnDestroy(): void {
    this.audioDirector.dispose();
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('caseVersionId'));
    if (!id) { this.error.set('Caso no encontrado.'); this.loading.set(false); return; }

    this.simulationService.getActiveAttempt(id).subscribe({
      next: active => {
        if (active?.status === 'IN_PROGRESS') {
          this.pendingActiveAttempt.set(active);
          this.showResumePrompt.set(true);
          this.loading.set(false);
          return;
        }
        this.beginAttempt(id, false);
      },
      error: () => this.beginAttempt(id, false)
    });
  }

  resumeAttempt() {
    const active = this.pendingActiveAttempt();
    if (!active) return;
    this.showResumePrompt.set(false);
    this.loading.set(true);
    this.bootstrapAttempt(active);
  }

  startNewAttempt() {
    const id = Number(this.route.snapshot.paramMap.get('caseVersionId'));
    if (!id) return;
    this.showResumePrompt.set(false);
    this.loading.set(true);
    this.beginAttempt(id, true);
  }

  private beginAttempt(caseVersionId: number, forceNew: boolean) {
    this.simulationService.startAttempt(caseVersionId, forceNew).subscribe({
      next: attempt => this.bootstrapAttempt(attempt),
      error: () => {
        this.error.set('No pudimos iniciar la simulación. Revisa tus permisos.');
        this.loading.set(false);
      }
    });
  }

  private bootstrapAttempt(attempt: SimulationAttemptState) {
    this.audioDirector.init();
    this.attempt.set(attempt);
    this.persistAttemptToken(attempt);
    this.loadProgressMap(attempt);
    this.loadWorld(attempt);
    this.audioDirector.setStressLevel(attempt.stressIndex);
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalInteraction(event: KeyboardEvent) {
    // Si otro handler ya consumió la tecla (p. ej. el panel de diálogo cierra
    // con Escape en document:keydown), no reinterpretarla aquí: sin esta
    // guarda, un solo Escape cerraba el diálogo Y disparaba la salida segura.
    if (event.defaultPrevented) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    const editable = (event.target as HTMLElement | null)?.isContentEditable;

    if (event.key === 'Escape') {
      if (this.journalOpen()) { event.preventDefault(); this.journalOpen.set(false); return; }
      if (this.dialogue())    { event.preventDefault(); this.closeDialogue(); return; }
      const g = this.attempt();
      if (g?.status === 'IN_PROGRESS' && !this.busy()) { event.preventDefault(); this.safeExit(); }
      return;
    }

    if ((event.key === 'j' || event.key === 'J') && tag !== 'INPUT' && tag !== 'TEXTAREA' && !editable) {
      event.preventDefault();
      this.journalOpen.set(!this.journalOpen());
      return;
    }

    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

    if (['e','E',' ','Enter'].includes(event.key)) {
      const nb = this.nearbyInteraction();
      if (!nb) return;
      event.preventDefault();
      this.openInteraction(nb);
    }
  }

  openInteraction(interaction: MapObjectState) {
    const game = this.attempt();
    if (!game || game.status !== 'IN_PROGRESS') return;

    if (isSceneAmbientInteraction(interaction.key)) {
      this.showAmbientDialogue(interaction);
      return;
    }

    if (isRiskyInteraction(interaction.key)) {
      this.showRiskyActionWarning(interaction);
      return;
    }

    this.openBackendInteraction(interaction);
  }

  handleFrontendChoice(key: string) {
    if (key === 'frontend:cancel-restricted') {
      this.pendingRestrictedInteraction.set(null);
      this.closeDialogue();
      return;
    }
    if (key === 'frontend:proceed-restricted') {
      const interaction = this.pendingRestrictedInteraction();
      this.pendingRestrictedInteraction.set(null);
      this.dialogue.set(null);
      if (interaction) this.openBackendInteraction(interaction);
    }
  }

  proximityLabel(obj: MapObjectState): string {
    const mapKey = this.world()?.map.key;
    if (obj.type === 'EXIT') return `${getSceneDisplayLabel(obj, mapKey)} →`;
    return getSceneDisplayLabel(obj, mapKey);
  }

  proximityDescription(obj: MapObjectState): string {
    return getSceneInteractionDescription(obj, this.world()?.map.key);
  }

  private openBackendInteraction(interaction: MapObjectState) {
    const game = this.attempt();
    if (!game || game.status !== 'IN_PROGRESS') return;

    this.selectedInteraction.set(interaction);
    this.gameWorld?.focus(interaction.key);
    this.busy.set(true);
    this.simulationService.openInteraction(game.attemptId, game.attemptToken, interaction.key).subscribe({
      next: result => {
        this.world.set(result.world);
        this.selectedInteraction.set(result.interaction);
        this.dialogue.set(result.dialogue ?? result.interaction.dialogue);
        this.busy.set(false);
      },
      error: () => { this.showActionError('No pudimos abrir la interacción.'); this.busy.set(false); }
    });
  }

  private showRiskyActionWarning(interaction: MapObjectState) {
    const def = getRiskyInteractionDef(interaction.key);
    if (!def) return;

    this.pendingRestrictedInteraction.set(interaction);
    this.selectedInteraction.set(interaction);
    this.gameWorld?.focus(interaction.key);
    this.dialogue.set({
      key: `risky-warning-${interaction.key}`,
      speakerName: def.speakerName,
      portraitKey: def.portraitKey,
      emotion: 'concerned',
      lines: [{
        order: 1,
        speakerName: def.speakerName,
        text: def.warningMessage,
        emotion: 'concerned',
      }],
      choices: [
        {
          key: 'frontend:cancel-restricted',
          text: 'Cancelar',
          decisionOptionId: null,
          requiredToolCode: null,
          effect: {},
          isRecommended: true,
        },
        {
          key: 'frontend:proceed-restricted',
          text: 'Continuar bajo riesgo',
          decisionOptionId: null,
          requiredToolCode: null,
          effect: {},
          isProhibited: true,
        },
      ],
    });
  }

  private showAmbientDialogue(interaction: MapObjectState) {
    this.selectedInteraction.set(interaction);
    const mapKey = this.world()?.map.key;
    const text = interaction.key === 'ambient:protocolo-noticia-dificil'
      ? PROTOCOL_INFO_MESSAGE
      : COMISARIA_AMBIENT_INFO[interaction.key]
        ?? getSceneInteractionDescription(interaction, mapKey);
    this.dialogue.set({
      key: interaction.key,
      speakerName: interaction.label,
      portraitKey: 'info',
      emotion: 'neutral',
      lines: [{
        order: 1,
        speakerName: interaction.label,
        text,
        emotion: 'neutral',
      }],
      choices: [],
    });
  }

  private showActionError(message: string) {
    this.actionError.set(message);
    window.setTimeout(() => this.actionError.set(''), 4500);
  }

  executeDecision(decisionOptionId: number) {
    const game = this.attempt();
    if (!game || this.busy()) return;
    this.busy.set(true);
    this.dialogue.set(null);
    this.journalMessage.set('');
    this.triggerFade(() => {
      this.simulationService.chooseDecision(game.attemptId, game.attemptToken, decisionOptionId).subscribe({
        next: updated => {
          this.attempt.set(updated);
          this.persistAttemptToken(updated);
          this.selectedInteraction.set(null);
          this.nearbyInteraction.set(null);
          this.journalPanel?.clear();
          this.loadProgressMap(updated);
          this.loadWorld(updated);
          this.audioDirector.setStressLevel(updated.stressIndex);
          if (updated.status === 'COMPLETED') {
            this.audioDirector.playResolution();
            this.audioDirector.playSfx('session_complete');
          }
          if (updated.feedback) {
            window.setTimeout(() => this.dialogue.set(this.buildSupervisionDialogue(updated.feedback!)), 400);
          }
        },
        error: () => { this.showActionError('No pudimos ejecutar la intervención.'); this.busy.set(false); this.fadeActive.set(false); }
      });
    });
  }

  useTool(toolCode: string) {
    const game = this.attempt();
    const target = this.selectedInteraction()?.key ?? null;
    if (!game || this.busy()) return;
    this.busy.set(true);
    this.simulationService.useTool(game.attemptId, game.attemptToken, toolCode, target).subscribe({
      next: (result: ToolUseResult) => {
        this.world.set(result.world);
        const cur = this.attempt();
        if (cur) {
          const newStress = Math.max(0, Math.min(100, cur.stressIndex + result.stressDelta));
          this.attempt.set({ ...cur, stressIndex: newStress });
          this.audioDirector.setStressLevel(newStress);
        }
        this.showToolFeedback(result);
        this.busy.set(false);
      },
      error: () => { this.showActionError('No pudimos usar la herramienta.'); this.busy.set(false); }
    });
  }

  selectTool(toolCode: string) {
    const tool = this.world()?.tools.find(t => t.code === toolCode);
    if (!tool) return;
    this.audioDirector.playSfx('ui_select');
    this.dialogue.set({
      key: tool.code, speakerName: 'Herramienta profesional', portraitKey: tool.icon, emotion: 'neutral',
      lines: [{ order: 1, speakerName: tool.label, text: tool.description, emotion: 'neutral' }], choices: []
    });
    this.selectedInteraction.set({
      key: `tool-${tool.code}`, label: tool.label, type: 'TOOL',
      x: 0, y: 0, width: 0, height: 0, color: '#4FA3A5', icon: tool.icon,
      shortCode: tool.code.slice(0,4), collision: false,
      interactionPrompt: 'Herramienta profesional', interactionText: tool.description,
      decisionOptionId: null, toolCode: tool.code, dialogue: null
    });
  }

  closeDialogue() { this.dialogue.set(null); }

  /** Diálogo informativo de NPC (frontend-only, sin decisión) → modo cinematic. */
  openNpcDialogue(npc: NpcConfig) {
    if (!npc.dialogue?.lines?.length) return;
    this.dialogue.set({
      key: `npc-${npc.key}`,
      speakerName: npc.displayName,
      portraitKey: npc.portrait ?? null,
      emotion: 'neutral',
      lines: npc.dialogue.lines.map((line, index) => ({
        order: index + 1,
        speakerName: npc.displayName,
        text: line.text,
        emotion: line.emotion ?? 'neutral',
      })),
      choices: [],
    });
  }

  saveReflection(text: string) {
    const game = this.attempt();
    if (!game || !text.trim() || this.busy()) return;
    this.busy.set(true);
    this.journalSaveState.set('saving');
    this.simulationService.saveReflection(game.attemptId, game.attemptToken, game.currentNode.id, text.trim()).subscribe({
      next: () => {
        this.journalMessage.set('Bitácora guardada y cifrada.');
        this.journalSaveState.set('saved');
        this.busy.set(false);
      },
      error: () => {
        this.journalMessage.set('No pudimos guardar la bitácora.');
        this.journalSaveState.set('error');
        this.busy.set(false);
      }
    });
  }

  safeExit() {
    const game = this.attempt();
    if (!game || this.busy()) return;
    // Sonido discreto: la salida segura es seria, no alarmista.
    this.audioDirector.playSfx('ui_cancel');
    this.busy.set(true);
    this.simulationService.safeExit(game.attemptId, game.attemptToken, 'Salida segura solicitada').subscribe({
      next: updated => { this.attempt.set(updated); this.selectedInteraction.set(null); this.dialogue.set(null); this.loadWorld(updated); },
      error: () => { this.showActionError('No pudimos registrar la salida segura.'); this.busy.set(false); }
    });
  }

  rememberPosition(x: number, y: number) {
    this.lastPosition = { x, y };
    if (this.positionSaveHandle) window.clearTimeout(this.positionSaveHandle);
    this.positionSaveHandle = window.setTimeout(() => this.persistPosition(), 550);
  }

  progressLabel(): string {
    const map = this.progressMap();
    if (!map?.nodes.length) return 'Progreso: escenario actual';
    const visited = new Set(map.visitedNodeKeys);
    const completed = map.nodes.filter(node => visited.has(node.key) || node.key === map.currentNodeKey).length;
    return `Progreso: ${completed} de ${map.nodes.length} escenarios`;
  }

  currentStageLabel(): string {
    const map = this.progressMap();
    const currentKey = this.attempt()?.currentNode.key;
    if (!map?.nodes.length || !currentKey) return 'Escenario actual';
    const index = map.nodes.findIndex(node => node.key === currentKey);
    return index >= 0 ? `Escenario ${index + 1} de ${map.nodes.length}` : 'Escenario actual';
  }

  visitedStageLabels(): string[] {
    const map = this.progressMap();
    if (!map?.nodes.length) return [];
    const visited = new Set(map.visitedNodeKeys);
    return map.nodes
      .filter(node => visited.has(node.key))
      .map(node => node.label);
  }

  supportResources(): string[] {
    const game = this.attempt();
    const resources = [
      ...(game?.currentNode.supportResources ?? []),
      ...(game?.supportResources ?? [])
    ];
    return Array.from(new Set(resources.filter(Boolean)));
  }

  statusLabelA11y(status: SimulationAttemptState['status']): string {
    return { IN_PROGRESS:'En progreso', COMPLETED:'Finalizado', SAFE_EXITED:'Pausado con salida segura' }[status];
  }

  private showToolFeedback(result: ToolUseResult): void {
    this.audioDirector.playSfx('ui_confirm');
    this.dialogue.set({
      key: `tool-feedback-${result.toolCode}-${Date.now()}`,
      speakerName: result.pertinent ? '✓ Herramienta pertinente' : 'ℹ Herramienta aplicada',
      portraitKey: null, emotion: result.pertinent ? 'positive' : 'neutral',
      lines: [
        { order: 1, speakerName: '', text: result.feedbackMessage, emotion: 'neutral' },
        { order: 2, speakerName: '', text: `Estrés ${result.stressDelta >= 0 ? '+' : ''}${result.stressDelta}%`, emotion: 'neutral' }
      ],
      choices: []
    });
    this.stressPulse.set(true);
    window.setTimeout(() => this.stressPulse.set(false), 700);
    this.announce(result.feedbackMessage);
    window.setTimeout(() => {
      if (this.dialogue()?.key?.startsWith('tool-feedback-')) this.dialogue.set(null);
    }, 5000);
  }

  private buildSupervisionDialogue(feedback: SimulationFeedback): DialogueState {
    const lines: DialogueState['lines'] = [
      { order: 1, speakerName: 'Supervisión clínica', text: feedback.message, emotion: feedback.prohibitedConduct ? 'danger' : 'neutral' }
    ];
    if (feedback.prohibitionReason) {
      lines.push({ order: 2, speakerName: 'Supervisión clínica', text: feedback.prohibitionReason, emotion: 'danger' });
    }
    lines.push({
      order: lines.length + 1,
      speakerName: '',
      text: `Puntaje ${feedback.scoreDelta >= 0 ? '+' : ''}${feedback.scoreDelta} · Estrés ${feedback.stressDelta >= 0 ? '+' : ''}${feedback.stressDelta}% · Confianza ${feedback.trustDelta >= 0 ? '+' : ''}${feedback.trustDelta} · Riesgo ${feedback.victimRiskDelta >= 0 ? '+' : ''}${feedback.victimRiskDelta}`,
      emotion: 'neutral'
    });
    return {
      key: `supervision-${Date.now()}`, speakerName: 'Supervisión clínica',
      portraitKey: null,
      emotion: feedback.prohibitedConduct ? 'danger' : feedback.classification === 'ADEQUATE' ? 'positive' : 'neutral',
      lines, choices: []
    };
  }

  private triggerFade(callback: () => void): void {
    this.audioDirector.playSfx('dialogue_advance');
    this.fadeActive.set(true);
    window.setTimeout(callback, 340);
  }

  private loadProgressMap(attempt: SimulationAttemptState) {
    this.simulationService.getProgressMap(attempt.attemptId, attempt.attemptToken).subscribe({
      next: map => this.progressMap.set(map),
      error: () => this.progressMap.set(null)
    });
  }

  private loadWorld(attempt: SimulationAttemptState) {
    this.simulationService.getWorld(attempt.attemptId, attempt.attemptToken).subscribe({
      next: world => {
        this.scenarioConfig.set(null);
        this.simulationService.getScenarioConfig(world.map.key).subscribe({
          next: config => {
            this.scenarioConfig.set(config);
            this.applyLoadedWorld(world);
          },
          error: () => {
            this.applyLoadedWorld(world);
          }
        });
      },
      error: () => {
        this.error.set('No pudimos cargar el mapa del caso.');
        this.loading.set(false);
        this.busy.set(false);
        this.fadeActive.set(false);
      }
    });
  }

  private applyLoadedWorld(world: SimulationWorldState): void {
    this.world.set(world);
    this.loading.set(false);
    this.busy.set(false);
    window.setTimeout(() => this.fadeActive.set(false), 80);
  }

  private announce(message: string): void {
    this.a11yAnnouncement.set('');
    window.setTimeout(() => this.a11yAnnouncement.set(message), 50);
  }

  private persistAttemptToken(attempt: SimulationAttemptState) {
    sessionStorage.setItem(`siep_attempt_${attempt.caseVersionId}`, JSON.stringify({
      attemptId: attempt.attemptId,
      attemptToken: attempt.attemptToken
    }));
  }

  private persistPosition() {
    const game = this.attempt(), world = this.world();
    if (!game || !world || !this.lastPosition || game.status !== 'IN_PROGRESS') return;
    this.simulationService.updateWorldState(game.attemptId, game.attemptToken,
      this.lastPosition.x, this.lastPosition.y, world.map.key)
      .subscribe({ next: u => this.world.set(u), error: () => undefined });
  }
}
