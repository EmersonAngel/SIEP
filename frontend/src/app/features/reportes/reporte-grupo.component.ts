import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Grupo, GrupoService } from '../../core/api/grupo.service';
import { ReporteService } from '../../core/api/reporte.service';
import { SimulationService } from '../../core/api/simulation.service';
import { ReporteGrupo, ReporteSimulacionGrupo } from '../../core/models/sesion.model';
import { SimulationCaseSummary } from '../../core/models/simulation.model';

@Component({
  selector: 'app-reporte-grupo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule
  ],
  template: `
    <section class="report-page psy-reveal">
      <header class="report-heading">
        <div>
          <p class="psy-eyebrow">Reportes académicos</p>
          <h1 class="page-title">Reportes por grupo</h1>
          <p class="page-subtitle">Consulta seguimiento, desempeño y trazabilidad de decisiones por cohorte y caso.</p>
        </div>
        <div class="heading-chip">
          <mat-icon aria-hidden="true">analytics</mat-icon>
          Vista administrativa
        </div>
      </header>

      <section class="summary-grid" aria-label="Resumen de reportes">
        <article class="summary-card">
          <mat-icon aria-hidden="true">groups</mat-icon>
          <div>
            <strong>{{ grupos().length }}</strong>
            <span>Grupos disponibles</span>
          </div>
        </article>
        <article class="summary-card">
          <mat-icon aria-hidden="true">psychology</mat-icon>
          <div>
            <strong>{{ casos().length }}</strong>
            <span>Casos publicados</span>
          </div>
        </article>
        <article class="summary-card">
          <mat-icon aria-hidden="true">school</mat-icon>
          <div>
            <strong>{{ selectedGroup()?.totalEstudiantes ?? 0 }}</strong>
            <span>Estudiantes del grupo</span>
          </div>
        </article>
        <article class="summary-card summary-card--accent">
          <mat-icon aria-hidden="true">download</mat-icon>
          <div>
            <strong>{{ reporte() ? 'Listo' : 'CSV' }}</strong>
            <span>{{ reporte() ? 'Reporte generado' : 'Exportable al generar' }}</span>
          </div>
        </article>
      </section>

      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filter-card__header">
            <div>
              <h2>Selecciona el corte de consulta</h2>
              <p>El caso es opcional. Si no eliges uno, el reporte consolida todo el grupo.</p>
            </div>
            @if (loadingFilters()) {
              <span class="loading-pill">
                <mat-icon aria-hidden="true">sync</mat-icon>
                Cargando filtros
              </span>
            }
          </div>

          <form [formGroup]="form" (ngSubmit)="generar()" class="filter-form">
            <mat-form-field appearance="outline">
              <mat-label>Grupo</mat-label>
              <mat-select formControlName="grupoId">
                @for (grupo of grupos(); track grupo.id) {
                  <mat-option [value]="grupo.id">{{ grupo.nombre }} · {{ grupo.codigo }}</mat-option>
                }
              </mat-select>
              <mat-hint>Selecciona la cohorte a consultar.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Caso de simulación</mat-label>
              <mat-select formControlName="caseVersionId">
                <mat-option [value]="null">Todos los casos asignados</mat-option>
                @for (caso of casos(); track caso.caseVersionId) {
                  <mat-option [value]="caso.caseVersionId">{{ caso.title }} · v{{ caso.semanticVersion }}</mat-option>
                }
              </mat-select>
              <mat-hint>Filtra por versión publicada cuando necesites detalle por caso.</mat-hint>
            </mat-form-field>

            <div class="filter-actions">
              <button class="psy-button psy-button--primary" type="submit" [disabled]="form.invalid || loading() || loadingFilters()">
                <mat-icon aria-hidden="true">{{ loading() ? 'hourglass_empty' : 'summarize' }}</mat-icon>
                {{ loading() ? 'Generando...' : 'Generar reporte' }}
              </button>
              <button class="psy-button psy-button--ghost" type="button" (click)="limpiar()" [disabled]="loading()">
                <mat-icon aria-hidden="true">refresh</mat-icon>
                Limpiar
              </button>
              <button class="psy-button psy-button--ghost" type="button" (click)="exportar()" *ngIf="reporte()" [disabled]="exporting()">
                <mat-icon aria-hidden="true">download</mat-icon>
                {{ exporting() ? 'Exportando...' : 'Exportar CSV' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (loadFiltersError()) {
        <div class="state-message state-message--error" role="alert">
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          <span>{{ loadFiltersError() }}</span>
          <button type="button" class="text-action" (click)="cargarFiltros()">Reintentar</button>
        </div>
      }

      @if (error()) {
        <div class="state-message state-message--error" role="alert">
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      }

      @if (message()) {
        <div class="state-message" role="status">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          <span>{{ message() }}</span>
        </div>
      }

      <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

      @if (!loading() && !reporte() && searched()) {
        <div class="empty-state">
          <mat-icon aria-hidden="true">info</mat-icon>
          <div>
            <strong>No hay reportes disponibles con los filtros actuales.</strong>
            <span>Prueba otro grupo, otro caso o genera el reporte consolidado.</span>
          </div>
        </div>
      }

      <ng-container *ngIf="reporte()">
        @if (reporte()!.simulacion; as sim) {
          <section class="report-result">
            <div class="result-header">
              <div>
                <p class="psy-eyebrow">Resultado generado</p>
                <h2>{{ selectedGroup()?.nombre || 'Grupo seleccionado' }}</h2>
                <p>{{ selectedCase()?.title || 'Todos los casos asignados' }}</p>
              </div>
              <div class="result-meta">
                <span>{{ sim.estudiantes.length }} estudiantes con datos</span>
                <span>{{ completionRate(sim) | number:'1.0-0' }}% completado</span>
              </div>
            </div>

            <div class="stats-grid">
              <article class="stat-card">
                <span>Intentos</span>
                <strong>{{ sim.totalIntentos }}</strong>
                <small>{{ sim.intentosCompletados }} completados · {{ sim.intentosEnProgreso }} en progreso</small>
              </article>
              <article class="stat-card">
                <span>Puntaje promedio</span>
                <strong>{{ sim.puntajePromedio | number:'1.0-1' }}</strong>
                <small>Desempeño profesional del grupo</small>
              </article>
              <article class="stat-card">
                <span>Decisiones adecuadas</span>
                <strong>{{ sim.decisionesAdecuadas }}</strong>
                <small>{{ sim.decisionesRiesgosas }} riesgosas · {{ sim.decisionesInadecuadas }} inadecuadas</small>
              </article>
              <article class="stat-card">
                <span>Bitácoras</span>
                <strong>{{ sim.bitacorasRegistradas }}</strong>
                <small>{{ sim.rubricasAplicadas }} rúbricas aplicadas</small>
              </article>
            </div>

            <div class="quality-grid">
              <article class="quality-card">
                <div class="quality-card__title">
                  <mat-icon aria-hidden="true">task_alt</mat-icon>
                  Finalización de intentos
                </div>
                <div class="meter"><span [style.width.%]="completionRate(sim)"></span></div>
                <p>{{ sim.intentosCompletados }} de {{ sim.totalIntentos }} intentos completados.</p>
              </article>
              <article class="quality-card">
                <div class="quality-card__title">
                  <mat-icon aria-hidden="true">verified_user</mat-icon>
                  Salida segura
                </div>
                <div class="meter meter--safe"><span [style.width.%]="safeExitRate(sim)"></span></div>
                <p>{{ sim.intentosSalidaSegura }} intentos usaron salida segura.</p>
              </article>
            </div>

            <mat-card class="students-card">
              <mat-card-header>
                <mat-card-title>Simulación por estudiante</mat-card-title>
                <mat-card-subtitle>Detalle operativo para seguimiento docente y administrativo.</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (!sim.estudiantes.length) {
                  <p class="empty-state empty-state--inline">No hay datos de estudiantes para este reporte.</p>
                } @else {
                  <div class="table-wrap">
                    <table mat-table [dataSource]="sim.estudiantes" class="full-width report-table">
                      <ng-container matColumnDef="nombre">
                        <th mat-header-cell *matHeaderCellDef>Estudiante</th>
                        <td mat-cell *matCellDef="let e"><strong>{{ e.nombre }}</strong></td>
                      </ng-container>
                      <ng-container matColumnDef="intentos">
                        <th mat-header-cell *matHeaderCellDef>Intentos</th>
                        <td mat-cell *matCellDef="let e">{{ e.totalIntentos }}</td>
                      </ng-container>
                      <ng-container matColumnDef="puntaje">
                        <th mat-header-cell *matHeaderCellDef>Puntaje prom.</th>
                        <td mat-cell *matCellDef="let e">{{ e.puntajePromedio | number:'1.0-1' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="adecuadas">
                        <th mat-header-cell *matHeaderCellDef>Adecuadas</th>
                        <td mat-cell *matCellDef="let e">{{ e.decisionesAdecuadas }}</td>
                      </ng-container>
                      <ng-container matColumnDef="bitacoras">
                        <th mat-header-cell *matHeaderCellDef>Bitácoras</th>
                        <td mat-cell *matCellDef="let e">{{ e.bitacorasRegistradas }}</td>
                      </ng-container>
                      <ng-container matColumnDef="estado">
                        <th mat-header-cell *matHeaderCellDef>Estado</th>
                        <td mat-cell *matCellDef="let e">
                          <mat-chip highlighted [class]="estadoClass(e.estado)">{{ estadoLabel(e.estado) }}</mat-chip>
                        </td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="simCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: simCols;"></tr>
                    </table>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </section>
        }
      </ng-container>
    </section>
  `,
  styles: [`
    .report-page { display: grid; gap: 22px; }
    .report-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }
    .report-heading p { margin: 0; }
    .page-subtitle { color: var(--psy-muted); line-height: 1.55; max-width: 760px; }
    .page-title {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      color: var(--siep-blue);
      margin: 0;
      letter-spacing: 0;
    }
    .heading-chip,
    .loading-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(0, 82, 128, .16);
      border-radius: 999px;
      padding: 10px 14px;
      color: var(--siep-blue);
      background: #fff;
      font-weight: 800;
      white-space: nowrap;
    }
    .heading-chip mat-icon,
    .loading-pill mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 96px;
      padding: 18px;
      border: 1px solid rgba(0, 82, 128, .13);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 16px 32px rgba(28, 49, 82, .06);
    }
    .summary-card mat-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 8px;
      color: var(--siep-blue);
      background: rgba(0, 82, 128, .08);
      flex: 0 0 auto;
    }
    .summary-card strong {
      display: block;
      font-size: 1.55rem;
      line-height: 1;
      color: var(--siep-blue);
    }
    .summary-card span {
      display: block;
      margin-top: 6px;
      color: var(--psy-muted);
      font-weight: 700;
    }
    .summary-card--accent {
      background: linear-gradient(135deg, #005280, #2764c7);
      color: #fff;
    }
    .summary-card--accent mat-icon {
      color: #fff;
      background: rgba(255,255,255,.18);
    }
    .summary-card--accent strong,
    .summary-card--accent span { color: #fff; }
    .filter-card {
      margin-bottom: 0;
      border: 1px solid rgba(0, 82, 128, .13);
      border-radius: 8px;
      background: var(--siep-surface);
      box-shadow: 0 18px 45px rgba(28, 49, 82, .08);
    }
    .filter-card__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .filter-card__header h2 {
      margin: 0;
      color: var(--psy-ink);
      font-size: 1.25rem;
    }
    .filter-card__header p {
      margin: 5px 0 0;
      color: var(--psy-muted);
    }
    .filter-form {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(260px, 1.3fr) auto;
      gap: 14px;
      align-items: flex-start;
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 8px;
    }
    .filter-actions .psy-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 48px;
      white-space: nowrap;
    }
    .filter-actions mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .report-result { display: grid; gap: 18px; }
    .result-header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 22px;
      border-radius: 8px;
      background: #fff;
      border: 1px solid rgba(0, 82, 128, .13);
    }
    .result-header h2 {
      margin: 0;
      color: var(--siep-blue);
      font-size: clamp(1.35rem, 2vw, 1.9rem);
    }
    .result-header p:not(.psy-eyebrow) {
      margin: 6px 0 0;
      color: var(--psy-muted);
      font-weight: 700;
    }
    .result-meta {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .result-meta span {
      border-radius: 999px;
      padding: 9px 12px;
      background: rgba(0, 82, 128, .08);
      color: var(--siep-blue);
      font-weight: 800;
      white-space: nowrap;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 0;
    }
    .stat-card {
      display: grid;
      gap: 8px;
      min-height: 128px;
      padding: 18px;
      border: 1px solid rgba(0, 82, 128, .13);
      border-left: 4px solid var(--siep-blue);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 14px 28px rgba(28, 49, 82, .06);
    }
    .stat-card span,
    .stat-card small {
      color: var(--psy-muted);
      font-weight: 700;
    }
    .stat-card strong {
      font-size: 2rem;
      line-height: 1;
      color: var(--siep-blue);
    }
    .quality-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .quality-card {
      display: grid;
      gap: 12px;
      padding: 18px;
      border: 1px solid rgba(0, 82, 128, .13);
      border-radius: 8px;
      background: #fff;
    }
    .quality-card__title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--siep-blue);
      font-weight: 900;
    }
    .quality-card p { margin: 0; color: var(--psy-muted); font-weight: 700; }
    .meter {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(0, 82, 128, .1);
    }
    .meter span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #005280, #4d75d6);
    }
    .meter--safe span { background: linear-gradient(90deg, #2f7d52, #62b982); }
    .students-card {
      border: 1px solid rgba(0, 82, 128, .13);
      border-radius: 8px;
      background: #fff;
    }
    .full-width { width: 100%; }
    .table-wrap { overflow-x: auto; }
    .report-table th {
      color: var(--siep-blue);
      font-weight: 900;
      background: rgba(0, 82, 128, .04);
    }
    .report-table td strong { color: var(--psy-ink); }
    mat-chip.estado-completed,
    mat-chip.estado-safe {
      --mdc-chip-label-text-color: #236344;
      background: rgba(66, 141, 101, .14);
    }
    mat-chip.estado-progress {
      --mdc-chip-label-text-color: #7a4c00;
      background: rgba(245, 184, 75, .2);
    }
    mat-chip.estado-default {
      --mdc-chip-label-text-color: var(--siep-blue);
      background: rgba(0, 82, 128, .1);
    }
    .state-message {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      padding: 13px 16px;
      border-radius: 8px;
      color: var(--psy-green-deep);
      background: rgba(66, 141, 101, .1);
      font-weight: 800;
    }
    .state-message--error { color: #8f2f3d; background: rgba(143, 47, 61, .1); }
    .state-message mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .text-action {
      margin-left: auto;
      border: 0;
      background: transparent;
      color: inherit;
      font-weight: 900;
      cursor: pointer;
      text-decoration: underline;
    }
    .empty-state {
      display: flex;
      gap: 12px;
      margin: 0;
      padding: 18px;
      border: 1px dashed rgba(0, 82, 128, .22);
      border-radius: 8px;
      color: var(--psy-muted);
      background: rgba(0, 82, 128, .04);
      font-weight: 700;
    }
    .empty-state strong,
    .empty-state span { display: block; }
    .empty-state mat-icon { color: var(--siep-blue); }
    .empty-state--inline { margin-top: 8px; }
    @media (max-width: 1180px) {
      .summary-grid,
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .filter-form { grid-template-columns: 1fr; }
      .filter-actions { padding-top: 0; }
    }
    @media (max-width: 760px) {
      .report-heading,
      .filter-card__header,
      .result-header { flex-direction: column; }
      .result-meta { justify-content: flex-start; }
      .quality-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .summary-grid,
      .stats-grid { grid-template-columns: 1fr; }
      .filter-actions .psy-button { width: 100%; }
      .heading-chip { width: fit-content; }
    }
  `]
})
export class ReporteGrupoComponent {
  private readonly reporteService = inject(ReporteService);
  private readonly grupoService = inject(GrupoService);
  private readonly simulationService = inject(SimulationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    grupoId: [null as number | null, Validators.required],
    caseVersionId: [null as number | null]
  });

  readonly grupos = signal<Grupo[]>([]);
  readonly casos = signal<SimulationCaseSummary[]>([]);
  readonly reporte = signal<ReporteGrupo | null>(null);
  readonly loadingFilters = signal(false);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly searched = signal(false);
  readonly selectedGrupoId = signal<number | null>(null);
  readonly selectedCaseVersionId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly loadFiltersError = signal('');
  readonly simCols = ['nombre', 'intentos', 'puntaje', 'adecuadas', 'bitacoras', 'estado'];

  readonly selectedGroup = computed(() => {
    const grupoId = this.selectedGrupoId();
    return this.grupos().find(grupo => grupo.id === grupoId) ?? null;
  });

  readonly selectedCase = computed(() => {
    const caseVersionId = this.selectedCaseVersionId();
    return this.casos().find(caso => caso.caseVersionId === caseVersionId) ?? null;
  });

  constructor() {
    this.cargarFiltros();
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const { grupoId, caseVersionId } = this.form.getRawValue();
      this.selectedGrupoId.set(grupoId);
      this.selectedCaseVersionId.set(caseVersionId);
      this.reporte.set(null);
      this.error.set('');
      this.message.set('');
      this.searched.set(false);
    });
  }

  cargarFiltros() {
    this.loadingFilters.set(true);
    this.loadFiltersError.set('');
    this.grupoService.listar().subscribe({
      next: grupos => {
        this.grupos.set(grupos);
        this.loadingFilters.set(false);
      },
      error: () => {
        this.loadFiltersError.set('No fue posible cargar los grupos. Revisa la sesión o intenta de nuevo.');
        this.loadingFilters.set(false);
      }
    });
    this.simulationService.listCases().subscribe({
      next: casos => this.casos.set(casos),
      error: () => this.loadFiltersError.update(msg => msg || 'No fue posible cargar los casos de simulación.')
    });
  }

  limpiar() {
    this.form.reset({ grupoId: null, caseVersionId: null });
    this.selectedGrupoId.set(null);
    this.selectedCaseVersionId.set(null);
    this.reporte.set(null);
    this.error.set('');
    this.message.set('');
    this.searched.set(false);
  }

  generar() {
    const { grupoId, caseVersionId } = this.form.getRawValue();
    if (grupoId == null) {
      this.error.set('Selecciona un grupo para generar el reporte.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.searched.set(true);
    this.reporteService.getReporteGrupo(grupoId, caseVersionId).subscribe({
      next: reporte => {
        this.reporte.set(reporte);
        this.loading.set(false);
        if (!reporte.simulacion) {
          this.message.set('No hay reportes disponibles con los filtros actuales.');
        }
      },
      error: () => {
        this.error.set('No fue posible cargar la información del reporte.');
        this.loading.set(false);
      }
    });
  }

  exportar() {
    const { grupoId, caseVersionId } = this.form.getRawValue();
    if (grupoId == null) return;
    this.exporting.set(true);
    this.error.set('');
    this.reporteService.exportarCsv(grupoId, caseVersionId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${this.selectedGroup()?.codigo || grupoId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.message.set('El archivo CSV se descargó correctamente.');
        this.exporting.set(false);
      },
      error: () => {
        this.error.set('No fue posible exportar el reporte.');
        this.exporting.set(false);
      }
    });
  }

  completionRate(sim: ReporteSimulacionGrupo) {
    if (!sim.totalIntentos) return 0;
    return Math.min(100, Math.round((sim.intentosCompletados / sim.totalIntentos) * 100));
  }

  safeExitRate(sim: ReporteSimulacionGrupo) {
    if (!sim.totalIntentos) return 0;
    return Math.min(100, Math.round((sim.intentosSalidaSegura / sim.totalIntentos) * 100));
  }

  estadoLabel(estado: string) {
    const normalized = estado.toUpperCase();
    if (normalized === 'COMPLETED') return 'Completado';
    if (normalized === 'SAFE_EXITED') return 'Salida segura';
    if (normalized === 'IN_PROGRESS') return 'En progreso';
    return estado;
  }

  estadoClass(estado: string) {
    const normalized = estado.toUpperCase();
    if (normalized === 'COMPLETED') return 'estado-completed';
    if (normalized === 'SAFE_EXITED') return 'estado-safe';
    if (normalized === 'IN_PROGRESS') return 'estado-progress';
    return 'estado-default';
  }
}
