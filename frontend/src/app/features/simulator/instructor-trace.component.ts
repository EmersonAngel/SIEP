import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SimulationService } from '../../core/api/simulation.service';
import { AuthService } from '../../core/auth/auth.service';
import { AttemptTrace, AttemptTimelineEntry, RecentAttempt, ReflectionTrace, RubricCriterionView, RubricEvaluationView, RubricSummary, TraceEvent } from '../../core/models/simulation.model';

type SummaryFeedbackKey = 'TOTAL' | 'ADEQUATE' | 'RISKY' | 'INADEQUATE' | 'REFLECTIONS' | 'EVALUATION' | 'TIME' | 'RECORRIDO';

interface FeedbackPanelView {
  key: SummaryFeedbackKey;
  title: string;
  intro: string;
  decisions: TraceEvent[];
  timeline: AttemptTimelineEntry[];
  reflections: ReflectionTrace[];
  evaluations: RubricSummary[];
  emptyTitle: string;
  emptyMessage: string;
  missingNodes: string[];
}

@Component({
  selector: 'app-instructor-trace',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressBarModule],
  template: `
    <section class="teacher-review-page">
      <header class="teacher-review-hero pixel-panel" aria-labelledby="teacher-review-title">
        <div class="teacher-review-hero__copy">
          <p class="psy-eyebrow">Panel docente</p>
          <h1 id="teacher-review-title">Revisión formativa del intento</h1>
          <p>
            Analiza la trazabilidad del estudiante, sus decisiones y reflexiones para emitir una evaluación pedagógica.
          </p>
        </div>
        <div class="teacher-review-hero__meta" aria-label="Contexto docente">
          <span class="pixel-badge pixel-badge--role">{{ currentRoleLabel() }}</span>
          <span class="pixel-badge">Trazabilidad real</span>
          @if (trace(); as item) {
            <span class="pixel-badge pixel-badge--status">{{ statusLabel(item.status) }}</span>
          }
        </div>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando trazabilidad docente" />
      }

      @if (error()) {
        <section class="teacher-error pixel-panel" role="alert">
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          <div>
            <strong>No fue posible cargar la trazabilidad.</strong>
            <p>{{ error() }}</p>
          </div>
        </section>
      }

      <div class="teacher-review-layout">
        <aside class="attempt-list pixel-panel" aria-labelledby="attempt-list-title">
          <div class="panel-heading">
            <p class="psy-eyebrow">Intentos recientes</p>
            <h2 id="attempt-list-title">Seguimiento por estudiante</h2>
          </div>

          @if (!loading() && !attempts().length) {
            <section class="teacher-empty" aria-live="polite">
              <mat-icon aria-hidden="true">inventory_2</mat-icon>
              <h3>No hay intentos recientes para tus grupos.</h3>
              <p>Cuando tus estudiantes completen simulaciones, aparecerán aquí para revisión.</p>
            </section>
          }

          <div class="attempt-list__items">
            @for (attempt of attempts(); track attempt.attemptId) {
              <button
                class="attempt-card pixel-card"
                [class.attempt-card--active]="selectedAttemptId() === attempt.attemptId"
                type="button"
                (click)="open(attempt)"
                [attr.aria-pressed]="selectedAttemptId() === attempt.attemptId"
              >
                <span class="attempt-card__top">
                  <strong>{{ clean(attempt.studentAlias, 'Estudiante') }}</strong>
                  <span class="pixel-badge" [ngClass]="statusClass(attempt.status)">{{ statusLabel(attempt.status) }}</span>
                </span>
                <span class="attempt-card__case">{{ clean(attempt.caseTitle, 'Caso sin título') }}</span>
                <span class="attempt-card__meta">
                  <span>Puntaje {{ attempt.accumulatedScore }}</span>
                  <span>{{ formatDate(attempt.startedAt) }}</span>
                </span>
                <span class="attempt-card__action">
                  Ver trazabilidad
                  <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                </span>
              </button>
            }
          </div>
        </aside>

        <main class="teacher-review-main">
          @if (trace(); as item) {
            <section class="attempt-overview pixel-panel" aria-labelledby="attempt-overview-title">
              <div class="panel-heading">
                <p class="psy-eyebrow">{{ clean(item.studentAlias, 'Estudiante') }}</p>
                <h2 id="attempt-overview-title">{{ clean(item.caseTitle, 'Caso sin título') }}</h2>
                <p>
                  Intento {{ statusLabel(item.status) }} · Inicio {{ formatDate(item.startedAt) }}
                  @if (item.endedAt) { · Cierre {{ formatDate(item.endedAt) }} }
                </p>
              </div>
              <div class="attempt-overview__facts" aria-label="Datos del intento">
                <span class="pixel-badge" [ngClass]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                <span class="pixel-badge">Puntaje {{ item.accumulatedScore }}</span>
                <span class="pixel-badge">Estrés {{ item.stressIndex }}%</span>
                <span class="pixel-badge">Grupo validado por permisos</span>
              </div>
            </section>

            <section class="review-summary-grid" aria-label="Resumen de revisión">
              <button
                type="button"
                class="review-summary-card review-summary-card--action pixel-card"
                (click)="openFeedback('TOTAL', item)"
                aria-haspopup="dialog"
              >
                <span>Total decisiones</span>
                <strong>{{ totalDecisions(item) }}</strong>
                <span class="review-summary-card__cta">Ver retroalimentación <mat-icon aria-hidden="true">feedback</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--adequate review-summary-card--action pixel-card"
                (click)="openFeedback('ADEQUATE', item)"
                aria-haspopup="dialog"
              >
                <span>Adecuadas</span>
                <strong>{{ item.adequateDecisions }}</strong>
                <span class="review-summary-card__cta">Ver retroalimentación <mat-icon aria-hidden="true">feedback</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--risky review-summary-card--action pixel-card"
                (click)="openFeedback('RISKY', item)"
                aria-haspopup="dialog"
              >
                <span>Riesgosas</span>
                <strong>{{ item.riskyDecisions }}</strong>
                <span class="review-summary-card__cta">Ver retroalimentación <mat-icon aria-hidden="true">feedback</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--inadequate review-summary-card--action pixel-card"
                (click)="openFeedback('INADEQUATE', item)"
                aria-haspopup="dialog"
              >
                <span>Inadecuadas</span>
                <strong>{{ item.inadequateDecisions }}</strong>
                <span class="review-summary-card__cta">Ver retroalimentación <mat-icon aria-hidden="true">feedback</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--action pixel-card"
                (click)="openFeedback('REFLECTIONS', item)"
                aria-haspopup="dialog"
              >
                <span>Reflexiones</span>
                <strong>{{ item.reflections.length }}</strong>
                <span class="review-summary-card__cta">Ver bitácoras <mat-icon aria-hidden="true">menu_book</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--action pixel-card"
                (click)="openFeedback('EVALUATION', item)"
                aria-haspopup="dialog"
              >
                <span>Evaluación</span>
                <strong>{{ item.rubricEvaluations.length ? 'Aplicada' : 'Pendiente' }}</strong>
                <span class="review-summary-card__cta">Ver evaluación <mat-icon aria-hidden="true">grading</mat-icon></span>
              </button>
              <button
                type="button"
                class="review-summary-card review-summary-card--wide review-summary-card--action pixel-card"
                (click)="openFeedback('TIME', item)"
                aria-haspopup="dialog"
              >
                <span>Tiempo total</span>
                <strong>{{ formatDuration(item.totalDurationSeconds) }}</strong>
                <span class="review-summary-card__cta">Ver detalle <mat-icon aria-hidden="true">schedule</mat-icon></span>
              </button>
            </section>

            @if (feedbackPanel(); as panel) {
              <div
                class="feedback-modal"
                role="dialog"
                aria-modal="true"
                [attr.aria-labelledby]="'feedback-modal-title-' + panel.key"
                (keydown.escape)="closeFeedback()"
              >
                <button type="button" class="feedback-modal__backdrop" aria-label="Cerrar retroalimentación" (click)="closeFeedback()"></button>
                <section class="feedback-modal__panel pixel-panel">
                  <header class="feedback-modal__header">
                    <div>
                      <p class="psy-eyebrow">Retroalimentación docente</p>
                      <h2 [id]="'feedback-modal-title-' + panel.key">{{ panel.title }}</h2>
                      <p>{{ panel.intro }}</p>
                    </div>
                  </header>

                  <div class="feedback-modal__body">
                  @if (panel.decisions.length) {
                    <div class="feedback-modal__list">
                      @for (decision of panel.decisions; track $index) {
                        <article class="feedback-decision-card pixel-card" [ngClass]="eventClass(decision)">
                          <div class="feedback-decision-card__top">
                            <span class="pixel-badge" [ngClass]="classificationClass(decision.classification)">
                              {{ classificationLabel(decision.classification) }}
                            </span>
                            <small>{{ formatDate(decision.occurredAt) }}</small>
                          </div>
                          <h3>{{ clean(decision.decisionText, 'Decisión registrada') }}</h3>
                          @if (decision.nodeTitle) {
                            <p class="feedback-decision-card__node">Escenario: {{ decision.nodeTitle }}</p>
                          }
                          <p class="feedback-decision-card__hint">{{ decisionFeedback(decision) }}</p>
                          @if (decision.scoreDelta || decision.stressDelta) {
                            <small>
                              Impacto · Puntaje {{ signed(decision.scoreDelta) }} · Estrés {{ signed(decision.stressDelta) }}
                            </small>
                          }
                        </article>
                      }
                    </div>
                  } @else if (panel.timeline.length) {
                    <div class="feedback-modal__list">
                      @for (entry of panel.timeline; track $index) {
                        <article class="feedback-decision-card pixel-card" [ngClass]="timelineEntryClass(entry)">
                          <div class="feedback-decision-card__top">
                            <span class="pixel-badge" [ngClass]="classificationClass(entry.classification)">
                              {{ timelineEntryLabel(entry) }}
                            </span>
                            <small>{{ entry.time }}</small>
                          </div>
                          <h3>{{ clean(entry.label, 'Evento registrado') }}</h3>
                          <p class="feedback-decision-card__hint">{{ timelineFeedback(entry) }}</p>
                        </article>
                      }
                    </div>
                  } @else if (panel.reflections.length) {
                    <div class="feedback-modal__list">
                      @for (reflection of panel.reflections; track reflection.nodeId) {
                        <article class="reflection-card pixel-card">
                          <div class="reflection-card__top">
                            <strong>{{ clean(reflection.nodeTitle, 'Escenario') }}</strong>
                            @if (reflection.locked) {
                              <span class="pixel-badge">Bloqueada</span>
                            }
                          </div>
                          <p>{{ clean(reflection.text, 'Sin texto registrado.') }}</p>
                        </article>
                      }
                    </div>
                  } @else if (panel.evaluations.length) {
                    <div class="feedback-modal__list">
                      @for (evaluation of panel.evaluations; track evaluation.id) {
                        <article class="feedback-decision-card pixel-card">
                          <h3>{{ clean(evaluation.rubricName, 'Rúbrica') }}</h3>
                          <p>Puntaje total: <strong>{{ evaluation.totalScore }}</strong></p>
                          @if (evaluation.comment) {
                            <p class="feedback-decision-card__hint">{{ evaluation.comment }}</p>
                          }
                          <small>Evaluada {{ formatDate(evaluation.evaluatedAt) }}</small>
                        </article>
                      }
                    </div>
                  } @else if (panel.key === 'TIME') {
                    <article class="feedback-decision-card pixel-card">
                      <h3>Duración del intento</h3>
                      <p class="feedback-decision-card__hint">{{ panel.intro }}</p>
                    </article>
                  } @else {
                    <section class="teacher-empty teacher-empty--compact">
                      <h3>{{ panel.emptyTitle }}</h3>
                      <p>{{ panel.emptyMessage }}</p>
                      @if (panel.missingNodes.length) {
                        <div class="reflection-missing">
                          <strong>Escenarios visitados sin bitácora:</strong>
                          <ul>
                            @for (nodeTitle of panel.missingNodes; track nodeTitle) {
                              <li>{{ nodeTitle }}</li>
                            }
                          </ul>
                        </div>
                      }
                    </section>
                  }
                  </div>

                  <footer class="feedback-modal__footer">
                    <button type="button" class="pixel-button pixel-button--primary" (click)="closeFeedback()">Cerrar</button>
                  </footer>
                </section>
              </div>
            }

            @if ((item.phaseDurations ?? []).length) {
              <section class="trace-timeline pixel-panel" aria-labelledby="phase-duration-title">
                <div class="panel-heading panel-heading--row">
                  <div>
                    <p class="psy-eyebrow">Tiempo por escenario</p>
                    <h2 id="phase-duration-title">Duración calculada por eventos</h2>
                  </div>
                </div>
                @for (phase of item.phaseDurations; track phase.nodeId + '-' + $index) {
                  <article class="trace-event-card pixel-card">
                    <div class="trace-event-card__body">
                      <div class="trace-event-card__top">
                        <strong>{{ clean(phase.nodeTitle, 'Escenario') }}</strong>
                        <span class="pixel-badge">{{ formatDuration(phase.durationSeconds) }}</span>
                      </div>
                      <small>
                        Inicio {{ formatDate(phase.startedAt) }}
                        @if (phase.endedAt) { · Fin {{ formatDate(phase.endedAt) }} }
                      </small>
                    </div>
                  </article>
                }
              </section>
            }

            <section class="trace-timeline pixel-panel" aria-labelledby="trace-title">
              <div class="panel-heading panel-heading--row">
                <div>
                  <p class="psy-eyebrow">Recorrido</p>
                  <h2 id="trace-title">Línea de tiempo de eventos</h2>
                </div>
                <span class="pixel-badge">{{ timelineEntries(item).length }} eventos</span>
                <button type="button" class="pixel-button pixel-button--mini" (click)="openFeedback('RECORRIDO', item)">
                  Ver retroalimentación
                </button>
              </div>

              @if (!timelineEntries(item).length) {
                <section class="teacher-empty teacher-empty--compact">
                  <h3>No hay eventos registrados para este intento.</h3>
                </section>
              }

              @for (entry of timelineEntries(item); track $index) {
                <article class="trace-event-card pixel-card" [ngClass]="timelineEntryClass(entry)">
                  <div class="trace-event-card__marker" aria-hidden="true">
                    <mat-icon>{{ timelineIcon(entry) }}</mat-icon>
                  </div>
                  <div class="trace-event-card__body">
                    <div class="trace-event-card__top">
                      <strong>{{ clean(entry.label, 'Evento registrado') }}</strong>
                      <span class="pixel-badge" [ngClass]="classificationClass(entry.classification)">
                        {{ timelineEntryLabel(entry) }}
                      </span>
                    </div>
                    <small>
                      {{ entry.time }}
                      @if (entry.scoreDelta || entry.stressDelta) {
                        · Puntaje {{ signed(entry.scoreDelta) }} · Estrés {{ signed(entry.stressDelta) }}
                      }
                    </small>
                  </div>
                </article>
              }
            </section>

            <section class="feedback-panel pixel-panel" aria-labelledby="reflection-title">
              <div class="panel-heading panel-heading--row">
                <div>
                  <p class="psy-eyebrow">Bitácoras</p>
                  <h2 id="reflection-title">Reflexiones del estudiante</h2>
                </div>
                <span class="pixel-badge">{{ item.reflections.length }} registradas</span>
                <button type="button" class="pixel-button pixel-button--mini" (click)="openFeedback('REFLECTIONS', item)">
                  Ver retroalimentación
                </button>
              </div>

              @if (!item.reflections.length) {
                <section class="teacher-empty teacher-empty--compact">
                  <h3>El estudiante aún no registró reflexiones en este intento.</h3>
                  <p>
                    La bitácora es opcional por escenario. Puedes evaluar con la trazabilidad de decisiones
                    y la rúbrica del caso.
                  </p>
                  @if (nodesWithoutReflection(item).length) {
                    <div class="reflection-missing">
                      <strong>Escenarios visitados sin bitácora:</strong>
                      <ul>
                        @for (nodeTitle of nodesWithoutReflection(item); track nodeTitle) {
                          <li>{{ nodeTitle }}</li>
                        }
                      </ul>
                    </div>
                  }
                </section>
              }

              <div class="reflection-grid">
                @for (reflection of item.reflections; track reflection.nodeId) {
                  <article class="reflection-card pixel-card">
                    <div class="reflection-card__top">
                      <strong>{{ clean(reflection.nodeTitle, 'Escenario') }}</strong>
                      @if (reflection.locked) {
                        <span class="pixel-badge">Bloqueada</span>
                      }
                    </div>
                    <p>{{ clean(reflection.text, 'Sin texto registrado.') }}</p>
                  </article>
                }
              </div>
            </section>

            <section class="rubric-panel pixel-panel" aria-labelledby="rubric-title">
              @if (rubric(); as rub) {
                <div class="panel-heading panel-heading--row">
                  <div>
                    <p class="psy-eyebrow">Rúbrica</p>
                    <h2 id="rubric-title">{{ clean(rub.rubricName, 'Rúbrica del caso') }}</h2>
                    <p>{{ clean(rub.description, 'Evalúa el desempeño formativo del intento.') }}</p>
                  </div>
                  <div class="rubric-total" aria-label="Total de rúbrica">
                    <span>Total</span>
                    <strong>{{ rubricTotal(rub) }}</strong>
                  </div>
                </div>

                @if (!rub.criteria.length) {
                  <section class="teacher-empty teacher-empty--compact">
                    <h3>No hay rúbrica disponible para este caso.</h3>
                  </section>
                }

                <div class="rubric-criteria">
                  @for (criterion of rub.criteria; track criterion.id) {
                    <article class="rubric-criterion-card pixel-card">
                      <div class="rubric-criterion-card__copy">
                        <span class="pixel-badge">{{ clean(criterion.competency, 'Criterio') }}</span>
                        <h3>{{ clean(criterion.title, 'Criterio de evaluación') }}</h3>
                        <p>{{ clean(criterion.description, 'Sin descripción adicional.') }}</p>
                      </div>

                      <div class="rubric-criterion-card__controls">
                        <label [for]="scoreId(criterion)">Puntaje</label>
                        <input
                          [id]="scoreId(criterion)"
                          type="number"
                          min="0"
                          [max]="criterion.maxScore"
                          step="0.5"
                          [(ngModel)]="rubricScores[criterion.id]"
                          (ngModelChange)="clearRubricValidation()"
                          [attr.aria-describedby]="rubricFieldError(criterion.id) ? errorId(criterion) : hintId(criterion)"
                          [attr.aria-invalid]="rubricFieldError(criterion.id) ? 'true' : 'false'"
                        />
                        <small [id]="hintId(criterion)">Rango 0 a {{ criterion.maxScore }}</small>
                        @if (rubricFieldError(criterion.id); as fieldError) {
                          <small class="rubric-field-error" [id]="errorId(criterion)" role="alert">{{ fieldError }}</small>
                        }
                      </div>

                      <div class="rubric-criterion-card__comment">
                        <label [for]="commentId(criterion)">Observación del criterio</label>
                        <textarea
                          [id]="commentId(criterion)"
                          rows="3"
                          [(ngModel)]="rubricComments[criterion.id]"
                          placeholder="Observación breve sobre evidencia, decisiones o mejora."
                        ></textarea>
                      </div>
                    </article>
                  }
                </div>

                <div class="feedback-panel__form">
                  <label for="rubric-global-comment">Retroalimentación docente</label>
                  <p>Escribe una retroalimentación formativa orientada a decisiones, ética profesional y rutas de atención.</p>
                  <textarea
                    id="rubric-global-comment"
                    [(ngModel)]="rubricComment"
                    rows="4"
                    placeholder="Retroalimentación general para el estudiante."
                  ></textarea>
                </div>

                <div class="rubric-actions">
                  <button class="pixel-button pixel-button--primary" type="button" (click)="saveRubric()" [disabled]="savingRubric() || hasRubricErrors()">
                    <mat-icon aria-hidden="true">{{ savingRubric() ? 'hourglass_empty' : 'save' }}</mat-icon>
                    {{ savingRubric() ? 'Guardando evaluación' : 'Guardar evaluación' }}
                  </button>
                  @if (rubricMessage()) {
                    <p class="rubric-message" [class.rubric-message--error]="rubricMessageIsError()" role="alert">
                      {{ rubricMessage() }}
                    </p>
                  }
                </div>
              } @else {
                <section class="teacher-empty teacher-empty--compact">
                  <h3>No hay rúbrica disponible para este caso.</h3>
                  @if (rubricMessage()) {
                    <p class="rubric-message" [class.rubric-message--error]="rubricMessageIsError()">{{ rubricMessage() }}</p>
                  }
                </section>
              }
            </section>
          } @else {
            <section class="teacher-empty teacher-empty--hero pixel-panel">
              <mat-icon aria-hidden="true">timeline</mat-icon>
              <h2>Selecciona un intento</h2>
              <p>El panel mostrará recorrido, decisiones, bitácoras, recursos de evaluación y rúbrica.</p>
            </section>
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: #183047;
    }

    .teacher-review-page {
      display: grid;
      gap: 18px;
      max-width: 1440px;
      margin: 0 auto;
    }

    .pixel-panel,
    .pixel-card {
      border: 2px solid #2b4d6f;
      box-shadow: 6px 6px 0 rgba(43, 77, 111, .16);
      background: #fbfdff;
    }

    .pixel-panel {
      border-radius: 8px;
      padding: 18px;
    }

    .pixel-card {
      border-radius: 6px;
      background: #ffffff;
    }

    .teacher-review-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      background:
        linear-gradient(135deg, rgba(232, 246, 255, .94), rgba(250, 246, 255, .94)),
        repeating-linear-gradient(0deg, rgba(43, 77, 111, .06) 0 2px, transparent 2px 12px);
    }

    .teacher-review-hero__copy {
      max-width: 780px;
    }

    .teacher-review-hero h1 {
      margin: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: 0;
      line-height: 1.05;
      color: #1d3350;
    }

    .teacher-review-hero p:not(.psy-eyebrow),
    .panel-heading p,
    .trace-event-card p,
    .reflection-card p,
    .rubric-criterion-card p,
    .feedback-panel__form p,
    .teacher-empty p {
      color: #53687d;
      line-height: 1.55;
      margin: 6px 0 0;
    }

    .teacher-review-hero__meta,
    .attempt-overview__facts,
    .trace-event-card__top,
    .reflection-card__top,
    .panel-heading--row,
    .attempt-card__top,
    .rubric-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pixel-badge {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 5px 9px;
      border: 2px solid #2b4d6f;
      border-radius: 6px;
      background: #eef7ff;
      color: #1d3350;
      font-size: .78rem;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
    }

    .pixel-badge--role {
      background: #f4edff;
      border-color: #6f4caf;
      color: #482a7d;
    }

    .pixel-badge--status,
    .pixel-badge--completed {
      background: #e9f8ef;
      border-color: #2d7d50;
      color: #1f6540;
    }

    .pixel-badge--progress {
      background: #fff7e8;
      border-color: #b06a25;
      color: #76501e;
    }

    .pixel-badge--pending {
      background: #f0f4fa;
      border-color: #64748b;
      color: #334155;
    }

    .teacher-error {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #fff0f2;
      border-color: #ad3b50;
      color: #7a2434;
    }

    .teacher-error p,
    .teacher-error strong {
      margin: 0;
    }

    .teacher-review-layout {
      display: grid;
      grid-template-columns: minmax(280px, .34fr) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .attempt-list,
    .teacher-review-main,
    .trace-timeline,
    .feedback-panel,
    .rubric-panel {
      display: grid;
      gap: 14px;
    }

    .attempt-list {
      position: sticky;
      top: 88px;
      max-height: calc(100vh - 110px);
      overflow: auto;
    }

    .panel-heading h2,
    .teacher-empty h2,
    .teacher-empty h3,
    .rubric-criterion-card h3 {
      margin: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      letter-spacing: 0;
      color: #1d3350;
    }

    .attempt-list__items,
    .reflection-grid,
    .rubric-criteria {
      display: grid;
      gap: 12px;
    }

    .attempt-card {
      display: grid;
      width: 100%;
      gap: 10px;
      padding: 12px;
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    }

    .attempt-card:hover,
    .attempt-card:focus-visible {
      transform: translate(-2px, -2px);
      box-shadow: 8px 8px 0 rgba(43, 77, 111, .2);
      border-color: #6f4caf;
      outline: 3px solid rgba(111, 76, 175, .22);
      outline-offset: 2px;
    }

    .attempt-card--active {
      background: #f4edff;
      border-color: #6f4caf;
    }

    .attempt-card__case {
      color: #1d3350;
      font-weight: 800;
      line-height: 1.35;
    }

    .attempt-card__meta,
    .attempt-card__action {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: #53687d;
      font-size: .88rem;
      font-weight: 700;
    }

    .attempt-card__action {
      align-items: center;
      color: #482a7d;
    }

    .attempt-card__action mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .attempt-overview {
      display: grid;
      gap: 14px;
      background: #f8fcff;
    }

    .review-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .review-summary-card {
      display: grid;
      align-content: start;
      gap: 10px;
      min-height: 128px;
      padding: 20px 22px;
      border-left: 10px solid #5d7fa4;
    }

    .review-summary-card--action {
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    }

    .review-summary-card--action:hover,
    .review-summary-card--action:focus-visible {
      transform: translate(-2px, -2px);
      box-shadow: 8px 8px 0 rgba(43, 77, 111, .2);
      outline: 3px solid rgba(111, 76, 175, .22);
      outline-offset: 2px;
    }

    .review-summary-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      color: #482a7d;
      font-size: .78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .review-summary-card__cta mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .pixel-button--mini {
      min-height: 36px;
      padding: 0 12px;
      font-size: .78rem;
    }

    .feedback-modal {
      position: fixed;
      inset: 0;
      z-index: 220;
      display: grid;
      place-items: center;
      padding: 20px;
      overflow: hidden;
      overscroll-behavior: none;
    }

    .feedback-modal__backdrop {
      position: absolute;
      inset: 0;
      border: none;
      background: rgba(12, 18, 34, .58);
      cursor: pointer;
    }

    .feedback-modal__panel {
      position: relative;
      z-index: 1;
      width: min(760px, 100%);
      max-height: min(86vh, 920px);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 14px;
      overflow: hidden;
      background: #fbfdff;
    }

    .feedback-modal__body {
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 4px;
    }

    .feedback-modal__header,
    .feedback-modal__footer,
    .feedback-decision-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .feedback-modal__header h2 {
      margin: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      color: #1d3350;
    }

    .feedback-modal__list {
      display: grid;
      gap: 12px;
    }

    .feedback-decision-card {
      display: grid;
      gap: 8px;
      padding: 14px;
      border-left: 8px solid #5d7fa4;
    }

    .feedback-decision-card h3 {
      margin: 0;
      color: #1d3350;
      font-size: 1rem;
      line-height: 1.4;
    }

    .feedback-decision-card__node {
      margin: 0;
      color: #53687d;
      font-weight: 700;
      font-size: .86rem;
    }

    .feedback-decision-card__hint {
      margin: 0;
      color: #334155;
      font-size: .88rem;
      line-height: 1.5;
      font-weight: 600;
      background: #f8fcff;
      border-left: 4px solid #6f4caf;
      padding: 8px 10px;
      border-radius: 4px;
    }

    .feedback-modal__footer {
      justify-content: flex-end;
      padding-top: 4px;
      border-top: 1px solid #d7e4f0;
    }

    .review-summary-card--wide {
      grid-column: 1 / -1;
      min-height: 112px;
    }

    .review-summary-card span {
      color: #53687d;
      font-size: .9rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .review-summary-card strong {
      color: #1d3350;
      font-size: clamp(1.85rem, 3.2vw, 2.5rem);
      line-height: 1.05;
      font-family: 'Poppins', system-ui, sans-serif;
    }

    .review-summary-card--adequate {
      border-left-color: #2d7d50;
    }

    .review-summary-card--risky {
      border-left-color: #c4751f;
    }

    .review-summary-card--inadequate {
      border-left-color: #ad3b50;
    }

    .trace-event-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 12px;
      padding: 14px;
      border-left: 8px solid #5d7fa4;
    }

    .trace-event-card--adequate {
      border-left-color: #2d7d50;
      background: #f6fff8;
    }

    .trace-event-card--risky {
      border-left-color: #c4751f;
      background: #fff9ef;
    }

    .trace-event-card--inadequate {
      border-left-color: #ad3b50;
      background: #fff4f6;
    }

    .trace-event-card__marker {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border: 2px solid #2b4d6f;
      border-radius: 6px;
      background: #eef7ff;
      color: #1d3350;
    }

    .trace-event-card__body {
      min-width: 0;
    }

    .trace-event-card__body strong,
    .reflection-card strong {
      color: #1d3350;
    }

    .trace-event-card__node {
      font-weight: 800;
    }

    .trace-event-card small,
    .rubric-criterion-card small {
      display: block;
      color: #53687d;
      font-weight: 700;
      margin-top: 8px;
    }

    .reflection-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .reflection-card {
      padding: 14px;
      background: #f8fcff;
    }

    .reflection-missing {
      margin-top: 10px;
      width: 100%;
      text-align: left;
    }

    .reflection-missing strong {
      display: block;
      margin-bottom: 6px;
      color: #1d3350;
      font-size: .84rem;
    }

    .reflection-missing ul {
      margin: 0;
      padding-left: 18px;
      color: #53687d;
      font-size: .84rem;
      line-height: 1.5;
    }

    .rubric-panel {
      background: #fdfcff;
      border-color: #6f4caf;
    }

    .rubric-total {
      display: grid;
      gap: 4px;
      min-width: 120px;
      padding: 10px;
      border: 2px solid #6f4caf;
      border-radius: 6px;
      background: #f4edff;
      color: #482a7d;
      text-align: center;
    }

    .rubric-total span {
      font-weight: 800;
      text-transform: uppercase;
      font-size: .78rem;
    }

    .rubric-total strong {
      font-size: 1.7rem;
      line-height: 1;
    }

    .rubric-criterion-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px;
      gap: 14px;
      padding: 14px;
    }

    .rubric-criterion-card__comment {
      grid-column: 1 / -1;
    }

    .rubric-criterion-card__copy,
    .rubric-criterion-card__controls,
    .rubric-criterion-card__comment,
    .feedback-panel__form {
      display: grid;
      gap: 8px;
    }

    label {
      color: #1d3350;
      font-weight: 900;
    }

    input,
    textarea {
      width: 100%;
      border: 2px solid #2b4d6f;
      border-radius: 6px;
      background: #ffffff;
      color: #183047;
      font: inherit;
      font-weight: 700;
    }

    input {
      min-height: 44px;
      padding: 0 10px;
    }

    textarea {
      min-height: 96px;
      padding: 12px;
      resize: vertical;
      font-weight: 600;
    }

    input:focus-visible,
    textarea:focus-visible,
    .pixel-button:focus-visible {
      outline: 3px solid rgba(111, 76, 175, .28);
      outline-offset: 2px;
      border-color: #6f4caf;
    }

    input[aria-invalid='true'] {
      border-color: #ad3b50;
      background: #fff4f6;
    }

    .rubric-field-error,
    .rubric-message--error {
      color: #8f2f3d;
      font-weight: 900;
    }

    .rubric-actions {
      justify-content: flex-start;
    }

    .pixel-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 46px;
      padding: 0 16px;
      border: 2px solid #2b4d6f;
      border-radius: 6px;
      background: #ffffff;
      box-shadow: 4px 4px 0 rgba(43, 77, 111, .18);
      color: #1d3350;
      font-weight: 900;
      cursor: pointer;
    }

    .pixel-button--primary {
      background: #6f4caf;
      border-color: #482a7d;
      color: #ffffff;
    }

    .pixel-button:disabled {
      cursor: not-allowed;
      opacity: .62;
      box-shadow: none;
    }

    .rubric-message {
      margin: 0;
      color: #1f6540;
      font-weight: 900;
    }

    .teacher-empty {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 18px;
      border: 2px dashed #8aa4be;
      border-radius: 6px;
      background: #f8fcff;
      text-align: center;
    }

    .teacher-empty mat-icon {
      color: #5d7fa4;
      font-size: 42px;
      width: 42px;
      height: 42px;
    }

    .teacher-empty--compact {
      justify-items: start;
      text-align: left;
    }

    .teacher-empty--hero {
      min-height: 360px;
      align-content: center;
    }

    @media (max-width: 1180px) {
      .review-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 920px) {
      .teacher-review-layout {
        grid-template-columns: 1fr;
      }

      .attempt-list {
        position: static;
        max-height: none;
      }

      .teacher-review-hero {
        display: grid;
      }
    }

    @media (max-width: 720px) {
      .pixel-panel {
        padding: 14px;
      }

      .review-summary-grid,
      .reflection-grid,
      .rubric-criterion-card {
        grid-template-columns: 1fr;
      }

      .trace-event-card {
        grid-template-columns: 1fr;
      }

      .trace-event-card__marker {
        width: 38px;
        height: 38px;
      }

      .attempt-card__meta,
      .attempt-card__action,
      .panel-heading--row,
      .rubric-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .pixel-button {
        width: 100%;
      }
    }

    @media (max-width: 430px) {
      .teacher-review-page {
        gap: 14px;
      }

      .teacher-review-hero h1 {
        font-size: 2rem;
      }

      .pixel-badge {
        width: fit-content;
      }
    }
  `]
})
export class InstructorTraceComponent implements OnInit, OnDestroy {
  private readonly simulationService = inject(SimulationService);
  private readonly authService = inject(AuthService);

