import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PatientState, SimulationAttemptState } from '../../core/models/simulation.model';
import { getSceneProgress } from './scene-objectives.config';
import { getProximityStepHint } from './risky-interaction.config';
import { Heart, stressToHearts } from './stress-hearts.util';

type StressTier = 'calm' | 'moderate' | 'high' | 'critical';

@Component({
  selector: 'app-simulation-hud',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    @if (attempt(); as game) {
      <div class="hud-shell"
        role="complementary"
        aria-label="Indicadores del simulador"
        [class.hud--stress-high]="stressTier() === 'high'"
        [class.hud--stress-critical]="stressTier() === 'critical'">

        <div class="hud-strip">
          <div class="hud-brand" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="brand-glyph" width="20" height="20">
              <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-1.8 5.4A3 3 0 0 0 6 17a3 3 0 0 0 3 3V3z" fill="currentColor" opacity=".85"/>
              <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 1.8 5.4A3 3 0 0 1 18 17a3 3 0 0 1-3 3V3z" fill="currentColor" opacity=".55"/>
              <circle cx="9" cy="9" r="1.1" fill="#0e1322"/>
              <circle cx="12" cy="13" r="1.1" fill="#0e1322"/>
              <circle cx="15" cy="9" r="1.1" fill="#0e1322"/>
            </svg>
            <span class="brand-word">SIEP</span>
          </div>

          <!-- Case + stage -->
          <div class="hud-zone hud-zone--case">
            <span class="hud-case" [title]="game.caseTitle">{{ game.caseTitle }}</span>
            <span class="hud-stage-chip">{{ stageLabel() }}</span>
          </div>

          <!-- CENTER: location + step -->
          <div class="hud-zone hud-zone--center">
            <div class="hud-scene">
              <mat-icon aria-hidden="true">location_on</mat-icon>
              <span>{{ locationLabel() || game.currentNode.title }}</span>
            </div>
            @if (sceneProgress(); as progress) {
              <div class="hud-step" aria-label="{{ progress.stepLabel }}">
                <mat-icon aria-hidden="true">timeline</mat-icon>
                <span>{{ progress.stepLabel }}@if (progress.step > 0) { ({{ progress.step }}/{{ progress.total }}) }</span>
              </div>
            }
          </div>

          <!-- RIGHT: vitals + actions -->
          <div class="hud-zone hud-zone--right">
            <div class="hud-stress"
              [class.hud-stress--pulse]="stressPulse()"
              role="meter"
              [attr.aria-valuenow]="game.stressIndex" aria-valuemin="0" aria-valuemax="100"
              [attr.aria-label]="'Estado de estrés del caso: ' + game.stressIndex + '%. ' + stressLabel()">
              <span class="hud-metric-label">Estrés</span>
              <div class="hud-hearts-wrap" title="Estrés del caso: los corazones muestran la calma restante">
                <div class="hud-hearts" aria-hidden="true" [style.color]="stressColor()">
                  @for (h of hearts(); track $index) {
                    <span class="heart" [class.heart--half]="h === 'half'" [class.heart--full]="h === 'full'">
                      <svg viewBox="0 0 24 24" class="heart-svg">
                        <path class="heart-outline" d="M12 20.3l-1.5-1.35C5.2 14.2 2 11.3 2 7.7 2 5 4.1 3 6.8 3c1.6 0 3.1.7 4 1.9C11.7 3.7 13.2 3 14.8 3 17.5 3 19.6 5 19.6 7.7c0 3.6-3.2 6.5-8.5 11.25L12 20.3z"/>
                        <path class="heart-fill" d="M12 20.3l-1.5-1.35C5.2 14.2 2 11.3 2 7.7 2 5 4.1 3 6.8 3c1.6 0 3.1.7 4 1.9C11.7 3.7 13.2 3 14.8 3 17.5 3 19.6 5 19.6 7.7c0 3.6-3.2 6.5-8.5 11.25L12 20.3z"/>
                      </svg>
                    </span>
                  }
                </div>
                <span class="stress-pct" [style.color]="stressColor()" aria-hidden="true">{{ game.stressIndex }}%</span>
              </div>
            </div>

            @if (patientState(); as ps) {
              <div class="hud-patient" aria-label="Estado de la paciente">
                <div class="patient-bars">
                  <div class="patient-bar-row">
                    <span class="bar-label">Confianza</span>
                    <div class="mini-track" role="meter" [attr.aria-valuenow]="ps.trustLevel" aria-valuemin="0" aria-valuemax="100" aria-label="Confianza de la paciente">
                      <span [style.width.%]="ps.trustLevel" [style.background]="trustColor(ps.trustLevel)"></span>
                    </div>
                    <span class="bar-value">{{ ps.trustLevel }}%</span>
                  </div>
                  <div class="patient-bar-row">
                    <span class="bar-label">Bienestar</span>
                    <div class="mini-track" role="meter" [attr.aria-valuenow]="ps.emotionalState" aria-valuemin="0" aria-valuemax="100" aria-label="Bienestar emocional de la paciente">
                      <span [style.width.%]="ps.emotionalState" [style.background]="emotionColor(ps.emotionalState)"></span>
                    </div>
                    <span class="bar-value">{{ ps.emotionalState }}%</span>
                  </div>
                </div>
              </div>
            }

            <div class="hud-score" [attr.aria-label]="'Seguimiento formativo: ' + game.accumulatedScore + ' puntos'"
              [title]="progressLabel()">
              <mat-icon aria-hidden="true">fact_check</mat-icon>
              <strong>{{ game.accumulatedScore }}</strong>
            </div>

            <div class="hud-actions">
              <button type="button" class="hud-action" [class.hud-action--active]="journalOpen()"
                (click)="toggleJournal.emit()"
                aria-label="Abrir bitácora reflexiva (J)" title="Bitácora (J)">
                <mat-icon aria-hidden="true">menu_book</mat-icon>
              </button>
              <button type="button" class="hud-action" [class.hud-action--active]="settingsOpen()"
                (click)="settingsOpen.set(!settingsOpen())"
                aria-label="Abrir ajustes del juego" title="Ajustes">
                <mat-icon aria-hidden="true">settings</mat-icon>
              </button>
              @if (settingsOpen()) {
                <div class="settings-menu" role="menu" aria-label="Ajustes del juego">
                  <div class="settings-menu__header">
                    <strong>Ajustes</strong>
                    <button type="button" aria-label="Cerrar ajustes" (click)="settingsOpen.set(false)">
                      <mat-icon aria-hidden="true">close</mat-icon>
                    </button>
                  </div>
                  <button type="button" role="menuitemcheckbox" [attr.aria-checked]="!musicMuted()" (click)="toggleMusic.emit()">
                    <mat-icon aria-hidden="true">{{ musicMuted() ? 'music_off' : 'music_note' }}</mat-icon>
                    <span>Música ambiental</span>
                    <strong>{{ musicMuted() ? 'Off' : 'On' }}</strong>
                  </button>
                  <button type="button" role="menuitemcheckbox" [attr.aria-checked]="!sfxMuted()" (click)="toggleSfx.emit()">
                    <mat-icon aria-hidden="true">{{ sfxMuted() ? 'volume_off' : 'graphic_eq' }}</mat-icon>
                    <span>Sonidos de acciones</span>
                    <strong>{{ sfxMuted() ? 'Off' : 'On' }}</strong>
                  </button>
                  <button type="button" role="menuitemcheckbox" [attr.aria-checked]="reduceMotion()" (click)="toggleReduceMotion.emit()">
                    <mat-icon aria-hidden="true">motion_photos_pause</mat-icon>
                    <span>Movimiento reducido</span>
                    <strong>{{ reduceMotion() ? 'On' : 'Off' }}</strong>
                  </button>
                  <button type="button" role="menuitem" (click)="toggleJournal.emit(); settingsOpen.set(false)">
                    <mat-icon aria-hidden="true">menu_book</mat-icon>
                    <span>Bitácora</span>
                    <strong>J</strong>
                  </button>
                  <a role="menuitem" routerLink="/portal/simulador">
                    <mat-icon aria-hidden="true">apps</mat-icon>
                    <span>Catálogo</span>
                    <strong></strong>
                  </a>
                </div>
              }
              <a class="hud-action" routerLink="/portal/simulador"
                aria-label="Volver al catálogo de simulaciones" title="Volver al catálogo">
                <mat-icon aria-hidden="true">logout</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .hud-shell {
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, rgba(22,18,42,.9), rgba(8,12,18,.84));
      backdrop-filter: blur(18px) saturate(120%);
      border-bottom: 1px solid rgba(182,156,255,.2);
      box-shadow: inset 0 -1px 0 rgba(8,12,18,.9);
      color: rgba(232,240,244,.9);
      transition: border-color var(--psy-motion-ui);
    }
    .hud--stress-high  { border-color: rgba(212,160,80,.4); }
    .hud--stress-critical { border-color: rgba(168,80,98,.5); }

    .hud-strip {
      display: flex;
      align-items: center;
      gap: 14px;
      height: 48px;
      padding: 0 14px;
    }
    .hud-zone { display: flex; align-items: center; }
    .hud-zone--case { gap: 10px; min-width: 0; flex-shrink: 1; }
    .hud-zone--center { flex: 1; min-width: 0; gap: 10px; justify-content: center; }
    .hud-zone--right { flex-shrink: 0; gap: 12px; margin-left: auto; }

    .hud-brand { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-right: 10px; border-right: 1px solid rgba(182,156,255,.18); }
    .brand-glyph { color: #B69CFF; flex-shrink: 0; }
    .brand-word { font-family: 'Poppins', system-ui, sans-serif; font-weight: 900; font-size: .82rem; letter-spacing: .12em; color: #E7DDFF; }

    .hud-case {
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 800;
      font-size: .84rem;
      color: rgba(244,247,251,.92);
    }
    .hud-stage-chip {
      flex-shrink: 0;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid rgba(182,156,255,.3);
      background: rgba(124,77,255,.14);
      font-size: .66rem;
      font-weight: 800;
      color: #cdbcff;
      white-space: nowrap;
    }

    .hud-score { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .hud-score mat-icon { color: #B69CFF; font-size: 18px; width: 18px; height: 18px; }
    .hud-score strong { font-family: 'JetBrains Mono', monospace; font-size: .9rem; letter-spacing: .04em; }

    .hud-stress { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }
    .hud-stress--pulse { animation: stress-pulse .6s ease-out; }
    .hud-metric-label,
    .bar-label {
      color: rgba(232,240,244,.68);
      font-size: .62rem;
      font-weight: 900;
      letter-spacing: .04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .hud-hearts-wrap { display: flex; align-items: center; gap: 6px; }
    .hud-hearts { display: inline-flex; align-items: center; gap: 2px; }
    .heart { display: inline-block; width: 15px; height: 15px; line-height: 0; }
    .heart-svg { width: 15px; height: 15px; display: block; }
    .heart-outline { fill: none; stroke: currentColor; stroke-width: 1.7; opacity: .6; }
    .heart-fill { fill: currentColor; clip-path: inset(0 100% 0 0); }
    .heart--half .heart-fill { clip-path: inset(0 50% 0 0); }
    .heart--full .heart-fill { clip-path: inset(0 0 0 0); }
    .heart--full .heart-outline { opacity: 1; }
    .stress-pct { font-family: 'JetBrains Mono', monospace; font-size: .78rem; min-width: 38px; transition: color var(--psy-motion-ui); }

    .hud-patient { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .patient-bars { display: flex; flex-direction: column; gap: 3px; }
    .patient-bar-row { display: grid; grid-template-columns: 68px 56px 34px; align-items: center; gap: 5px; }
    .bar-label { font-size: .58rem; text-transform: none; letter-spacing: 0; }
    .bar-value { color: rgba(232,240,244,.58); font-family: 'JetBrains Mono', monospace; font-size: .62rem; text-align: right; }
    .mini-track { width: 56px; height: 5px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; }
    .mini-track span { display: block; height: 100%; border-radius: inherit; transition: width .5s ease, background .5s ease; }

    .hud-scene { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; }
    .hud-scene mat-icon { color: #B69CFF; font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; }
    .hud-scene span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8rem; color: rgba(232,240,244,.7); }

    .hud-step {
      display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      padding: 4px 8px; border-radius: 8px;
      background: rgba(79,122,172,.1); border: 1px solid rgba(79,122,172,.2);
    }
    .hud-step mat-icon { color: rgba(157,192,232,.85); font-size: 14px; width: 14px; height: 14px; }
    .hud-step span { font-size: .68rem; font-weight: 700; color: rgba(157,192,232,.85); white-space: nowrap; }

    .hud-actions {
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      padding-left: 12px;
      border-left: 1px solid rgba(182,156,255,.16);
    }
    .hud-action {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid rgba(182,156,255,.28);
      border-radius: 9px;
      background: rgba(8,12,18,.5);
      color: rgba(182,156,255,.65);
      cursor: pointer;
      text-decoration: none;
      transition: border-color 160ms, color 160ms, background 160ms;
    }
    .hud-action:hover { border-color: rgba(182,156,255,.6); color: #B69CFF; background: rgba(124,77,255,.1); }
    .hud-action:focus-visible {
      outline: 2px solid rgba(182,156,255,.7);
      outline-offset: 2px;
    }
    .hud-action:active { transform: translateY(1px); }
    .hud-action--active { border-color: rgba(182,156,255,.8); color: #B69CFF; background: rgba(124,77,255,.18); }
    .hud-action mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .settings-menu {
      position: absolute;
      top: calc(100% + 9px);
      right: 0;
      z-index: 80;
      width: min(280px, calc(100vw - 24px));
      display: grid;
      gap: 6px;
      padding: 10px;
      border: 1px solid rgba(182,156,255,.32);
      border-radius: 12px;
      background: rgba(13,18,30,.96);
      box-shadow: 0 18px 50px -28px rgba(124,77,255,.8);
      backdrop-filter: blur(18px) saturate(130%);
    }
    .settings-menu__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 2px 6px;
      border-bottom: 1px solid rgba(182,156,255,.16);
      color: #e7ddff;
      font-size: .78rem;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .settings-menu__header button,
    .settings-menu button,
    .settings-menu a {
      color: inherit;
      font: inherit;
    }
    .settings-menu__header button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: rgba(232,240,244,.7);
      cursor: pointer;
    }
    .settings-menu__header button:hover { background: rgba(255,255,255,.08); color: #fff; }
    .settings-menu > button,
    .settings-menu > a {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) 34px;
      align-items: center;
      gap: 9px;
      min-height: 38px;
      padding: 7px 8px;
      border: 1px solid rgba(182,156,255,.14);
      border-radius: 9px;
      background: rgba(255,255,255,.045);
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .settings-menu > button:hover,
    .settings-menu > a:hover {
      border-color: rgba(182,156,255,.38);
      background: rgba(124,77,255,.12);
    }
    .settings-menu mat-icon { color: #B69CFF; font-size: 18px; width: 18px; height: 18px; }
    .settings-menu span {
      min-width: 0;
      color: rgba(232,240,244,.84);
      font-size: .78rem;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .settings-menu button strong,
    .settings-menu a strong {
      color: rgba(232,240,244,.55);
      font-family: 'JetBrains Mono', monospace;
      font-size: .68rem;
      text-align: right;
    }

    @keyframes stress-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(212,160,80,.4); }
      70%  { box-shadow: 0 0 0 6px rgba(212,160,80,0); }
      100% { box-shadow: none; }
    }

    @media (max-width: 960px) {
      .hud-zone--center { display: none; }
    }
    @media (max-width: 640px) {
      .hud-strip { gap: 8px; padding: 0 10px; }
      .hud-zone--case { display: none; }
      .brand-word { display: none; }
      .hud-patient { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hud-stress--pulse { animation: none; }
      .hud-action:active { transform: none; }
    }
  `]
})
export class SimulationHudComponent {
  readonly attempt = input<SimulationAttemptState | null>(null);
  readonly stressPulse = input(false);
  readonly nearbyInteractionKey = input<string | null>(null);
  readonly patientState = input<PatientState | null>(null);
  readonly stageLabel = input('Escenario actual');
  readonly progressLabel = input('');
  /** Sala física actual (world.map.title); con puertas puede diferir del nodo DAG. */
  readonly locationLabel = input('');
  readonly journalOpen = input(false);
  readonly musicMuted = input(false);
  readonly sfxMuted = input(false);
  readonly reduceMotion = input(false);
  readonly settingsOpen = signal(false);
  readonly toggleJournal = output<void>();
  readonly toggleMusic = output<void>();
  readonly toggleSfx = output<void>();
  readonly toggleReduceMotion = output<void>();

  readonly stressTier = computed<StressTier>(() => {
    const s = this.attempt()?.stressIndex ?? 0;
    if (s >= 75) return 'critical';
    if (s >= 50) return 'high';
    if (s >= 25) return 'moderate';
    return 'calm';
  });

  readonly hearts = computed<Heart[]>(() => stressToHearts(this.attempt()?.stressIndex ?? 0));

  readonly stressColor = computed(() => ({
    calm:     '#6EC67A',
    moderate: '#F5B84B',
    high:     '#F08C4B',
    critical: '#E25A4F'
  })[this.stressTier()]);

  readonly stressLabel = computed(() => ({
    calm:     'Situación estable',
    moderate: 'Tensión moderada',
    high:     'Estrés elevado — considere herramientas de contención',
    critical: 'Nivel crítico — priorice seguridad y autocuidado'
  })[this.stressTier()]);

  readonly sceneProgress = computed(() => {
    const proximityLabel = getProximityStepHint(this.nearbyInteractionKey());
    if (proximityLabel) {
      return { stepLabel: proximityLabel, step: 0, total: 6 };
    }
    const nodeKey = this.attempt()?.currentNode.key;
    return getSceneProgress(nodeKey);
  });

  trustColor(v: number): string {
    if (v >= 60) return '#4fa3a5';
    if (v >= 30) return '#c4c84a';
    return '#e06070';
  }

  emotionColor(v: number): string {
    if (v >= 60) return '#4fa3a5';
    if (v >= 30) return '#d4943a';
    return '#e06070';
  }
}
