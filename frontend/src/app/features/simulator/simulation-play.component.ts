import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SimulationService } from '../../core/api/simulation.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  DialogueState, InterventionRuleSet, MapObjectState, NpcConfig, PatientState,
  ProgressMapState, SimulationAttemptState, ScenarioConfig, SimulationFeedback,
  SimulationWorldState, ToolUseResult
} from '../../core/models/simulation.model';
import {
  DEFAULT_INTERVENTION_RULES, PATIENT_INITIAL_STATE, applyFeedbackToPatient, parseInterventionRules,
} from './patient-state.util';
import { choiceEvidence, mergeEvidence, type NodeEvidenceDef, missingEvidence, nodeEvidence, unlockedExtraLines } from './evidence-gating.config';
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
import { getSceneGuide } from './scene-guide.config';
import { getSceneObjective } from './scene-objectives.config';
import { AttemptOutcomeComponent } from './attempt-outcome.component';
import { resolveViewMode, SimulationViewMode } from './simulation-view-mode.util';

const SIMULATOR_INTRO_VIDEO = 'assets/video/fondoHabitacion.mp4';
const CASE_INTRO_TITLE = 'Contexto inicial del caso';
const CASE_INTRO_AUDIO = 'PsicoLament';
const CASE_INTRO_PARAGRAPHS = [
  'Son las 11 de la noche en un barrio con altas condiciones de vulnerabilidad: pobreza, violencias urbanas, robos, expendio de drogas, presencia de grupos armados ilegales y riñas callejeras entre vecinos.',
  'Un hombre de aproximadamente 28 años entra a su domicilio, donde reside con su pareja actual, una mujer de 22 años. Ella tiene una hija de 3 años.',
  'En horas de la tarde, el hombre había tenido un altercado verbal con su pareja. Hubo groserías, maltrato psicológico y chantaje emocional: le dijo que sin él no era nadie, que era una mujer mantenida y que estaba seguro de que ella le era infiel.',
  'Esa noche, cuando él entra a la residencia, la mujer le reclama por llegar tarde y haberse perdido toda la tarde.',
  'El hombre, sin mediar palabra, saca una navaja y hiere a la niña de 3 años, causándole la muerte de manera inmediata. Luego hiere a la mujer con 28 heridas de arma cortopunzante, dejándola gravemente herida.',
  'Tu intervención inicia en urgencias. Lee el contexto con cuidado: cada conversación, herramienta y decisión puede cambiar el curso de la atención.'
];

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
      @if (doorNotice()) {
        <div class="door-notice" role="alert">
          <mat-icon aria-hidden="true">lock</mat-icon>
          <span>{{ doorNotice() }}</span>
        </div>
      }
      @if (roomBanner()) {
        <div class="room-banner" role="status">{{ roomBanner() }}</div>
      }
      @if (transitionNote()) {
        <div class="transition-note" role="status">
          <p>{{ transitionNote() }}</p>
        </div>
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
        @if (showIntroVideo()) {
          <section class="intro-video-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-video-title">
            <article class="intro-video-card">
              <header class="intro-video-card__header">
                <p class="psy-eyebrow">Introducción</p>
                <h2 id="intro-video-title">Antes de comenzar</h2>
                <span>Contexto visual del escenario</span>
              </header>

              <div class="intro-video-card__media">
                <video #introVideo class="intro-video" [src]="introVideoSrc" playsinline
                  (loadeddata)="playIntroVideo()" (ended)="onIntroVideoEnded()"></video>
              </div>

              <footer class="intro-video-card__actions">
                @if (introVideoEnded()) {
                  <span>Video completado. Continúa para leer el contexto del caso.</span>
                } @else {
                  <span>Reproduce el video o continúa cuando quieras.</span>
                }
                <button class="psy-button psy-button--primary" type="button" (click)="continueFromIntroVideo()">
                  {{ introVideoEnded() ? 'Continuar' : 'Saltar video' }}
                </button>
              </footer>
            </article>
          </section>
        }

        @if (showCaseIntro()) {
          <section class="case-intro-overlay" role="dialog" aria-modal="true" aria-labelledby="case-intro-title">
            <article class="case-intro-card">
              <header class="case-intro-card__header">
                <p class="psy-eyebrow">Primera escena</p>
                <h2 id="case-intro-title">{{ caseIntroTitle }}</h2>
                <span>{{ caseIntroAudio }} está sonando</span>
              </header>

              <div class="case-intro-card__body" tabindex="0" aria-label="Contexto narrativo del caso">
                @for (paragraph of caseIntroParagraphs; track paragraph) {
                  <p>{{ paragraph }}</p>
                }
              </div>

              <footer class="case-intro-card__actions">
                <span>Lee el contexto completo antes de iniciar la intervención.</span>
                <button class="psy-button psy-button--primary" type="button" (click)="continueFromCaseIntro()">
                  Continuar
                </button>
              </footer>
            </article>
          </section>
        }

        <header class="top-bar">
          <app-simulation-hud
            [attempt]="game"
            [stressPulse]="stressPulse()"
            [nearbyInteractionKey]="nearbyInteraction()?.key ?? null"
            [patientState]="patientState()"
            [stageLabel]="currentStageLabel()"
            [progressLabel]="progressLabel()"
            [locationLabel]="world()?.map?.title ?? ''"
            [journalOpen]="journalOpen()"
            [musicMuted]="musicMuted()"
            [sfxMuted]="sfxMuted()"
            [reduceMotion]="reduceMotion()"
            (toggleJournal)="journalOpen.set(!journalOpen())"
            (toggleMusic)="toggleMusicMute()"
            (toggleSfx)="toggleSfxMute()"
            (toggleReduceMotion)="toggleReduceMotion()" />
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
                [guide]="sceneGuide()"
                [nearbyInteraction]="nearbyInteraction()" [selectedInteractionKey]="selectedInteraction()?.key ?? null"
                [motionPaused]="worldMotionPaused()"
                [sfxMuted]="sfxMuted()"
                [reduceMotion]="reduceMotion()"
                (proximity)="nearbyInteraction.set($event)" (interact)="openInteraction($event)"
                (npcInteract)="openNpcDialogue($event)"
                (roomExit)="onRoomExit($event)"
                (enterRoom)="onDoorTrigger($event)"
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

    .intro-video-overlay {
      position: absolute;
      inset: 0;
      z-index: 390;
      display: grid;
      place-items: center;
      padding: clamp(14px, 4vw, 32px);
      background:
        radial-gradient(circle at 50% 20%, rgba(124,77,255,.16), transparent 40%),
        rgba(5,8,14,.92);
      backdrop-filter: blur(8px);
    }
    .intro-video-card {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: min(860px, 100%);
      max-height: min(88vh, 760px);
      border: 1px solid rgba(182,156,255,.34);
      border-radius: 18px;
      overflow: hidden;
      color: var(--sim-ink);
      background: linear-gradient(180deg, rgba(18,24,42,.96), rgba(8,12,18,.98));
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.04),
        0 28px 80px -36px rgba(124,77,255,.75);
    }
    .intro-video-card__header {
      display: grid;
      gap: 8px;
      padding: clamp(18px, 4vw, 28px) clamp(18px, 4vw, 32px) 16px;
      border-bottom: 1px solid rgba(182,156,255,.18);
      background: rgba(124,77,255,.08);
    }
    .intro-video-card__header h2 {
      margin: 0;
      font-size: clamp(1.25rem, 3.6vw, 2rem);
      line-height: 1.15;
      color: #fff;
    }
    .intro-video-card__header span {
      width: fit-content;
      padding: 5px 10px;
      border: 1px solid rgba(108,192,199,.32);
      border-radius: 999px;
      color: #bdeef2;
      background: rgba(108,192,199,.1);
      font-size: .74rem;
      font-weight: 800;
      letter-spacing: .04em;
    }
    .intro-video-card__media {
      min-height: 0;
      display: grid;
      place-items: center;
      padding: 12px clamp(14px, 3vw, 24px);
      background: #05080e;
    }
    .intro-video {
      display: block;
      width: 100%;
      max-height: min(52vh, 420px);
      border-radius: 12px;
      border: 1px solid rgba(182,156,255,.24);
      background: #000;
      object-fit: contain;
    }
    .intro-video-card__actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px clamp(18px, 4vw, 32px);
      border-top: 1px solid rgba(182,156,255,.18);
      background: rgba(5,8,14,.62);
    }
    .intro-video-card__actions span {
      color: rgba(244,247,251,.58);
      font-size: .78rem;
      line-height: 1.4;
    }
    .intro-video-card__actions .psy-button {
      flex-shrink: 0;
      min-width: 140px;
    }

    .case-intro-overlay {
      position: absolute;
      inset: 0;
      z-index: 380;
      display: grid;
      place-items: center;
      padding: clamp(14px, 4vw, 32px);
      background:
        radial-gradient(circle at 50% 20%, rgba(124,77,255,.16), transparent 40%),
        rgba(5,8,14,.9);
      backdrop-filter: blur(8px);
    }
    .case-intro-card {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: min(760px, 100%);
      max-height: min(86vh, 720px);
      border: 1px solid rgba(182,156,255,.34);
      border-radius: 18px;
      overflow: hidden;
      color: var(--sim-ink);
      background: linear-gradient(180deg, rgba(18,24,42,.96), rgba(8,12,18,.98));
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.04),
        0 28px 80px -36px rgba(124,77,255,.75);
    }
    .case-intro-card__header {
      display: grid;
      gap: 8px;
      padding: clamp(18px, 4vw, 28px) clamp(18px, 4vw, 32px) 16px;
      border-bottom: 1px solid rgba(182,156,255,.18);
      background: rgba(124,77,255,.08);
    }
    .case-intro-card__header h2 {
      margin: 0;
      font-size: clamp(1.25rem, 3.6vw, 2rem);
      line-height: 1.15;
      color: #fff;
    }
    .case-intro-card__header span {
      width: fit-content;
      padding: 5px 10px;
      border: 1px solid rgba(108,192,199,.32);
      border-radius: 999px;
      color: #bdeef2;
      background: rgba(108,192,199,.1);
      font-size: .74rem;
      font-weight: 800;
      letter-spacing: .04em;
    }
    .case-intro-card__body {
      min-height: 0;
      overflow-y: auto;
      padding: 20px clamp(18px, 4vw, 34px);
      scrollbar-color: rgba(182,156,255,.45) rgba(255,255,255,.06);
    }
    .case-intro-card__body:focus-visible {
      outline: 2px solid rgba(108,192,199,.75);
      outline-offset: -4px;
    }
    .case-intro-card__body p {
      margin: 0 0 14px;
      color: rgba(244,247,251,.84);
      font-size: clamp(.92rem, 2vw, 1rem);
      line-height: 1.7;
    }
    .case-intro-card__body p:last-child { margin-bottom: 0; color: #f3dfb5; }
    .case-intro-card__actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px clamp(18px, 4vw, 32px);
      border-top: 1px solid rgba(182,156,255,.18);
      background: rgba(5,8,14,.62);
    }
    .case-intro-card__actions span {
      color: rgba(244,247,251,.58);
      font-size: .78rem;
      line-height: 1.4;
    }
    .case-intro-card__actions .psy-button {
      flex-shrink: 0;
      min-width: 140px;
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
    .door-notice {
      position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%); z-index: 320;
      display: flex; align-items: center; gap: 10px;
      max-width: min(92vw, 560px); padding: 12px 18px; border-radius: 14px;
      background: rgba(24,30,46,.94); border: 1px solid rgba(245,184,75,.45);
      color: #ffe2ae; font-weight: 600; text-align: left;
      animation: door-notice-in 220ms ease;
    }
    .door-notice mat-icon { color: #F5B84B; flex-shrink: 0; }
    @keyframes door-notice-in { from { opacity: 0; transform: translate(-50%, 8px); } }
    .room-banner {
      position: absolute; top: 96px; left: 50%; transform: translateX(-50%); z-index: 320;
      padding: 10px 22px; border-radius: 999px;
      background: rgba(18,24,42,.9); border: 1px solid var(--sim-border);
      color: var(--sim-ink); font-weight: 800; letter-spacing: .04em;
      animation: room-banner-in 260ms ease;
      pointer-events: none;
    }
    @keyframes room-banner-in { from { opacity: 0; transform: translate(-50%, -8px); } }
    .transition-note {
      position: fixed; inset: 0; z-index: 340; display: grid; place-items: center;
      background: rgba(6,9,16,.92); pointer-events: none;
      animation: transition-note-in 420ms ease;
    }
    .transition-note p {
      max-width: min(88vw, 640px); margin: 0; padding: 0 24px; text-align: center;
      color: #f4f7fb; font-size: clamp(1.05rem, 2.4vw, 1.45rem); font-weight: 600;
      line-height: 1.6; letter-spacing: .02em; font-style: italic;
    }
    @keyframes transition-note-in { from { opacity: 0; } }
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
      .case-intro-overlay { padding: 10px; }
      .case-intro-card { max-height: 90vh; border-radius: 14px; }
      .case-intro-card__actions {
        display: grid;
        justify-items: stretch;
      }
      .case-intro-card__actions .psy-button { width: 100%; }
      .intro-video-overlay { padding: 10px; }
      .intro-video-card { max-height: 92vh; border-radius: 14px; }
      .intro-video-card__actions {
        display: grid;
        justify-items: stretch;
      }
      .intro-video-card__actions .psy-button { width: 100%; }
    }
    @keyframes sheet-up {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .stress-vignette, .scene-fade { transition: none; }
      .right-panel, .context-bar__interaction, .overlay-backdrop { animation: none; }
      .door-notice, .room-banner, .transition-note { animation: none; }
    }
  `]
})
export class SimulationPlayComponent implements OnInit, OnDestroy {
  private readonly simulationService = inject(SimulationService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly audioDirector = inject(AudioDirectorService);

  @ViewChild('gameWorld')    private gameWorld?: GameWorldComponent;
  @ViewChild('journalPanel') private journalPanel?: JournalPanelComponent;
  @ViewChild('introVideo')   private introVideoRef?: ElementRef<HTMLVideoElement>;

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
  /** Puerta bloqueada: aviso transitorio propio (NO abre DialoguePanel). */
  readonly doorNotice   = signal('');
  /** Nombre de la sala al entrar (1-2 s). */
  readonly roomBanner   = signal('');
  /** Salto temporal / texto de transición autorado (map.ambient.transitionText). */
  readonly transitionNote = signal('');
  readonly showIntroVideo = signal(false);
  readonly introVideoEnded = signal(false);
  readonly introVideoSrc = SIMULATOR_INTRO_VIDEO;
  readonly showCaseIntro = signal(false);
  readonly caseIntroTitle = CASE_INTRO_TITLE;
  readonly caseIntroAudio = CASE_INTRO_AUDIO;
  readonly caseIntroParagraphs = CASE_INTRO_PARAGRAPHS;
  readonly musicMuted = signal(false);
  readonly sfxMuted = signal(false);
  readonly reduceMotion = signal(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  private readonly seenTransitionMapKeys = new Set<string>();

  /** Estado reactivo de la paciente (Fase 8) — alimenta HUD y tint/shake del NPC. */
  readonly patientState = signal<PatientState>(PATIENT_INITIAL_STATE);
  private interventionRules: InterventionRuleSet = DEFAULT_INTERVENTION_RULES;
  /** NPCs de ScenarioConfig hablados en esta sesión (evidencia frontend, Fase 9). */
  private readonly viewedNpcKeys = signal<ReadonlySet<string>>(new Set<string>());
  private pendingEvidenceDecisionId: number | null = null;

  /** Estado de vista del gameplay — gobierna el layout vía [attr.data-mode]. */
  readonly viewMode = computed<SimulationViewMode>(() => resolveViewMode({
    status: this.attempt()?.status ?? null,
    journalOpen: this.journalOpen(),
    dialogue: this.dialogue(),
  }));

  readonly sceneObjective = computed(() => getSceneObjective(this.attempt()?.currentNode.key));
  readonly sceneGuide = computed(() => {
    const guide = getSceneGuide(this.attempt()?.currentNode.key);
    const world = this.world();
    if (!guide || !world?.objects.some(object => object.key === guide.targetKey)) return null;
    return guide;
  });

  /** El mundo se congela con diálogo, journal u outcome abiertos (Fase 5/13). */
  readonly worldMotionPaused = computed(() =>
    this.showIntroVideo() || this.showCaseIntro() || this.dialogue() !== null || this.journalOpen() || (this.attempt()?.status ?? 'IN_PROGRESS') !== 'IN_PROGRESS');

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
    this.introVideoRef?.nativeElement?.pause();
    this.audioDirector.stopIntroLament();
    this.audioDirector.dispose();
  }

  ngOnInit() {
    this.simulationService.getInterventionRules().subscribe({
      next: raw => { this.interventionRules = parseInterventionRules(raw); },
      error: () => { this.interventionRules = DEFAULT_INTERVENTION_RULES; },
    });
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
    this.musicMuted.set(this.audioDirector.isMusicMuted());
    this.sfxMuted.set(this.audioDirector.isSfxMuted());
    this.attempt.set(attempt);
    this.patientState.set(PATIENT_INITIAL_STATE);
    this.viewedNpcKeys.set(this.restoreViewedNpcKeys(attempt));
    this.pendingEvidenceDecisionId = null;
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

    if (this.showIntroVideo()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.continueFromIntroVideo();
      }
      return;
    }

    if (this.showCaseIntro()) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.continueFromCaseIntro();
      }
      return;
    }

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

    if (interaction.type === 'EXIT' && this.doorTargetNodeKey(interaction)) {
      this.tryOpenDoor(interaction);
      return;
    }

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
        this.mergeViewedNpcKeysFromWorld(result.world);
        this.selectedInteraction.set(result.interaction);
        this.dialogue.set(this.decorateDialogue(result.dialogue ?? result.interaction.dialogue));
        this.busy.set(false);
      },
      error: () => { this.showActionError('No pudimos abrir la interacción.'); this.busy.set(false); }
    });
  }

  private doorTargetNodeKey(obj: MapObjectState): string | null {
    const target = (obj.metadata as { targetNodeKey?: unknown } | undefined)?.targetNodeKey;
    return typeof target === 'string' && target ? target : null;
  }

  /** Fase 10: puerta espacial NO puntuada — usa el enterRoom existente.
   *  Caso PDF: envía doorKey (el backend re-valida puerta y requisitos), y la
   *  puerta bloqueada muestra un aviso transitorio, no un DialoguePanel. */
  private tryOpenDoor(door: MapObjectState) {
    const game = this.attempt();
    const target = this.doorTargetNodeKey(door);
    if (!game || !target || this.busy()) return;
    const meta = (door.metadata ?? {}) as {
      entryX?: number; entryY?: number; requiresNpcs?: string[];
      requiresTools?: string[]; requiresInspected?: string[];
      requiresNodes?: string[]; lockedMessage?: string;
    };
    const missing = missingEvidence(
      { npcs: meta.requiresNpcs, tools: meta.requiresTools, inspected: meta.requiresInspected, missingMessage: '' },
      this.world(), this.viewedNpcKeys(),
    );
    const stageLocked = (meta.requiresNodes?.length ?? 0) > 0
      && !meta.requiresNodes!.includes(game.currentNode.key);
    if (missing.length || stageLocked) {
      const message = meta.lockedMessage ?? 'Aún no puedes pasar: te falta información clave de esta sala.';
      this.audioDirector.playSfx('ui_cancel');
      this.showDoorNotice(message);
      return;
    }
    this.busy.set(true);
    this.triggerFade(() => {
      this.simulationService.enterRoom(
        game.attemptId, game.attemptToken, target,
        Number(meta.entryX ?? 0), Number(meta.entryY ?? 0), door.key,
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

  private doorNoticeTimer: number | null = null;

  private showDoorNotice(message: string): void {
    this.doorNotice.set(message);
    this.announce(message);
    if (this.doorNoticeTimer !== null) window.clearTimeout(this.doorNoticeTimer);
    this.doorNoticeTimer = window.setTimeout(() => this.doorNotice.set(''), 4200);
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

  /** Fase 9: líneas desbloqueadas por evidencia. Las opciones no revelan
   * su resultado pedagógico antes de responder. */
  private decorateDialogue(dialogue: DialogueState | null): DialogueState | null {
    if (!dialogue) return null;
    const node = this.attempt()?.currentNode;
    const nodeDef = nodeEvidence(node?.key);
    const extras = unlockedExtraLines(nodeDef, dialogue.key, this.world(), this.viewedNpcKeys());
    const lines = extras.length
      ? [...dialogue.lines, ...extras.map((text, i) => ({
          order: dialogue.lines.length + i + 1,
          speakerName: dialogue.speakerName, text, emotion: 'positive',
        }))]
      : dialogue.lines;
    const optionById = new Map((node?.options ?? []).map(o => [o.id, o]));
    const choices = dialogue.choices.map(choice => {
      if (choice.decisionOptionId == null) return choice;
      const option = optionById.get(choice.decisionOptionId);
      const evidenceDef = mergeEvidence(nodeDef, choiceEvidence(choice));
      const missing = missingEvidence(evidenceDef, this.world(), this.viewedNpcKeys());
      const evidenceMessage = evidenceDef && missing.length ? this.evidenceMissingMessage(evidenceDef, missing) : null;
      return {
        ...choice,
        isProhibited: choice.isProhibited || option?.prohibitedConduct || false,
        ...(evidenceMessage ? { evidenceWarning: evidenceMessage } : {}),
      };
    });
    return { ...dialogue, lines, choices };
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
    if (!(game.currentNode.options ?? []).some(o => o.id === decisionOptionId)) {
      // Decisión de otra etapa (sala visitada por puerta): feedback claro, sin 400.
      this.showActionError('Esta intervención pertenece a otra etapa del caso. Vuelve cuando el flujo te lleve a esta sala.');
      return;
    }
    const selectedChoice = this.dialogue()?.choices.find(choice => choice.decisionOptionId === decisionOptionId);
    const evidenceDef = mergeEvidence(nodeEvidence(game.currentNode.key), choiceEvidence(selectedChoice));
    const missing = missingEvidence(evidenceDef, this.world(), this.viewedNpcKeys());
    if (evidenceDef && missing.length && this.pendingEvidenceDecisionId !== decisionOptionId) {
      this.pendingEvidenceDecisionId = decisionOptionId;
      const message = this.evidenceMissingMessage(evidenceDef, missing);
      this.dialogue.set(this.buildEvidenceGateDialogue(message, decisionOptionId));
      this.announce(message);
      return;
    }
    this.pendingEvidenceDecisionId = null;
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
            const retryRequired = this.feedbackRequiresRetry(updated.feedback);
            if (!retryRequired) {
              // Consecuencia visible: la paciente reacciona (HUD + tint/shake del NPC).
              const nextPatient = applyFeedbackToPatient(this.patientState(), this.interventionRules, updated.feedback);
              this.patientState.set(nextPatient);
              this.gameWorld?.updatePatientVisualState(nextPatient);
            }
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
        this.mergeViewedNpcKeysFromWorld(result.world);
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
    this.viewedNpcKeys.update(prev => {
      const next = new Set(prev).add(npc.key);
      this.persistViewedNpcKeys(next);
      return next;
    });
    const game = this.attempt();
    if (game?.status === 'IN_PROGRESS') {
      this.simulationService.recordNpcInteraction(game.attemptId, game.attemptToken, npc.key).subscribe({
        next: world => this.mergeViewedNpcKeysFromWorld(world),
        error: () => this.showActionError('No pudimos guardar la interaccion con el NPC.'),
      });
    }
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

  toggleMusicMute(): void {
    const muted = this.audioDirector.toggleMusicMuted();
    this.musicMuted.set(muted);
    if (!muted) this.audioDirector.setStressLevel(this.attempt()?.stressIndex ?? 0);
    this.announce(muted ? 'Musica silenciada.' : 'Musica activada.');
  }

  toggleSfxMute(): void {
    const muted = this.audioDirector.toggleSfxMuted();
    this.sfxMuted.set(muted);
    this.announce(muted ? 'Sonidos de acciones silenciados.' : 'Sonidos de acciones activados.');
  }

  toggleReduceMotion(): void {
    const reduced = !this.reduceMotion();
    this.reduceMotion.set(reduced);
    this.announce(reduced ? 'Movimiento reducido activado.' : 'Movimiento reducido desactivado.');
  }

  private evidenceMissingMessage(def: NodeEvidenceDef, missing: string[]): string {
    const items = missing
      .map(item => this.evidenceMissingItemLabel(item))
      .filter((item): item is string => item.length > 0);
    if (!items.length) return def.missingMessage;
    return `Información incompleta: falta ${this.joinSpanish(items)} antes de decidir.`;
  }

  private evidenceMissingItemLabel(item: string): string {
    const [kind, key] = item.split(':', 2);
    if (!key) return '';
    if (kind === 'npc') return `hablar con ${this.evidenceNpcLabel(key)}`;
    if (kind === 'tool') return `tener o usar ${this.evidenceToolLabel(key)}`;
    if (kind === 'inspected') return `revisar ${this.evidenceObjectLabel(key)}`;
    return key;
  }

  private evidenceNpcLabel(key: string): string {
    const fromScenario = this.scenarioConfig()
      ?.rooms.flatMap(room => room.npcs)
      .find(npc => npc.key === key)?.displayName;
    if (fromScenario) return fromScenario;
    return this.evidenceObjectLabel(key);
  }

  private evidenceToolLabel(code: string): string {
    return this.world()?.tools.find(tool => tool.code === code)?.label ?? code;
  }

  private evidenceObjectLabel(key: string): string {
    return this.world()?.objects.find(obj => obj.key === key)?.label ?? key;
  }

  private joinSpanish(items: string[]): string {
    if (items.length <= 1) return items[0] ?? '';
    if (items.length === 2) return `${items[0]} y ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }

  /** Gate de evidencia (Fase 9): permite cancelar o decidir bajo registro. */
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

  private buildSupervisionDialogue(feedback: SimulationFeedback): DialogueState {
    const retryRequired = this.feedbackRequiresRetry(feedback);
    const lines: DialogueState['lines'] = [
      { order: 1, speakerName: 'Supervisión clínica', text: feedback.message, emotion: feedback.prohibitedConduct ? 'danger' : 'neutral' }
    ];
    if (feedback.prohibitionReason) {
      lines.push({ order: 2, speakerName: 'Supervisión clínica', text: feedback.prohibitionReason, emotion: 'danger' });
    }
    if (retryRequired) {
      lines.push({
        order: lines.length + 1,
        speakerName: '',
        text: 'No se avanzó el caso ni se aplicaron cambios acumulados. Revisa la escena y vuelve a responder.',
        emotion: 'concerned'
      });
    } else {
      lines.push({
        order: lines.length + 1,
        speakerName: '',
        text: `Puntaje ${feedback.scoreDelta >= 0 ? '+' : ''}${feedback.scoreDelta} · Estrés ${feedback.stressDelta >= 0 ? '+' : ''}${feedback.stressDelta}% · Confianza ${feedback.trustDelta >= 0 ? '+' : ''}${feedback.trustDelta} · Riesgo ${feedback.victimRiskDelta >= 0 ? '+' : ''}${feedback.victimRiskDelta}`,
        emotion: 'neutral'
      });
    }
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
      next: world => this.applyWorldWithScenario(world),
      error: () => {
        this.error.set('No pudimos cargar el mapa del caso.');
        this.loading.set(false);
        this.busy.set(false);
        this.fadeActive.set(false);
      }
    });
  }

  /** Carga el ScenarioConfig que corresponde al mapa del mundo y aplica ambos. */
  private applyWorldWithScenario(world: SimulationWorldState): void {
    this.scenarioConfig.set(null);
    this.simulationService.getScenarioConfig(world.map.key).subscribe({
      next: config => {
        this.scenarioConfig.set(config);
        this.applyLoadedWorld(world);
      },
      error: () => this.applyLoadedWorld(world),
    });
  }

  private applyLoadedWorld(world: SimulationWorldState): void {
    const previousMapKey = this.world()?.map.key ?? null;
    this.world.set(world);
    this.mergeViewedNpcKeysFromWorld(world);
    this.loading.set(false);
    this.busy.set(false);
    window.setTimeout(() => this.fadeActive.set(false), 80);
    if (previousMapKey && previousMapKey !== world.map.key) {
      this.announceRoomChange(world);
    }
    this.maybeShowInitialCaseIntro(world);
  }

  private maybeShowInitialCaseIntro(world: SimulationWorldState): void {
    const attempt = this.attempt();
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    if (attempt.currentNode.key !== 'hospital-urgencias' || world.map.key !== 'hospital-urgencias') return;
    const storageKey = this.caseIntroStorageKey(attempt);
    if (sessionStorage.getItem(storageKey) === 'read') return;
    if (this.auth.hasRole('ESTUDIANTE') && !this.reduceMotion()) {
      this.introVideoEnded.set(false);
      this.showIntroVideo.set(true);
      return;
    }
    this.revealCaseIntro();
  }

  playIntroVideo(): void {
    const video = this.introVideoRef?.nativeElement;
    if (!video || this.introVideoEnded()) return;
    void video.play().catch(() => undefined);
  }

  onIntroVideoEnded(): void {
    this.introVideoEnded.set(true);
  }

  continueFromIntroVideo(): void {
    this.introVideoRef?.nativeElement?.pause();
    this.showIntroVideo.set(false);
    this.introVideoEnded.set(false);
    this.revealCaseIntro();
  }

  private revealCaseIntro(): void {
    this.showCaseIntro.set(true);
    this.audioDirector.playIntroLament();
  }

  continueFromCaseIntro(): void {
    const attempt = this.attempt();
    if (attempt) sessionStorage.setItem(this.caseIntroStorageKey(attempt), 'read');
    this.showCaseIntro.set(false);
    this.audioDirector.stopIntroLament();
    this.audioDirector.setStressLevel(attempt?.stressIndex ?? 0);
    this.announce('Introducción completada. Inicia la intervención en urgencias.');
  }

  private caseIntroStorageKey(attempt: SimulationAttemptState): string {
    return `siep_case_intro_${attempt.caseVersionId}_${attempt.attemptId}`;
  }

  /** Al cambiar de sala (puerta o decisión): nombre de la sala 1-2 s y, si el
   *  mapa trae texto de transición autorado (salto temporal), overlay breve. */
  private announceRoomChange(world: SimulationWorldState): void {
    this.roomBanner.set(world.map.title);
    window.setTimeout(() => this.roomBanner.set(''), 2200);
    const transition = (world.map.ambient as Record<string, unknown> | undefined)?.['transitionText'];
    if (typeof transition === 'string' && transition && !this.seenTransitionMapKeys.has(world.map.key)) {
      this.seenTransitionMapKeys.add(world.map.key);
      this.transitionNote.set(transition);
      window.setTimeout(() => this.transitionNote.set(''), 4200);
    }
  }

  private announce(message: string): void {
    this.a11yAnnouncement.set('');
    window.setTimeout(() => this.a11yAnnouncement.set(message), 50);
  }

  private persistAttemptToken(attempt: SimulationAttemptState) {
    sessionStorage.setItem(`siep_attempt_${attempt.caseVersionId}`, JSON.stringify({
      attemptId: attempt.attemptId,
      attemptToken: attempt.attemptToken,
      viewedNpcKeys: Array.from(this.viewedNpcKeys()),
    }));
  }

  private feedbackRequiresRetry(feedback: Pick<SimulationFeedback, 'classification' | 'prohibitedConduct' | 'retryRequired'>): boolean {
    // El backend es la autoridad: solo concede reintento en la 1ª respuesta mala
    // (regla de 2 oportunidades). La 2ª respuesta riesgosa/inadecuada queda
    // registrada y llega con retryRequired=false (aunque la clasificación sea mala).
    if (typeof feedback.retryRequired === 'boolean') return feedback.retryRequired;
    // Fallback para respuestas legacy sin el flag.
    return feedback.prohibitedConduct || feedback.classification === 'INADEQUATE' || feedback.classification === 'RISKY';
  }

  private restoreViewedNpcKeys(attempt: SimulationAttemptState): ReadonlySet<string> {
    try {
      const raw = sessionStorage.getItem(`siep_attempt_${attempt.caseVersionId}`);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as { attemptId?: unknown; viewedNpcKeys?: unknown };
      if (parsed.attemptId !== attempt.attemptId || !Array.isArray(parsed.viewedNpcKeys)) {
        return new Set<string>();
      }
      return new Set(parsed.viewedNpcKeys.filter((key): key is string => typeof key === 'string' && key.length > 0));
    } catch {
      return new Set<string>();
    }
  }

  private mergeViewedNpcKeysFromWorld(world: SimulationWorldState): void {
    const fromDb = this.viewedNpcKeysFromWorld(world);
    if (!fromDb.length) return;
    this.viewedNpcKeys.update(prev => {
      const next = new Set(prev);
      fromDb.forEach(key => next.add(key));
      this.persistViewedNpcKeys(next);
      return next;
    });
  }

  private viewedNpcKeysFromWorld(world: SimulationWorldState): string[] {
    const raw = world.flags?.['viewedNpcKeys'];
    return Array.isArray(raw)
      ? raw.filter((key): key is string => typeof key === 'string' && key.length > 0)
      : [];
  }

  private persistViewedNpcKeys(keys: ReadonlySet<string> = this.viewedNpcKeys()): void {
    const attempt = this.attempt();
    if (!attempt) return;
    sessionStorage.setItem(`siep_attempt_${attempt.caseVersionId}`, JSON.stringify({
      attemptId: attempt.attemptId,
      attemptToken: attempt.attemptToken,
      viewedNpcKeys: Array.from(keys),
    }));
  }

  private persistPosition() {
    const game = this.attempt(), world = this.world();
    if (!game || !world || !this.lastPosition || game.status !== 'IN_PROGRESS') return;
    this.simulationService.updateWorldState(game.attemptId, game.attemptToken,
      this.lastPosition.x, this.lastPosition.y, world.map.key)
      .subscribe({
        // La posición se persiste en silencio: reemplazar `world` con el eco
        // del backend re-renderizaba toda la escena Phaser en plena caminata
        // (tirón visible). Solo se aplica si cambió algo de verdad (el mapa).
        next: updated => {
          const current = this.world();
          if (!current || updated.map.key !== current.map.key) this.world.set(updated);
        },
        error: () => undefined,
      });
  }
}