  readonly attempts = signal<RecentAttempt[]>([]);
  readonly trace = signal<AttemptTrace | null>(null);
  readonly rubric = signal<RubricEvaluationView | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rubricMessage = signal('');
  readonly rubricMessageIsError = signal(false);
  readonly savingRubric = signal(false);
  readonly rubricValidationErrors = signal<Record<number, string>>({});
  readonly selectedAttemptId = signal<string | null>(null);
  readonly feedbackPanel = signal<FeedbackPanelView | null>(null);

  private scrollLockY = 0;

  rubricScores: Record<number, number> = {};
  rubricComments: Record<number, string> = {};
  rubricComment = '';

  ngOnInit() {
    this.loadAttempts();
  }

  ngOnDestroy() {
    this.unlockPageScroll();
  }

  open(attempt: RecentAttempt) {
    this.loading.set(true);
    this.error.set('');
    this.rubricMessage.set('');
    this.rubricMessageIsError.set(false);
    this.rubricValidationErrors.set({});
    this.selectedAttemptId.set(attempt.attemptId);
    this.feedbackPanel.set(null);

    this.simulationService.attemptTrace(attempt.attemptId).subscribe({
      next: trace => {
        this.trace.set(trace);
        this.loadRubric(attempt.attemptId);
      },
      error: () => {
        this.trace.set(null);
        this.rubric.set(null);
        this.error.set('Intenta nuevamente o verifica tus permisos.');
        this.loading.set(false);
      }
    });
  }

