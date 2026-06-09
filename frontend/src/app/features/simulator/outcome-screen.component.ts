import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { OutcomeTier, SimulationOutcome } from '../../core/models/simulation.model';

@Component({
  selector: 'app-outcome-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (outcome(); as o) {
      <div class="outcome-overlay" role="dialog" aria-modal="true" aria-labelledby="outcome-title">
        <div class="outcome-card">

          <div class="outcome-header" [class]="'tier--' + o.tier">
            <span class="tier-icon" aria-hidden="true">{{ tierIcon(o.tier) }}</span>
            <h2 id="outcome-title" class="tier-title">{{ tierLabel(o.tier) }}</h2>
            <p class="tier-sub">Resultado de tu intervención</p>
          </div>

          <div class="outcome-body">
            <p class="feedback-narrative">{{ o.feedbackNarrative }}</p>

            <div class="patient-final">
              <h3>Estado final de la paciente</h3>
              <div class="state-bars">
                <div class="bar-row">
                  <span>Bienestar emocional</span>
                  <div class="bar-track">
                    <div class="bar-fill"
                      [style.width.%]="o.patientFinalState.emotionalState"
                      [style.background]="barColor(o.patientFinalState.emotionalState)"></div>
                  </div>
                  <span class="bar-pct">{{ o.patientFinalState.emotionalState }}%</span>
                </div>
                <div class="bar-row">
                  <span>Confianza en el proceso</span>
                  <div class="bar-track">
                    <div class="bar-fill"
                      [style.width.%]="o.patientFinalState.trustLevel"
                      [style.background]="barColor(o.patientFinalState.trustLevel)"></div>
                  </div>
                  <span class="bar-pct">{{ o.patientFinalState.trustLevel }}%</span>
                </div>
                <div class="bar-row">
                  <span>Apertura al diálogo</span>
                  <div class="bar-track">
                    <div class="bar-fill"
                      [style.width.%]="o.patientFinalState.openness"
                      [style.background]="barColor(o.patientFinalState.openness)"></div>
                  </div>
                  <span class="bar-pct">{{ o.patientFinalState.openness }}%</span>
                </div>
                <div class="bar-row">
                  <span>Nivel de crisis</span>
                  <div class="bar-track">
                    <!-- Invert: low crisis = good (show as high bar) -->
                    <div class="bar-fill"
                      [style.width.%]="100 - o.patientFinalState.crisisLevel"
                      [style.background]="barColor(100 - o.patientFinalState.crisisLevel)"></div>
                  </div>
                  <span class="bar-pct">{{ o.patientFinalState.crisisLevel }}%</span>
                </div>
              </div>
            </div>

            <div class="score-row">
              <span class="score-label">Puntaje profesional obtenido</span>
              <span class="score-value">{{ o.scoreTotal }} pts</span>
            </div>
          </div>

          <div class="outcome-actions">
            <button type="button" class="btn-retry" (click)="retry.emit()">
              Intentar de nuevo
            </button>
            <button type="button" class="btn-exit" (click)="exit.emit()">
              Salir al menú
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .outcome-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.85);
      display: grid;
      place-items: center;
      z-index: 200;
      animation: fade-in 300ms ease both;
    }
    .outcome-card {
      background: rgba(8,14,22,.97);
      border: 1px solid rgba(79,163,165,.25);
      border-radius: 20px;
      width: min(580px, 94vw);
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .outcome-header {
      padding: 32px 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      border-radius: 20px 20px 0 0;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .tier--excelente          { background: rgba(79,163,100,.15); }
    .tier--adecuado           { background: rgba(79,163,165,.12); }
    .tier--riesgo             { background: rgba(212,160,80,.12); }
    .tier--crisis_no_manejada { background: rgba(168,80,98,.15); }

    .tier-icon { font-size: 2.8rem; line-height: 1; }
    .tier-title { margin: 0; font-size: 1.4rem; font-weight: 700; color: rgba(232,240,244,.95); }
    .tier-sub {
      margin: 0;
      font-size: .8rem;
      color: rgba(232,240,244,.5);
      text-transform: uppercase;
      letter-spacing: .1em;
    }

    .outcome-body {
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .feedback-narrative {
      margin: 0;
      font-size: .97rem;
      line-height: 1.65;
      color: rgba(232,240,244,.85);
    }
    .patient-final h3 {
      margin: 0 0 14px;
      font-size: .78rem;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: rgba(232,240,244,.5);
    }
    .state-bars { display: flex; flex-direction: column; gap: 10px; }
    .bar-row {
      display: grid;
      grid-template-columns: 1fr 120px 40px;
      align-items: center;
      gap: 10px;
      font-size: .84rem;
      color: rgba(232,240,244,.8);
    }
    .bar-track {
      height: 8px;
      background: rgba(255,255,255,.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill { height: 100%; border-radius: inherit; transition: width .8s ease; }
    .bar-pct {
      font-family: 'JetBrains Mono', monospace;
      font-size: .78rem;
      color: rgba(232,240,244,.6);
      text-align: right;
    }

    .score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: rgba(255,255,255,.04);
      border-radius: 12px;
    }
    .score-label { font-size: .84rem; color: rgba(232,240,244,.65); }
    .score-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.2rem;
      font-weight: 700;
      color: #f4c875;
    }

    .outcome-actions {
      padding: 20px 32px 28px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .btn-retry, .btn-exit {
      padding: 10px 24px;
      border-radius: 999px;
      border: 1px solid;
      font: inherit;
      font-size: .9rem;
      cursor: pointer;
      transition: background 140ms ease;
    }
    .btn-retry {
      border-color: rgba(79,163,165,.5);
      background: rgba(79,163,165,.1);
      color: rgba(79,163,165,.95);
    }
    .btn-retry:hover { background: rgba(79,163,165,.2); }
    .btn-retry:focus-visible {
      outline: 2px solid #C9B3FF;
      outline-offset: 3px;
    }
    .btn-exit {
      border-color: rgba(232,240,244,.2);
      background: transparent;
      color: rgba(232,240,244,.7);
    }
    .btn-exit:hover { background: rgba(255,255,255,.05); }
    .btn-exit:focus-visible {
      outline: 2px solid #C9B3FF;
      outline-offset: 3px;
    }

    @keyframes fade-in {
      from { opacity: 0; transform: scale(.96); }
      to   { opacity: 1; transform: scale(1); }
    }
  `]
})
export class OutcomeScreenComponent {
  readonly outcome = input<SimulationOutcome | null>(null);
  readonly retry   = output<void>();
  readonly exit    = output<void>();

  tierIcon(tier: OutcomeTier): string {
    return { excelente: '🌟', adecuado: '✅', riesgo: '⚠️', crisis_no_manejada: '🚨' }[tier];
  }

  tierLabel(tier: OutcomeTier): string {
    return {
      excelente:          'Intervención Excelente',
      adecuado:           'Intervención Adecuada',
      riesgo:             'Intervención con Riesgos',
      crisis_no_manejada: 'Crisis No Manejada',
    }[tier];
  }

  barColor(value: number): string {
    if (value >= 60) return '#4fa3a5';
    if (value >= 35) return '#d4943a';
    return '#e06070';
  }
}
