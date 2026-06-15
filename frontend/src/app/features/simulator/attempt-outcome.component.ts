import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttemptCompletionReport, AttemptTimelineEntry, SimulationAttemptState } from '../../core/models/simulation.model';
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
          @if (r.ending; as ending) {
            <div class="oc-ending" [attr.data-tone]="ending.tone" role="status">
              <p class="oc-ending__title">{{ ending.title }}</p>
              <p class="oc-ending__message">{{ ending.message }}</p>
              <div class="oc-chips oc-chips--state">
                <span class="oc-chip">Recomendadas: {{ ending.severityCounts.recommended }}</span>
                <span class="oc-chip">Aceptables: {{ ending.severityCounts.acceptable }}</span>
                <span class="oc-chip">Riesgosas: {{ ending.severityCounts.risky }}</span>
                @if (ending.severityCounts.critical) {
                  <span class="oc-chip oc-chip--alert">Críticas: {{ ending.severityCounts.critical }}</span>
                }
              </div>
            </div>
            <div class="oc-block">
              <p class="oc-label">Métricas del caso</p>
              <div class="oc-bars">
                @for (metric of caseMetricRows(ending.caseMetrics); track metric.key) {
                  <div class="oc-bar">
                    <span class="oc-bar__k">{{ metric.label }}</span>
                    <div class="oc-bar__t"><i [class]="'oc-bar__f ' + metric.cls" [style.width.%]="metric.value"></i></div>
                    <span class="oc-bar__n">{{ metric.value }}</span>
                  </div>
                }
              </div>
            </div>
          }
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

          <div class="oc-block">
            <p class="oc-label">Consecuencias del caso</p>
            <div class="oc-chips oc-chips--state">
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
                  <li class="oc-tl" [attr.data-tl]="timelineTone(t)">
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
          @if (status() === 'SAFE_EXITED') {
            <button type="button" class="oc-btn oc-btn--go" (click)="retry.emit()">Volver al juego</button>
          } @else {
            <button type="button" class="oc-btn oc-btn--go" (click)="retry.emit()">Reintentar caso</button>
            <a class="oc-btn oc-btn--line" routerLink="/portal/simulador">Volver al simulador</a>
          }
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
    .oc-ending {
      padding: 16px 18px; border-radius: 16px;
      background: rgba(124,77,255,.12); border: 1px solid rgba(182,156,255,.4);
    }
    .oc-ending[data-tone='positive'] { background: rgba(110,198,122,.12); border-color: rgba(110,198,122,.5); }
    .oc-ending[data-tone='warning']  { background: rgba(245,184,75,.10); border-color: rgba(245,184,75,.45); }
    .oc-ending[data-tone='critical'] { background: rgba(226,90,79,.12); border-color: rgba(226,90,79,.5); }
    .oc-ending__title { margin: 0; font-weight: 900; letter-spacing: .04em; font-size: .95rem; color: var(--sim-ink, #F4F7FB); }
    .oc-ending__message { margin: 8px 0 0; color: var(--sim-ink-soft, rgba(244,247,251,.74)); line-height: 1.55; }
    .oc-bar__f--mid { background: #B69CFF; }
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
    .oc-chip--ok { border-color: rgba(110,198,122,.5); color: #a9e2b1; }
    .oc-chips--state { margin-top: 0; }
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

  /** Tono visual de una entrada del timeline: prohibida pisa la clasificación. */
  timelineTone(t: AttemptTimelineEntry): string {
    return t.prohibited ? 'PROHIBITED' : (t.classification ?? 'EVENT');
  }

  barPct(r: AttemptCompletionReport, n: number): number {
    const total = decisionTotal(r);
    return total === 0 ? 0 : Math.round((n / total) * 100);
  }

  /** Métricas del caso (0-100) en filas presentables; verde alto = deseable,
   *  rojo alto = riesgo (crisis_emocional y riesgo_victima invierten el tono). */
  caseMetricRows(metrics: Record<string, number>): Array<{ key: string; label: string; value: number; cls: string }> {
    const labels: Record<string, string> = {
      confianza: 'Confianza',
      crisis_emocional: 'Crisis emocional',
      riesgo_victima: 'Riesgo de la víctima',
      rigor_tecnico: 'Rigor técnico',
      etica_profesional: 'Ética profesional',
      ruta_institucional: 'Ruta institucional',
      calidad_duelo: 'Manejo del duelo',
    };
    const inverted = new Set(['crisis_emocional', 'riesgo_victima']);
    return Object.keys(labels)
      .filter(key => typeof metrics[key] === 'number')
      .map(key => {
        const value = Math.max(0, Math.min(100, metrics[key]));
        const good = inverted.has(key) ? value <= 40 : value >= 60;
        const bad = inverted.has(key) ? value >= 60 : value <= 40;
        return {
          key,
          label: labels[key],
          value,
          cls: good ? 'oc-bar__f--ok' : bad ? 'oc-bar__f--bad' : 'oc-bar__f--mid',
        };
      });
  }

  formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return 'No disponible';
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  }
}
