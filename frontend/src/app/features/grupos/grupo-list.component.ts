import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GrupoService, Grupo, GrupoEstudiante } from '../../core/api/grupo.service';
import { mapAgregarEstudianteError } from '../../core/api/grupo-error.utils';
import { SimulationService } from '../../core/api/simulation.service';
import { SimulationCaseSummary } from '../../core/models/simulation.model';

@Component({
  selector: 'app-grupo-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule, MatProgressBarModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">Grupos</h1>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    @if (error()) {
      <p class="state-message state-message--error" role="alert">{{ error() }}</p>
    }

    <div class="layout">
      <!-- Formulario nuevo grupo -->
      <mat-card class="form-card">
        <mat-card-header><mat-card-title>Nuevo grupo</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="crear()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre del grupo</mat-label>
              <input matInput formControlName="nombre">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Código único</mat-label>
              <input matInput formControlName="codigo">
            </mat-form-field>
            <button class="psy-button psy-button--primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Creando…' : 'Crear grupo' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Lista de grupos -->
      <mat-card class="table-card">
        <mat-card-content>
          @if (!loading() && !grupos().length) {
            <p class="empty-state">No hay grupos registrados.</p>
          } @else {
          <table mat-table [dataSource]="grupos()" class="full-width">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let g">{{ g.nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="codigo">
              <th mat-header-cell *matHeaderCellDef>Código</th>
              <td mat-cell *matCellDef="let g"><code>{{ g.codigo }}</code></td>
            </ng-container>
            <ng-container matColumnDef="estudiantes">
              <th mat-header-cell *matHeaderCellDef>Estudiantes</th>
              <td mat-cell *matCellDef="let g">{{ g.totalEstudiantes }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let g">
                <button mat-stroked-button type="button" (click)="gestionarGrupo(g)" aria-label="Ver estudiantes y casos del grupo">
                  <mat-icon>visibility</mat-icon> Gestionar
                </button>
                <button mat-stroked-button type="button" (click)="agregarEstudiante(g)" aria-label="Agregar estudiante al grupo">
                  <mat-icon>person_add</mat-icon> Agregar
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
          }
        </mat-card-content>
      </mat-card>
    </div>

    @if (grupoActivo(); as grupo) {
      <mat-card class="grupo-detalle">
        <mat-card-header>
          <mat-card-title>{{ grupo.nombre }} · estudiantes y casos</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (detailLoading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }

          <div class="detalle-grid">
            <section>
              <h3>Estudiantes del grupo</h3>
              @if (!estudiantes().length) {
                <p class="empty-state">Este grupo aun no tiene estudiantes.</p>
              } @else {
                <div class="detalle-list">
                  @for (student of estudiantes(); track student.id) {
                    <div class="detalle-row">
                      <mat-icon>school</mat-icon>
                      <div>
                        <strong>{{ student.nombre }} {{ student.apellido }}</strong>
                        <span>{{ student.email }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            <section>
              <h3>Casos asignados</h3>
              <form [formGroup]="casoForm" (ngSubmit)="asignarCaso()" class="case-assign-form">
                <mat-form-field appearance="outline">
                  <mat-label>Asignar caso publicado</mat-label>
                  <select matNativeControl formControlName="caseVersionId">
                    <option value="">Selecciona un caso</option>
                    @for (caseItem of casosDisponibles(); track caseItem.caseVersionId) {
                      <option [value]="caseItem.caseVersionId">{{ caseItem.title }} · v{{ caseItem.semanticVersion }}</option>
                    }
                  </select>
                </mat-form-field>
                <button class="psy-button psy-button--primary" type="submit" [disabled]="casoForm.invalid || asignandoCaso()">
                  <mat-icon>assignment_add</mat-icon>
                  Asignar
                </button>
              </form>

              @if (!casosAsignados().length) {
                <p class="empty-state">No hay casos asignados. Los estudiantes no verán casos hasta que asignes uno.</p>
              } @else {
                <div class="detalle-list">
                  @for (caseItem of casosAsignados(); track caseItem.caseVersionId) {
                    <div class="detalle-row detalle-row--case">
                      <mat-icon>psychology</mat-icon>
                      <div>
                        <strong>{{ caseItem.title }}</strong>
                        <span>{{ caseItem.code }} · v{{ caseItem.semanticVersion }}</span>
                      </div>
                      <button mat-icon-button type="button" aria-label="Retirar caso del grupo" (click)="quitarCaso(caseItem.caseVersionId)">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </section>
          </div>
        </mat-card-content>
      </mat-card>
    }

    <!-- Input agregar estudiante -->
    <div *ngIf="grupoSeleccionado()" class="agregar-estudiante">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Agregar estudiante al grupo</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="estudianteForm" (ngSubmit)="confirmarAgregar()">
            <mat-form-field appearance="outline">
              <mat-label>Email del estudiante</mat-label>
              <input matInput formControlName="email" type="email">
            </mat-form-field>
            <button class="psy-button psy-button--primary" type="submit" [disabled]="estudianteForm.invalid || agregandoEstudiante()">
              {{ agregandoEstudiante() ? 'Agregando…' : 'Agregar' }}
            </button>
            <button class="psy-button psy-button--ghost" type="button" (click)="grupoSeleccionado.set(null)">
              Cancelar
            </button>
          </form>
          @if (mensajeEstudiante()) {
            <p class="mensaje" [class.mensaje--error]="mensajeEsError()">{{ mensajeEstudiante() }}</p>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; margin-bottom: 24px; }
    .page-title { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: var(--siep-blue); margin: 0; letter-spacing: 0; }
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
    .full-width { width: 100%; }
    .grupo-detalle { margin-top: 16px; }
    .detalle-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 18px; align-items: start; }
    .detalle-grid h3 { margin: 0 0 10px; color: var(--psy-ink); font-size: 1rem; letter-spacing: 0; }
    .detalle-list { display: grid; gap: 8px; }
    .detalle-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border: 1px solid rgba(0, 72, 118, .12);
      border-radius: 8px;
      background: rgba(255,255,255,.74);
    }
    .detalle-row div { display: grid; gap: 2px; min-width: 0; }
    .detalle-row strong { color: var(--psy-ink); font-size: .9rem; }
    .detalle-row span { color: var(--psy-muted); font-size: .78rem; overflow-wrap: anywhere; }
    .detalle-row mat-icon { color: var(--psy-blue-deep); }
    .detalle-row--case { align-items: center; }
    .detalle-row--case button { margin-left: auto; flex: 0 0 auto; }
    .case-assign-form { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 10px; }
    .case-assign-form mat-form-field { flex: 1 1 260px; }
    .agregar-estudiante { margin-top: 16px; }
    .agregar-estudiante form { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .state-message { margin: 0 0 12px; padding: 12px 14px; border-radius: 12px; color: #8f2f3d; background: rgba(143, 47, 61, .1); font-weight: 700; }
    .empty-state { margin: 16px 0; color: var(--psy-muted); font-weight: 700; }
    .mensaje { color: var(--psy-green-deep); font-size: .88rem; font-weight: 700; }
    .mensaje--error { color: #8f2f3d; }
    @media (max-width: 920px) { .layout, .detalle-grid { grid-template-columns: 1fr; } }
    @media (max-width: 560px) {
      form .psy-button, .agregar-estudiante .psy-button { width: 100%; }
    }
  `]
})
export class GrupoListComponent implements OnInit {
  private grupoService = inject(GrupoService);
  private simulationService = inject(SimulationService);
  private fb = inject(FormBuilder);

  grupos = signal<Grupo[]>([]);
  grupoActivo = signal<Grupo | null>(null);
  grupoSeleccionado = signal<number | null>(null);
  estudiantes = signal<GrupoEstudiante[]>([]);
  casosDisponibles = signal<SimulationCaseSummary[]>([]);
  casosAsignados = signal<SimulationCaseSummary[]>([]);
  mensajeEstudiante = signal('');
  mensajeEsError = signal(false);
  loading = signal(true);
  detailLoading = signal(false);
  saving = signal(false);
  agregandoEstudiante = signal(false);
  asignandoCaso = signal(false);
  error = signal('');
  cols = ['nombre', 'codigo', 'estudiantes', 'acciones'];

  form = this.fb.group({ nombre: ['', Validators.required], codigo: ['', Validators.required] });
  estudianteForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  casoForm = this.fb.group({ caseVersionId: ['', Validators.required] });

  ngOnInit() {
    this.cargar();
    this.simulationService.listCases().subscribe({
      next: cases => this.casosDisponibles.set(cases),
      error: () => this.casosDisponibles.set([])
    });
  }

  cargar() {
    this.loading.set(true);
    this.error.set('');
    this.grupoService.listar().subscribe({
      next: g => {
        this.grupos.set(g);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar la información.');
        this.loading.set(false);
      }
    });
  }

  crear() {
    if (this.form.invalid || this.saving()) return;
    const { nombre, codigo } = this.form.value;
    this.saving.set(true);
    this.grupoService.crear(nombre!, codigo!).subscribe({
      next: g => {
        this.grupos.update(list => [...list, g]);
        this.form.reset();
        this.saving.set(false);
      },
      error: () => {
        this.error.set('No fue posible crear el grupo.');
        this.saving.set(false);
      }
    });
  }

  gestionarGrupo(grupo: Grupo) {
    this.grupoActivo.set(grupo);
    this.grupoSeleccionado.set(null);
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.cargarDetalle(grupo.id);
  }

  agregarEstudiante(grupo: Grupo) {
    this.grupoActivo.set(grupo);
    this.grupoSeleccionado.set(grupo.id);
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.estudianteForm.reset();
    this.cargarDetalle(grupo.id);
  }

  cargarDetalle(grupoId: number) {
    this.detailLoading.set(true);
    this.grupoService.listarEstudiantes(grupoId).subscribe({
      next: estudiantes => {
        this.estudiantes.set(estudiantes);
        this.detailLoading.set(false);
      },
      error: () => {
        this.estudiantes.set([]);
        this.detailLoading.set(false);
      }
    });
    this.grupoService.listarCasos(grupoId).subscribe({
      next: casos => this.casosAsignados.set(casos),
      error: () => this.casosAsignados.set([])
    });
  }

  confirmarAgregar() {
    if (this.estudianteForm.invalid || this.agregandoEstudiante()) {
      if (this.estudianteForm.invalid) {
        this.estudianteForm.markAllAsTouched();
        this.mensajeEstudiante.set('Revisa el correo del estudiante.');
        this.mensajeEsError.set(true);
      }
      return;
    }
    const { email } = this.estudianteForm.value;
    this.agregandoEstudiante.set(true);
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.grupoService.agregarEstudiante(this.grupoSeleccionado()!, email!.trim().toLowerCase()).subscribe({
      next: () => {
        this.mensajeEstudiante.set('Estudiante agregado correctamente.');
        this.mensajeEsError.set(false);
        this.estudianteForm.reset();
        this.agregandoEstudiante.set(false);
        this.cargar();
        this.cargarDetalle(this.grupoSeleccionado()!);
      },
      error: (err: HttpErrorResponse) => {
        this.mensajeEstudiante.set(mapAgregarEstudianteError(err));
        this.mensajeEsError.set(true);
        this.agregandoEstudiante.set(false);
      }
    });
  }

  asignarCaso() {
    const grupo = this.grupoActivo();
    if (!grupo || this.casoForm.invalid || this.asignandoCaso()) return;
    const caseVersionId = Number(this.casoForm.value.caseVersionId);
    this.asignandoCaso.set(true);
    this.grupoService.asignarCaso(grupo.id, caseVersionId).subscribe({
      next: casos => {
        this.casosAsignados.set(casos);
        this.casoForm.reset();
        this.asignandoCaso.set(false);
      },
      error: () => {
        this.mensajeEstudiante.set('No fue posible asignar el caso al grupo.');
        this.mensajeEsError.set(true);
        this.asignandoCaso.set(false);
      }
    });
  }

  quitarCaso(caseVersionId: number) {
    const grupo = this.grupoActivo();
    if (!grupo || this.asignandoCaso()) return;
    this.asignandoCaso.set(true);
    this.grupoService.quitarCaso(grupo.id, caseVersionId).subscribe({
      next: casos => {
        this.casosAsignados.set(casos);
        this.asignandoCaso.set(false);
      },
      error: () => {
        this.mensajeEstudiante.set('No fue posible retirar el caso del grupo.');
        this.mensajeEsError.set(true);
        this.asignandoCaso.set(false);
      }
    });
  }
}
