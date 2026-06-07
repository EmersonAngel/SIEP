import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttemptCompletionReport, SimulationAttemptState } from '../../core/models/simulation.model';
import { AvatarFigureComponent } from '../character/avatar-figure.component';
import { AvatarStore } from '../character/avatar.store';
import { decisionTotal, performanceLabel } from './outcome.util';

/**
 * Pantalla de fin de partida (liquid-glass) extraída de SimulationPlayComponent.
 *
 * Presentacional: recibe el `report` y el `status` del intento y emite `retry`
 * cuando el estudiante decide reintentar el caso. El avatar se toma del
 * AvatarStore global para el retrato del encabezado.
 */
@Component({
  selector: 'app-attempt-outcome',
  standalone: true,
  imports: [RouterLink, AvatarFigureComponent],
  template: `
    @if (status() !== 'IN_PROGRESS') {
      <section class="outcome liquid-glass"
        [class.outcome--safe]="status() === 'SAFE_EXITED'" role="alertdialog"
        aria-labelledby="outcome-title">
        <header class="oc-head">
          <div class="oc-avatar" aria-hidden="true">
            <app-avatar-figure [config]="avatar()" [portrait]="true" />
          </div>
          <div class="oc-head__copy">
            <p class="oc-eyebrow">{{ status() === 'COMPLETED' ? '¡Simulación completada!' : 'Salida segura registrada' }}</p>
            <h3 id="outcome-title">{{ report()?.summaryMessage ?? (status() === 'COMPLETED'
              ? 'El intento quedó cerrado para evaluación docente.'
              : 'El intento fue pausado de forma limpia, sin penalización.') }}</h3>
          </div>
        </header>

        @if (report(); as r) {
          <div class="oc-metrics">
            <div class="oc-metric"><span>Puntaje total</span><strong>{{ r.finalScore }}</strong></div>
            <div class="oc-metric"><span>Escenarios</span><strong>{{ r.visitedNodeTitles.length }}</strong></div>
            <div class="oc-metric"><span>Estrés final</span><strong>{{ r.finalStress }}%</strong></div>
            <div class="oc-metric"><span>Tiempo</span><strong>{{ formatDuration(r.totalDurationSeconds) }}</strong></div>
            <div class="oc-metric oc-metric--hi"><span>Desempeño</span><strong>{{ perf(r) }}</strong></div>
          </div>

          <div class="oc-block">
            <p class="oc-label">Decisiones clave</p>
            <div class="oc-bars">
              <div class="oc-bar"><span class="oc-bar__k">Adecuadas</span><div class="oc-bar__t"><i class="oc-bar__f oc-bar__f--ok" [style.width.%]="barPct(r, r.adequateDecisions)"></i></div><span class="oc-bar__n">{{ r.adequateDecisions }}</span></div>
              <div class="oc-bar"><span class="oc-bar__k">Riesgosas</span><div class="oc-bar__t"><i class="oc-bar__f oc-bar__f--warn" [style.width.%]="barPct(r, r.riskyDecisions)"></i></div><span class="oc-bar__n">{{ r.riskyDecisions }}</span></div>
              <div class="oc-bar"><span class="oc-bar__k">Inadecuadas</span><div class="oc-bar__t"><i class="oc-bar__f oc-bar__f--bad" [style.width.%]="barPct(r, r.inadequateDecisions)"></i></div><span class="oc-bar__n">{{ r.inadequateDecisions }}</span></div>
            </div>
            <div class="oc-chips">
              <span class="oc-chip">Herramientas: {{ r.toolsUsed }}</span>
              <span class="oc-chip">Reflexiones: {{ r.reflectionsCount }}</span>
              @if (r.safeExitUsed) { <span class="oc-chip">Salida segura</span> }
              @if (r.prohibitedDecisions) { <span class="oc-chip oc-chip--alert">Alertas éticas: {{ r.prohibitedDecisions }}</span> }
            </div>
          </div>

          @if (r.competencies.length) {
            <div class="oc-block">
              <p class="oc-label">Competencias trabajadas</p>
              <div class="oc-tags">
                @for (c of r.competencies; track c) { <span class="oc-tag">{{ c }}</span> }
              </div>
            </div>
          }

          @if (r.recommendations.length) {
            <div class="oc-block oc-feedback">
              <p class="oc-label">Retroalimentación del sistema</p>
              @for (rec of r.recommendations; track rec) { <p class="oc-rec">{{ rec }}</p> }
            </div>
          }
        }

        <footer class="oc-actions">
          <button type="button" class="oc-btn oc-btn--go" (click)="retry.emit()">Reintentar caso</button>
          <a class="oc-btn oc-btn--line" routerLink="/portal/simulador">Volver al simulador</a>
          <a class="oc-btn oc-btn--line" routerLink="/portal/dashboard">Volver al portal</a>
        </footer>
      </section>
    }
  `,
  styles: [`
    .outcome {
      position: absolute; inset: 0; z-index: 150; display: flex; flex-direction: column;
      gap: 16px; align-items: stretch; justify-content: flex-start;
      padding: clamp(20px, 4vh, 44px) clamp(20px, 6vw, 80px); overflow-y: auto;
      background: linear-gradient(180deg, rgba(17,24,39,.96), rgba(14,19,34,.97)); color: var(--sim-ink, #F4F7FB);
    }
    .oc-head { display: flex; align-items: center; gap: 16px; }
    .oc-avatar {
      width: 64px; height: 64px; flex: 0 0 auto; border-radius: 50%; overflow: hidden;
      background: rgba(124,77,255,.14); border: 1px solid rgba(182,156,255,.4);
      display: grid; place-items: center;
    }
    .oc-avatar app-avatar-figure { width: 64px; height: 64px; }
    .oc-eyebrow { margin: 0; color: var(--sim-lavender, #B69CFF); font-size: .8rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    .outcome--safe .oc-eyebrow { color: rgba(244,247,251,.7); }
    .oc-head__copy h3 { margin: 4px 0 0; font-family: 'Poppins', system-ui, sans-serif; font-size: clamp(1.1rem, 2vw, 1.5rem); color: var(--sim-ink, #F4F7FB); }
    .oc-metrics { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; }
    .oc-metric {
      display: grid; gap: 4px; padding: 12px; border-radius: 14px;
      background: var(--sim-surface, rgba(27,33,51,.72)); border: 1px solid var(--sim-border, rgba(182,156,255,.22));
    }
    .oc-metric span { font-size: .68rem; color: var(--sim-ink-mute, rgba(244,247,251,.5)); text-transform: uppercase; letter-spacing: .05em; }
    .oc-metric strong { font-size: 1.3rem; color: var(--sim-ink, #F4F7FB); font-weight: 800; }
    .oc-metric--hi strong { color: var(--sim-lavender, #B69CFF); }
    .oc-block {
      padding: 14px 16px; border-radius: 16px;
      background: var(--sim-surface, rgba(27,33,51,.72)); border: 1px solid var(--sim-border, rgba(182,156,255,.22));
    }
    .oc-label { margin: 0 0 10px; color: var(--sim-lavender, #B69CFF); font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .oc-bars { display: grid; gap: 8px; }
    .oc-bar { display: grid; grid-template-columns: 92px 1fr 28px; align-items: center; gap: 10px; }
    .oc-bar__k { font-size: .8rem; color: var(--sim-ink-soft, rgba(244,247,251,.74)); }
    .oc-bar__t { height: 9px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
    .oc-bar__f { display: block; height: 100%; border-radius: inherit; min-width: 3px; }
    .oc-bar__f--ok   { background: #6EC67A; }
    .oc-bar__f--warn { background: #F5B84B; }
    .oc-bar__f--bad  { background: #E25A4F; }
    .oc-bar__n { text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: var(--sim-ink, #F4F7FB); }
    .oc-chips, .oc-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
    .oc-chip, .oc-tag {
      padding: 5px 11px; border-radius: 999px; font-size: .76rem; font-weight: 700;
      background: rgba(124,77,255,.16); border: 1px solid rgba(124,77,255,.4); color: #d6c6ff;
    }
    .oc-chip { background: var(--sim-surface-2, rgba(18,24,42,.6)); border-color: var(--sim-border, rgba(182,156,255,.22)); color: var(--sim-ink-soft, rgba(244,247,251,.74)); }
    .oc-chip--alert { background: rgba(226,90,79,.16); border-color: rgba(226,90,79,.45); color: #f1a79f; }
    .oc-rec { margin: 0 0 6px; color: var(--sim-ink-soft, rgba(244,247,251,.74)); font-size: .86rem; line-height: 1.55; }
    .oc-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: auto; padding-top: 6px; }
    .oc-btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 8px 20px; border-radius: 12px; font-weight: 900; cursor: pointer; text-decoration: none;
      border: 1px solid var(--sim-border, rgba(182,156,255,.22)); background: var(--sim-surface-2, rgba(18,24,42,.6)); color: var(--sim-ink, #F4F7FB);
    }
    .oc-btn--line { background: transparent; color: var(--sim-ink-soft, rgba(244,247,251,.74)); }
    .oc-btn--go { background: linear-gradient(90deg, var(--sim-purple, #7C4DFF), #6336e0); border-color: transparent; color: #fff; }
  `]
})
export class AttemptOutcomeComponent {
  private readonly avatarStore = inject(AvatarStore);
  readonly avatar = this.avatarStore.avatar;

  readonly report = input<AttemptCompletionReport | null>(null);
  readonly status = input.required<SimulationAttemptState['status']>();
  readonly retry = output<void>();

  perf(r: AttemptCompletionReport): string { return performanceLabel(r); }

  barPct(r: AttemptCompletionReport, n: number): number {
    const total = decisionTotal(r);
    return total === 0 ? 0 : Math.round((n / total) * 100);
  }

  formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return 'No disponible';
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  }
}