  saveRubric() {
    const trace = this.trace();
    const rubric = this.rubric();
    if (!trace || !rubric || this.savingRubric()) return;

    if (!this.validateRubricScores(rubric)) {
      this.rubricMessage.set('Revisa los puntajes: deben estar dentro del rango de cada criterio.');
      this.rubricMessageIsError.set(true);
      return;
    }

    const scores = rubric.criteria.map(criterion => ({
      criterionId: criterion.id,
      score: Number(this.rubricScores[criterion.id] ?? 0),
      comment: this.clean(this.rubricComments[criterion.id], '')
    }));

    this.savingRubric.set(true);
    this.rubricMessage.set('');
    this.rubricMessageIsError.set(false);

    this.simulationService.saveRubric(trace.attemptId, rubric.rubricId, this.rubricComment, scores).subscribe({
      next: saved => {
        this.rubric.set(saved);
        this.seedRubricForm(saved);
        this.rubricMessage.set('Evaluación guardada correctamente.');
        this.rubricMessageIsError.set(false);
        this.savingRubric.set(false);
        this.refreshTrace(trace.attemptId);
      },
      error: () => {
        this.rubricMessage.set('No fue posible guardar la evaluación. Intenta nuevamente o verifica tus permisos.');
        this.rubricMessageIsError.set(true);
        this.savingRubric.set(false);
      }
    });
  }

