import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PatientState, SimulationAttemptState } from '../../core/models/simulation.model';
import { getSceneObjective, getSceneProgress } from './scene-objectives.config';
import { getProximityStepHint } from './risky-interaction.config';
import { Heart, stressToHearts } from './stress-hearts.util';

type StressTier = 'calm' | 'moderate' | 'high' | 'critical';

@Component({
  selector: 'app-simulation-hud',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (attempt(); as game) {
      <div class="hud-shell liquid-glass"
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
          <!-- LEFT zone: case vitals -->
          <div class="hud-zone hud-zone--vitals">
            <div class="hud-score" aria-label="Seguimiento formativo: {{ game.accumulatedScore }} puntos">
              <mat-icon aria-hidden="true">fact_check</mat-icon>
              <strong>{{ game.accumulatedScore }}</strong>
            </div>

            <!-- Hidden progressbar for session progress (screen readers) -->
            <div class="sr-only"
              role="progressbar"
              [attr.aria-valuenow]="game.stressIndex"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Progreso de la sesión: puntaje {{ game.accumulatedScore }}">
            </div>

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
  `,
  styles: [`
    .hud-shell {
      display: flex;
      flex-direction: column;
      border-radius: 0 0 16px 16px;
      background: rgba(8,12,18,.84);
      backdrop-filter: blur(18px) saturate(120%);
      border: 1px solid rgba(182,156,255,.2);
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
    .hud-score mat-icon { color: #B69CFF; font-size: 18px; width: 18px; height: 18px; }
    .hud-score strong { font-family: 'JetBrains Mono', monospace; font-size: .9rem; letter-spacing: .04em; }

    .hud-stress { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
    .hud-stress--pulse { animation: stress-pulse .6s ease-out; }
    .hud-brand { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-right: 8px; margin-right: 4px; border-right: 1px solid rgba(182,156,255,.18); }
    .brand-glyph { color: #B69CFF; flex-shrink: 0; }
    .brand-word { font-family: 'Poppins', system-ui, sans-serif; font-weight: 900; font-size: .82rem; letter-spacing: .12em; color: #E7DDFF; }
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

    .hud-status { display: flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: .7rem; color: rgba(232,240,244,.4); white-space: nowrap; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.25); }
    .hud-status--live .status-dot { background: #B69CFF; animation: dot-blink 2s ease-in-out infinite; }

    .hud-objective-line {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 5px 14px 7px;
      border-top: 1px solid rgba(182,156,255,.16);
      background: rgba(124,77,255,.08);
    }
    .hud-objective-line mat-icon { color: #B69CFF; font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
    .hud-objective-line span { font-size: .74rem; line-height: 1.3; color: rgba(232,240,244,.82); }
    .hud-objective-line strong { color: #cdbcff; font-weight: 800; margin-right: 4px; }

    .sr-only {
      position: absolute !important;
      width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
    @keyframes stress-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(212,160,80,.4); }
      70%  { box-shadow: 0 0 0 6px rgba(212,160,80,0); }
      100% { box-shadow: none; }
    }
    @keyframes dot-blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

    @media (max-width: 640px) {
      .hud-scene { display: none; }
      .hud-zone--vitals { gap: 10px; }
      .brand-word { display: none; }
      .hud-patient { display: none; }
      .hud-objective-line span { font-size: .7rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hud-stress--pulse { animation: none; }
      .stress-track span { transition: none; }
      .status-dot { animation: none !important; }
    }
  `]
})
export class SimulationHudComponent {
  readonly attempt = input<SimulationAttemptState | null>(null);
  readonly stressPulse = input(false);
  readonly nearbyInteractionKey = input<string | null>(null);
  readonly patientState = input<PatientState | null>(null);

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

  readonly sceneObjective = computed(() => {
    const nodeKey = this.attempt()?.currentNode.key;
    return getSceneObjective(nodeKey);
  });

  readonly sceneProgress = computed(() => {
    const proximityLabel = getProximityStepHint(this.nearbyInteractionKey());
    if (proximityLabel) {
      return { stepLabel: proximityLabel, step: 0, total: 6 };
    }
    const nodeKey = this.attempt()?.currentNode.key;
    return getSceneProgress(nodeKey);
  });

  statusLabel(status: SimulationAttemptState['status']) {
    return { IN_PROGRESS: 'En seguimiento', COMPLETED: 'Finalizado', SAFE_EXITED: 'Salida segura' }[status];
  }

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
