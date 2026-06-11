import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
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
              <span>{{ game.currentNode.title }}</span>
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
    .hud-zone--right { flex-shrink: 0; gap: 14px; margin-left: auto; }

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

    .hud-stress { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
    .hud-stress--pulse { animation: stress-pulse .6s ease-out; }
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
    .patient-bar-row { display: flex; align-items: center; gap: 4px; }
    .bar-icon { width: 12px; font-size: .62rem; line-height: 1; color: rgba(232,240,244,.7); font-weight: 800; text-align: center; }
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
  readonly journalOpen = input(false);
  readonly toggleJournal = output<void>();

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