  rubricFieldError(criterionId: number): string | null {
    return this.rubricValidationErrors()[criterionId] ?? null;
  }

  clearRubricValidation() {
    this.rubricValidationErrors.set({});
    if (this.rubricMessageIsError()) {
      this.rubricMessage.set('');
      this.rubricMessageIsError.set(false);
    }
  }

  hasRubricErrors(): boolean {
    return Object.keys(this.rubricValidationErrors()).length > 0;
  }

  currentRoleLabel(): string {
    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') return 'Rol admin';
    if (role === 'PROFESOR') return 'Rol profesor';
    return 'Rol docente';
  }

  statusLabel(status: string | null | undefined): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'COMPLETED') return 'Finalizado';
    if (normalized === 'IN_PROGRESS') return 'En curso';
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'SAFE_EXITED') return 'Salida segura';
    return this.clean(status, 'Sin estado');
  }

  statusClass(status: string | null | undefined): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'COMPLETED') return 'pixel-badge--completed';
    if (normalized === 'IN_PROGRESS') return 'pixel-badge--progress';
    return 'pixel-badge--pending';
  }

  classificationLabel(value: string | null | undefined): string {
    const normalized = (value ?? '').toUpperCase();
    if (normalized === 'ADEQUATE') return 'Adecuada';
    if (normalized === 'RISKY') return 'Riesgosa';
    if (normalized === 'INADEQUATE') return 'Inadecuada';
    if (normalized === 'PROHIBITED') return 'Contraindicada';
    if (normalized.includes('DECISION')) return 'Decisión';
    if (normalized.includes('REFLECTION')) return 'Reflexión';
    if (normalized.includes('TOOL')) return 'Recurso';
    return 'Evento';
  }

  classificationClass(value: string | null | undefined): string {
    const normalized = (value ?? '').toUpperCase();
    if (normalized === 'ADEQUATE') return 'pixel-badge--completed';
    if (normalized === 'RISKY') return 'pixel-badge--progress';
    if (normalized === 'INADEQUATE' || normalized === 'PROHIBITED') return 'pixel-badge--pending';
    return '';
  }

  eventClass(event: TraceEvent): string {
    const normalized = (event.classification ?? '').toUpperCase();
    if (normalized === 'ADEQUATE') return 'trace-event-card--adequate';
    if (normalized === 'RISKY') return 'trace-event-card--risky';
    if (normalized === 'INADEQUATE' || normalized === 'PROHIBITED') return 'trace-event-card--inadequate';
    return '';
  }

  eventTitle(event: TraceEvent): string {
    if (event.classification) return `Decisión ${this.classificationLabel(event.classification).toLowerCase()}`;
    return this.classificationLabel(event.type);
  }

  eventText(event: TraceEvent): string {
    return this.clean(event.detail || event.decisionText || event.nodeTitle, 'Evento registrado sin detalle adicional.');
  }

  iconFor(type: string): string {
    const normalized = type.toUpperCase();
    if (normalized.includes('DECISION')) return 'rule';
    if (normalized.includes('TOOL')) return 'construction';
    if (normalized.includes('WORLD')) return 'open_with';
    if (normalized.includes('REFLECTION')) return 'edit_note';
    if (normalized.includes('COMPLETE')) return 'verified';
    return 'timeline';
  }

  totalDecisions(item: AttemptTrace): number {
    return item.adequateDecisions + item.riskyDecisions + item.inadequateDecisions + item.prohibitedDecisions;
  }

  decisionsByClassification(item: AttemptTrace, classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE'): TraceEvent[] {
    const target = classification.toUpperCase();
    return item.events.filter(event => this.isDecisionEvent(event) && (event.classification ?? '').toUpperCase() === target);
  }

  openFeedback(key: SummaryFeedbackKey, item: AttemptTrace) {
    this.feedbackPanel.set(this.buildFeedbackPanel(key, item));
    this.lockPageScroll();
  }

  closeFeedback() {
    this.feedbackPanel.set(null);
    this.unlockPageScroll();
  }

  decisionFeedback(event: TraceEvent): string {
    const type = (event.type ?? '').toUpperCase();
    const classification = (event.classification ?? '').toUpperCase();
    if (type === 'PROHIBITED_DECISION_SELECTED') {
      return 'Conducta contraindicada: conviene revisar marco ético, límites profesionales y rutas de protección.';
    }
    if (classification === 'ADEQUATE') {
      return 'Esta elección refuerza una ruta de atención ética y pertinente. Puedes validarla en la retroalimentación.';
    }
    if (classification === 'RISKY') {
      return 'Revisar en sesión: puede elevar el riesgo psicosocial, el estrés del caso o dejar brechas en la ruta institucional.';
    }
    if (classification === 'INADEQUATE') {
      return 'Oportunidad de retroalimentación directa: contrastar la alternativa más adecuada y los principios de no revictimización.';
    }
    return 'Revisar el contexto del escenario y la justificación clínica de la decisión.';
  }

  timelineFeedback(entry: AttemptTimelineEntry): string {
    if (entry.prohibited) {
      return 'Evento marcado como contraindicado en el recorrido del estudiante.';
    }
    if (entry.classification === 'ADEQUATE') {
      return 'Paso adecuado dentro del recorrido clínico simulado.';
    }
    if (entry.classification === 'RISKY') {
      return 'Momento del recorrido que conviene analizar con el estudiante en supervisión.';
    }
    if (entry.classification === 'INADEQUATE') {
      return 'Punto crítico del recorrido para orientar mejora formativa.';
    }
    if ((entry.type ?? '').toUpperCase() === 'TOOL_USED') {
      return 'Uso de recurso o herramienta durante la simulación.';
    }
    if ((entry.type ?? '').toUpperCase() === 'SAFE_EXIT_REQUESTED') {
      return 'El estudiante activó salida segura; no implica penalización automática.';
    }
    return 'Evento relevante dentro del recorrido del intento.';
  }

  private allDecisionEvents(item: AttemptTrace): TraceEvent[] {
    return item.events.filter(event => this.isDecisionEvent(event));
  }

  private buildFeedbackPanel(key: SummaryFeedbackKey, item: AttemptTrace): FeedbackPanelView {
    const empty = {
      decisions: [] as TraceEvent[],
      timeline: [] as AttemptTimelineEntry[],
      reflections: [] as ReflectionTrace[],
      evaluations: [] as RubricSummary[],
      missingNodes: [] as string[],
    };

    if (key === 'TOTAL') {
      const decisions = this.allDecisionEvents(item);
      return {
        key,
        title: 'Todas las decisiones del intento',
        intro: 'Resumen completo de las elecciones registradas y su clasificación formativa.',
        ...empty,
        decisions,
        emptyTitle: 'Sin decisiones registradas',
        emptyMessage: 'Este intento aún no tiene decisiones clínicas guardadas.',
      };
    }

    if (key === 'ADEQUATE' || key === 'RISKY' || key === 'INADEQUATE') {
      const labels = {
        ADEQUATE: {
          title: 'Decisiones adecuadas',
          intro: 'Elecciones alineadas con buenas prácticas. Refuerza estos aciertos en tu retroalimentación.',
        },
        RISKY: {
          title: 'Decisiones riesgosas',
          intro: 'Elecciones que requieren revisión formativa por posible impacto en riesgo o estrés.',
        },
        INADEQUATE: {
          title: 'Decisiones inadecuadas',
          intro: 'Elecciones que conviene contrastar con alternativas más pertinentes en sesión docente.',
        },
      }[key];
      const decisions = this.decisionsByClassification(item, key);
      return {
        key,
        title: labels.title,
        intro: labels.intro,
        ...empty,
        decisions,
        emptyTitle: 'Sin decisiones en esta categoría',
        emptyMessage: 'El estudiante no registró decisiones clasificadas así en este intento.',
      };
    }

    if (key === 'REFLECTIONS') {
      return {
        key,
        title: 'Bitácoras y reflexiones',
        intro: 'Textos reflexivos que el estudiante guardó durante el caso (descifrados para revisión docente).',
        ...empty,
        reflections: item.reflections,
        missingNodes: this.nodesWithoutReflection(item),
        emptyTitle: 'Sin reflexiones registradas',
        emptyMessage: 'La bitácora es opcional por escenario. Puedes evaluar con la trazabilidad de decisiones y la rúbrica.',
      };
    }

    if (key === 'EVALUATION') {
      return {
        key,
        title: 'Evaluación docente',
        intro: item.rubricEvaluations.length
          ? 'Evaluaciones de rúbrica ya aplicadas a este intento.'
          : 'Aún no hay evaluación guardada. Completa la rúbrica al final de esta pantalla.',
        ...empty,
        evaluations: item.rubricEvaluations,
        emptyTitle: 'Evaluación pendiente',
        emptyMessage: 'Usa la sección de rúbrica más abajo para registrar puntajes y retroalimentación formativa.',
      };
    }

    if (key === 'TIME') {
      return {
        key,
        title: 'Tiempo del intento',
        intro: `Duración registrada: ${this.formatDuration(item.totalDurationSeconds)}. Inicio ${this.formatDate(item.startedAt)}${item.endedAt ? ` · Cierre ${this.formatDate(item.endedAt)}` : ' · Intento aún en curso'}.`,
        ...empty,
        emptyTitle: 'Sin duración calculada',
        emptyMessage: 'No hay suficientes eventos para estimar el tiempo del intento.',
      };
    }

    return {
      key,
      title: 'Recorrido del estudiante',
      intro: 'Línea de tiempo de decisiones, herramientas y eventos clave durante la simulación.',
      ...empty,
      timeline: this.timelineEntries(item),
      emptyTitle: 'Sin eventos en el recorrido',
      emptyMessage: 'No hay eventos registrados para reconstruir la línea de tiempo.',
    };
  }

  timelineEntries(item: AttemptTrace): AttemptTimelineEntry[] {
    if (item.timeline?.length) {
      return item.timeline;
    }
    return this.buildTimelineFallback(item);
  }

  nodesWithoutReflection(item: AttemptTrace): string[] {
    const reflected = new Set(item.reflections.map(reflection => this.clean(reflection.nodeTitle, '')));
    const visited = item.visitedNodeTitles?.length
      ? item.visitedNodeTitles
      : item.events
          .filter(event => (event.type ?? '').toUpperCase() === 'NODE_ENTERED' && event.nodeTitle)
          .map(event => this.clean(event.nodeTitle, ''))
          .filter((title, index, titles) => title && titles.indexOf(title) === index);
    return visited.filter(title => title && !reflected.has(title));
  }

  timelineEntryClass(entry: AttemptTimelineEntry): string {
    if (entry.prohibited) return 'trace-event-card--inadequate';
    const normalized = (entry.classification ?? '').toUpperCase();
    if (normalized === 'ADEQUATE') return 'trace-event-card--adequate';
    if (normalized === 'RISKY') return 'trace-event-card--risky';
    if (normalized === 'INADEQUATE') return 'trace-event-card--inadequate';
    return '';
  }

  timelineEntryLabel(entry: AttemptTimelineEntry): string {
    if (entry.prohibited) return 'Contraindicada';
    if (entry.classification) return this.classificationLabel(entry.classification);
    return this.classificationLabel(entry.type);
  }

  timelineIcon(entry: AttemptTimelineEntry): string {
    return this.iconFor(entry.type);
  }

  private isDecisionEvent(event: TraceEvent): boolean {
    const type = (event.type ?? '').toUpperCase();
    return type === 'DECISION_SELECTED' || type === 'PROHIBITED_DECISION_SELECTED';
  }

  private lockPageScroll() {
    if (typeof document === 'undefined') return;
    this.scrollLockY = window.scrollY;
    document.documentElement.classList.add('siep-scroll-locked');
    document.body.classList.add('siep-scroll-locked');
    document.body.style.top = `-${this.scrollLockY}px`;
  }

  private unlockPageScroll() {
    if (typeof document === 'undefined') return;
    if (!document.body.classList.contains('siep-scroll-locked')) return;
    document.documentElement.classList.remove('siep-scroll-locked');
    document.body.classList.remove('siep-scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollLockY);
  }

  private buildTimelineFallback(item: AttemptTrace): AttemptTimelineEntry[] {
    const allowed = new Set([
      'DECISION_SELECTED',
      'PROHIBITED_DECISION_SELECTED',
      'DECISION_RETRY_REQUIRED',
      'PROHIBITED_DECISION_RETRY_REQUIRED',
      'TOOL_USED',
      'ROOM_ENTERED',
      'SAFE_EXIT_REQUESTED',
    ]);
    const start = item.startedAt ? new Date(item.startedAt).getTime() : null;
    return item.events
      .filter(event => allowed.has((event.type ?? '').toUpperCase()))
      .map(event => {
        const occurred = event.occurredAt ? new Date(event.occurredAt).getTime() : null;
        const atSeconds = start && occurred ? Math.max(0, Math.floor((occurred - start) / 1000)) : null;
        const minutes = atSeconds === null ? 0 : Math.floor(atSeconds / 60);
        const seconds = atSeconds === null ? 0 : atSeconds % 60;
        const prohibited = (event.type ?? '').toUpperCase() === 'PROHIBITED_DECISION_SELECTED';
        return {
          atSeconds,
          time: atSeconds === null ? '--:--' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          type: event.type,
          classification: (event.classification as AttemptTimelineEntry['classification']) ?? null,
          prohibited,
          label: this.clean(event.decisionText || event.detail || event.nodeTitle, 'Evento registrado'),
          scoreDelta: event.scoreDelta,
          stressDelta: event.stressDelta,
        };
      });
  }

  rubricTotal(rubric: RubricEvaluationView): string {
    const total = rubric.criteria.reduce((sum, criterion) => sum + Number(this.rubricScores[criterion.id] ?? 0), 0);
    const max = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0);
    return `${total}/${max}`;
  }

  signed(value: number): string {
    if (value > 0) return `+${value}`;
    return `${value}`;
  }

  scoreId(criterion: RubricCriterionView): string {
    return `criterion-score-${criterion.id}`;
  }

  commentId(criterion: RubricCriterionView): string {
    return `criterion-comment-${criterion.id}`;
  }

  hintId(criterion: RubricCriterionView): string {
    return `criterion-hint-${criterion.id}`;
  }

  errorId(criterion: RubricCriterionView): string {
    return `criterion-error-${criterion.id}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return 'No disponible';
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  }

  clean(value: string | null | undefined, fallback: string): string {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return fallback;
    return text;
  }

  private loadAttempts() {
    this.loading.set(true);
    this.error.set('');
    this.simulationService.recentAttempts().subscribe({
      next: attempts => {
        this.attempts.set(attempts);
        this.loading.set(false);
        if (attempts.length && !this.trace()) {
          this.open(attempts[0]);
        }
      },
      error: () => {
        this.error.set('No hay una respuesta válida del servidor. Intenta nuevamente o verifica tus permisos.');
        this.loading.set(false);
      }
    });
  }

  private loadRubric(attemptId: string) {
    this.simulationService.rubric(attemptId).subscribe({
      next: rubric => {
        this.rubric.set(rubric);
        this.seedRubricForm(rubric);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.rubric.set(null);
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.rubricMessage.set('Este caso aún no tiene rúbrica configurada. La trazabilidad sigue disponible abajo.');
          this.rubricMessageIsError.set(false);
        } else {
          this.rubricMessage.set('No fue posible cargar la rúbrica de evaluación.');
          this.rubricMessageIsError.set(true);
        }
        this.loading.set(false);
      }
    });
  }

  private refreshTrace(attemptId: string) {
    this.simulationService.attemptTrace(attemptId).subscribe({
      next: trace => this.trace.set(trace),
      error: () => undefined
    });
  }

  private seedRubricForm(rubric: RubricEvaluationView) {
    this.rubricScores = Object.fromEntries(
      rubric.criteria.map(item => [item.id, rubric.scores.find(score => score.criterionId === item.id)?.score ?? 0])
    );
    this.rubricComments = Object.fromEntries(
      rubric.criteria.map(item => [item.id, rubric.scores.find(score => score.criterionId === item.id)?.comment ?? ''])
    );
    this.rubricComment = rubric.comment ?? '';
  }

  private validateRubricScores(rubric: RubricEvaluationView): boolean {
    const errors: Record<number, string> = {};
    for (const criterion of rubric.criteria) {
      const score = Number(this.rubricScores[criterion.id] ?? 0);
      if (Number.isNaN(score)) {
        errors[criterion.id] = `Debe ser un número entre 0 y ${criterion.maxScore}.`;
      } else if (score < 0 || score > criterion.maxScore) {
        errors[criterion.id] = `Debe estar entre 0 y ${criterion.maxScore}.`;
      }
    }
    this.rubricValidationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }
}
