import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GrupoService, Grupo, GrupoEstudiante, GrupoImportError, GrupoImportResult, GrupoImportSpec } from '../../core/api/grupo.service';
import { mapAgregarEstudianteError } from '../../core/api/grupo-error.utils';
import { SimulationService } from '../../core/api/simulation.service';
import { SimulationCaseSummary } from '../../core/models/simulation.model';

@Component({
  selector: 'app-grupo-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule, MatProgressBarModule
  ],
  template: `
    <div class="page-header">
      <div>
        <p class="page-kicker">Cohortes académicas</p>
        <h1 class="page-title">Grupos</h1>
        <p class="page-subtitle">Organiza estudiantes, asigna casos publicados y prepara el acceso al simulador.</p>
      </div>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    @if (error()) {
      <p class="state-message state-message--error" role="alert">{{ error() }}</p>
    }

    <section class="summary-grid" aria-label="Resumen de grupos">
      <article class="summary-card">
        <mat-icon aria-hidden="true">groups</mat-icon>
        <div>
          <strong>{{ grupos().length }}</strong>
          <span>Grupos activos</span>
        </div>
      </article>
      <article class="summary-card">
        <mat-icon aria-hidden="true">school</mat-icon>
        <div>
          <strong>{{ totalEstudiantes() }}</strong>
          <span>Estudiantes asignados</span>
        </div>
      </article>
      <article class="summary-card">
        <mat-icon aria-hidden="true">psychology</mat-icon>
        <div>
          <strong>{{ casosDisponibles().length }}</strong>
          <span>Casos publicados</span>
        </div>
      </article>
      <article class="summary-card summary-card--active">
        <mat-icon aria-hidden="true">task_alt</mat-icon>
        <div>
          <strong>{{ grupoActivo()?.nombre || 'Selecciona un grupo' }}</strong>
          <span>Detalle operativo</span>
        </div>
      </article>
    </section>

    <div class="layout">
      <!-- Formulario nuevo grupo -->
      <mat-card class="form-card panel-card">
        <mat-card-header>
          <mat-card-title>Nuevo grupo</mat-card-title>
          <mat-card-subtitle>Crea una cohorte con nombre y código institucional.</mat-card-subtitle>
        </mat-card-header>
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
      <mat-card class="table-card panel-card">
        <mat-card-header>
          <mat-card-title>Grupos registrados</mat-card-title>
          <mat-card-subtitle>Busca una cohorte y abre su detalle para gestionar estudiantes y casos.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <label class="search-box">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input
              type="search"
              placeholder="Buscar por nombre o código"
              [value]="busquedaGrupo()"
              (input)="busquedaGrupo.set($any($event.target).value)"
            >
          </label>

          @if (!loading() && !grupos().length) {
            <p class="empty-state">No hay grupos registrados.</p>
          } @else if (!gruposFiltrados().length) {
            <p class="empty-state">No encontramos grupos con ese criterio.</p>
          } @else {
            <div class="group-list">
              @for (g of gruposFiltrados(); track g.id) {
                <article class="group-card" [class.group-card--active]="grupoActivo()?.id === g.id">
                  <button class="group-card__main" type="button" (click)="gestionarGrupo(g)">
                    <span class="group-card__icon" aria-hidden="true">
                      <mat-icon>groups</mat-icon>
                    </span>
                    <span class="group-card__body">
                      <strong>{{ g.nombre }}</strong>
                      <small>Código {{ g.codigo }}</small>
                    </span>
                    <span class="group-card__metric">
                      <strong>{{ g.totalEstudiantes }}</strong>
                      <small>estudiantes</small>
                    </span>
                  </button>
                  <div class="group-card__actions">
                    <button type="button" class="text-action" (click)="gestionarGrupo(g)">
                      <mat-icon aria-hidden="true">visibility</mat-icon>
                      Ver detalle
                    </button>
                    <button type="button" class="text-action" (click)="agregarEstudiante(g)">
                      <mat-icon aria-hidden="true">person_add</mat-icon>
                      Agregar
                    </button>
                    <button type="button" class="text-action" (click)="copiarCodigo(g)">
                      <mat-icon aria-hidden="true">content_copy</mat-icon>
                      Copiar código
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>

    @if (grupoActivo(); as grupo) {
      <mat-card class="grupo-detalle">
        <mat-card-header>
          <mat-card-title>{{ grupo.nombre }}</mat-card-title>
          <mat-card-subtitle>Código {{ grupo.codigo }} · {{ estudiantes().length }} estudiantes · {{ casosAsignados().length }} casos asignados</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (detailLoading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }

          <div class="detalle-grid">
            <section>
              <div class="section-heading">
                <div>
                  <h3>Estudiantes del grupo</h3>
                  <p>Importa una lista o agrega estudiantes individualmente.</p>
                </div>
                <button class="psy-button psy-button--ghost" type="button" (click)="agregarEstudiante(grupo)">
                  <mat-icon aria-hidden="true">person_add</mat-icon>
                  Agregar uno
                </button>
              </div>
              <div class="student-import">
                <div class="student-import__copy">
                  <strong>Cargar estudiantes por Excel</strong>
                  <span>Columnas requeridas: {{ columnasRequeridasTexto() }}. Opcionales: {{ columnasOpcionalesTexto() }}. También acepta formato institucional (N°, Nombres, Apellidos, Correo institucional, Contraseña temporal).</span>
                </div>
                <div class="student-import__actions">
                  <button class="psy-button psy-button--ghost" type="button" (click)="descargarPlantilla()">
                    <mat-icon aria-hidden="true">download</mat-icon>
                    Descargar plantilla Excel
                  </button>
                  <label class="file-picker">
                    <mat-icon aria-hidden="true">upload_file</mat-icon>
                    <span>{{ importFileName() || 'Seleccionar .xlsx' }}</span>
                    <input #importFileInput type="file" accept=".xlsx" (change)="seleccionarArchivoImportacion($event)">
                  </label>
                  <button class="psy-button psy-button--primary" type="button"
                    [disabled]="!archivoImportacion() || importandoEstudiantes()"
                    (click)="importarEstudiantes()">
                    <mat-icon aria-hidden="true">group_add</mat-icon>
                    {{ importandoEstudiantes() ? 'Cargando…' : 'Importar lista' }}
                  </button>
                </div>
              </div>
              @if (mensajeEstudiante()) {
                <p class="mensaje" [class.mensaje--error]="mensajeEsError()" role="status">{{ mensajeEstudiante() }}</p>
              }
              @if (resultadoImportacion(); as result) {
                <div class="import-result" [class.import-result--warning]="result.errors.length">
                  <strong>
                    {{ result.associated || result.assigned }} asociados · {{ result.created }} creados · {{ result.existing }} existentes · {{ result.skipped }} omitidos
                  </strong>
                  <span>{{ result.message }}</span>
                  <span>Contraseña por defecto para nuevos sin password: {{ result.defaultPassword }}</span>
                  @if (result.errors.length) {
                    <details>
                      <summary>{{ result.errors.length }} filas con observaciones</summary>
                      <ul>
                        @for (item of result.errors; track item.row) {
                          <li>Fila {{ item.row }} · {{ item.field || 'archivo' }} · {{ item.email || 'sin correo' }}: {{ item.message || item.error }}</li>
                        }
                      </ul>
                    </details>
                  }
                </div>
              }
              @if (estudiantes().length) {
                <label class="search-box search-box--compact">
                  <mat-icon aria-hidden="true">search</mat-icon>
                  <input
                    type="search"
                    placeholder="Buscar estudiante por nombre o correo"
                    [value]="busquedaEstudiante()"
                    (input)="busquedaEstudiante.set($any($event.target).value)"
                  >
                </label>
              }
              @if (!estudiantes().length) {
                <p class="empty-state">Este grupo aun no tiene estudiantes.</p>
              } @else if (!estudiantesFiltrados().length) {
                <p class="empty-state">No encontramos estudiantes con ese criterio.</p>
              } @else {
                <div class="detalle-list">
                  @for (student of estudiantesFiltrados(); track student.id) {
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
              <div class="section-heading">
                <div>
                  <h3>Casos asignados</h3>
                  <p>Solo los casos asignados aparecen para los estudiantes del grupo.</p>
                </div>
              </div>
              <form [formGroup]="casoForm" (ngSubmit)="asignarCaso()" class="case-assign-form">
                <mat-form-field appearance="outline">
                  <mat-label>Asignar caso publicado</mat-label>
                  <select matNativeControl formControlName="caseVersionId">
                    <option value="">Selecciona un caso</option>
                    @for (caseItem of casosDisponiblesParaAsignar(); track caseItem.caseVersionId) {
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
    .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .page-kicker { margin: 0 0 4px; color: var(--psy-blue-deep); font-size: .78rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .page-title { font-size: clamp(2rem, 3vw, 2.7rem); font-weight: 900; color: var(--siep-blue); margin: 0; letter-spacing: 0; }
    .page-subtitle { margin: 6px 0 0; color: var(--psy-muted); font-size: .98rem; font-weight: 650; line-height: 1.45; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 78px;
      padding: 14px 16px;
      border: 1px solid rgba(0, 72, 118, .12);
      border-radius: 14px;
      background: rgba(255,255,255,.82);
      box-shadow: 0 12px 28px rgba(10, 38, 70, .06);
    }
    .summary-card mat-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      color: var(--psy-blue-deep);
      background: rgba(0, 84, 134, .1);
    }
    .summary-card div { display: grid; gap: 2px; min-width: 0; }
    .summary-card strong { color: var(--psy-ink); font-size: 1.28rem; font-weight: 900; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .summary-card span { color: var(--psy-muted); font-size: .78rem; font-weight: 800; }
    .summary-card--active { background: linear-gradient(135deg, rgba(0, 84, 134, .1), rgba(77, 35, 145, .08)); }
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
    .panel-card { border-radius: 16px; border: 1px solid rgba(0, 72, 118, .12); box-shadow: 0 14px 34px rgba(10, 38, 70, .06); }
    .panel-card mat-card-title { color: var(--psy-ink); font-size: 1.05rem; font-weight: 900; }
    .panel-card mat-card-subtitle { color: var(--psy-muted); font-size: .82rem; line-height: 1.35; }
    .full-width { width: 100%; }
    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 46px;
      margin-bottom: 12px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(0, 72, 118, .14);
      background: rgba(255,255,255,.86);
      color: var(--psy-blue-deep);
    }
    .search-box input {
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--psy-ink);
      font: inherit;
      font-weight: 650;
    }
    .search-box--compact { min-height: 42px; margin: 0 0 10px; }
    .group-list { display: grid; gap: 10px; max-height: 360px; overflow: auto; padding-right: 4px; }
    .group-card {
      border: 1px solid rgba(0, 72, 118, .12);
      border-radius: 14px;
      background: rgba(255,255,255,.78);
      overflow: hidden;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    .group-card:hover { transform: translateY(-1px); border-color: rgba(0, 84, 134, .28); box-shadow: 0 12px 24px rgba(10, 38, 70, .08); }
    .group-card--active { border-color: rgba(0, 84, 134, .48); box-shadow: inset 4px 0 0 var(--psy-blue-deep), 0 14px 28px rgba(0, 84, 134, .1); }
    .group-card__main {
      width: 100%;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 0;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .group-card__icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      color: var(--psy-blue-deep);
      background: rgba(0, 84, 134, .1);
    }
    .group-card__body { display: grid; gap: 3px; min-width: 0; }
    .group-card__body strong { color: var(--psy-ink); font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .group-card__body small, .group-card__metric small { color: var(--psy-muted); font-size: .76rem; font-weight: 800; }
    .group-card__metric { display: grid; justify-items: end; gap: 2px; min-width: 78px; }
    .group-card__metric strong { color: var(--psy-blue-deep); font-size: 1.35rem; font-weight: 900; }
    .group-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 14px 14px 68px;
    }
    .text-action {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 32px;
      border: 0;
      border-radius: 999px;
      padding: 0 10px;
      background: rgba(0, 84, 134, .08);
      color: var(--psy-blue-deep);
      font-size: .78rem;
      font-weight: 900;
      cursor: pointer;
    }
    .text-action mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .grupo-detalle { margin-top: 16px; border-radius: 18px; border: 1px solid rgba(0, 72, 118, .12); box-shadow: 0 18px 38px rgba(10, 38, 70, .06); }
    .grupo-detalle mat-card-title { color: var(--psy-ink); font-size: 1.25rem; font-weight: 900; }
    .grupo-detalle mat-card-subtitle { color: var(--psy-muted); font-weight: 750; }
    .detalle-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 18px; align-items: start; }
    .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .section-heading h3 { margin: 0; color: var(--psy-ink); font-size: 1rem; letter-spacing: 0; }
    .section-heading p { margin: 3px 0 0; color: var(--psy-muted); font-size: .82rem; font-weight: 650; line-height: 1.35; }
    .student-import {
      display: grid;
      gap: 10px;
      margin-bottom: 14px;
      padding: 12px;
      border: 1px solid rgba(0, 72, 118, .12);
      border-radius: 10px;
      background: rgba(255,255,255,.7);
    }
    .student-import__copy { display: grid; gap: 3px; }
    .student-import__copy strong { color: var(--psy-ink); font-size: .9rem; }
    .student-import__copy span { color: var(--psy-muted); font-size: .78rem; line-height: 1.4; }
    .student-import__copy code {
      font-size: .76rem;
      color: var(--psy-blue-deep);
      font-weight: 800;
    }
    .student-import__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .file-picker {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 8px 12px;
      border: 1px dashed rgba(0, 72, 118, .32);
      border-radius: 8px;
      color: var(--psy-blue-deep);
      background: rgba(255,255,255,.84);
      cursor: pointer;
      overflow: hidden;
    }
    .file-picker input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .file-picker span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: .84rem;
      font-weight: 800;
    }
    .import-result {
      display: grid;
      gap: 4px;
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      color: var(--psy-green-deep);
      background: rgba(60, 140, 96, .1);
      font-size: .84rem;
      font-weight: 700;
    }
    .import-result--warning {
      color: #7a4e00;
      background: rgba(245,184,75,.16);
    }
    .import-result span { color: inherit; opacity: .82; font-size: .78rem; }
    .import-result details { color: var(--psy-ink); }
    .import-result summary { cursor: pointer; }
    .import-result ul { margin: 6px 0 0; padding-left: 18px; color: #8f2f3d; }
    .import-result li { margin: 3px 0; font-weight: 700; overflow-wrap: anywhere; }
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
    @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 920px) { .layout, .detalle-grid { grid-template-columns: 1fr; } .group-list { max-height: none; } }
    @media (max-width: 560px) {
      .summary-grid { grid-template-columns: 1fr; }
      .group-card__main { grid-template-columns: auto minmax(0, 1fr); }
      .group-card__metric { grid-column: 2; justify-items: start; }
      .group-card__actions { padding-left: 14px; }
      form .psy-button, .agregar-estudiante .psy-button { width: 100%; }
    }
  `]
})
export class GrupoListComponent implements OnInit {
  @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;

  private grupoService = inject(GrupoService);
  private simulationService = inject(SimulationService);
  private fb = inject(FormBuilder);

  grupos = signal<Grupo[]>([]);
  grupoActivo = signal<Grupo | null>(null);
  grupoSeleccionado = signal<number | null>(null);
  estudiantes = signal<GrupoEstudiante[]>([]);
  busquedaGrupo = signal('');
  busquedaEstudiante = signal('');
  casosDisponibles = signal<SimulationCaseSummary[]>([]);
  casosAsignados = signal<SimulationCaseSummary[]>([]);
  mensajeEstudiante = signal('');
  importSpec = signal<GrupoImportSpec | null>(null);
  archivoImportacion = signal<File | null>(null);
  resultadoImportacion = signal<GrupoImportResult | null>(null);
  erroresImportacion = signal<GrupoImportError[]>([]);
  mensajeEsError = signal(false);
  loading = signal(true);
  detailLoading = signal(false);
  saving = signal(false);
  agregandoEstudiante = signal(false);
  asignandoCaso = signal(false);
  importandoEstudiantes = signal(false);
  error = signal('');

  totalEstudiantes = computed(() =>
    this.grupos().reduce((total, grupo) => total + grupo.totalEstudiantes, 0)
  );
  gruposFiltrados = computed(() => {
    const query = this.busquedaGrupo().trim().toLowerCase();
    if (!query) return this.grupos();
    return this.grupos().filter(grupo =>
      `${grupo.nombre} ${grupo.codigo}`.toLowerCase().includes(query)
    );
  });
  estudiantesFiltrados = computed(() => {
    const query = this.busquedaEstudiante().trim().toLowerCase();
    if (!query) return this.estudiantes();
    return this.estudiantes().filter(student =>
      `${student.nombre} ${student.apellido} ${student.email}`.toLowerCase().includes(query)
    );
  });
  casosDisponiblesParaAsignar = computed(() => {
    const asignados = new Set(this.casosAsignados().map(caso => caso.caseVersionId));
    return this.casosDisponibles().filter(caso => !asignados.has(caso.caseVersionId));
  });

  form = this.fb.group({ nombre: ['', Validators.required], codigo: ['', Validators.required] });
  estudianteForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  casoForm = this.fb.group({ caseVersionId: ['', Validators.required] });

  ngOnInit() {
    this.cargar();
    this.grupoService.importSpec().subscribe({
      next: spec => this.importSpec.set(spec),
      error: () => this.importSpec.set({
        requiredColumns: ['nombre', 'apellido', 'email'],
        optionalColumns: ['password'],
        columns: ['nombre', 'apellido', 'email', 'password'],
        templateFilename: 'plantilla_importacion_estudiantes_siep.xlsx',
        acceptedExtensions: ['.xlsx']
      })
    });
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
    this.busquedaEstudiante.set('');
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.limpiarImportacion();
    this.cargarDetalle(grupo.id);
  }

  agregarEstudiante(grupo: Grupo) {
    this.grupoActivo.set(grupo);
    this.grupoSeleccionado.set(grupo.id);
    this.busquedaEstudiante.set('');
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.estudianteForm.reset();
    this.limpiarImportacion();
    this.cargarDetalle(grupo.id);
  }

  copiarCodigo(grupo: Grupo): void {
    const done = () => {
      this.mensajeEstudiante.set(`Código ${grupo.codigo} copiado al portapapeles.`);
      this.mensajeEsError.set(false);
    };
    const fail = () => {
      this.mensajeEstudiante.set(`Código del grupo: ${grupo.codigo}`);
      this.mensajeEsError.set(false);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(grupo.codigo).then(done).catch(fail);
      return;
    }
    fail();
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

  importFileName(): string {
    return this.archivoImportacion()?.name ?? '';
  }

  columnasRequeridasTexto(): string {
    return this.importSpec()?.requiredColumns.join(', ') || 'nombre, apellido, email';
  }

  columnasOpcionalesTexto(): string {
    return this.importSpec()?.optionalColumns.join(', ') || 'password';
  }

  descargarPlantilla(): void {
    this.grupoService.descargarPlantillaImportacion().subscribe({
      next: response => {
        const blob = response.body;
        if (!blob) return;
        const filename = this.importSpec()?.templateFilename || 'plantilla_importacion_estudiantes_siep.xlsx';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajeEstudiante.set('No fue posible descargar la plantilla Excel.');
        this.mensajeEsError.set(true);
      }
    });
  }

  seleccionarArchivoImportacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoImportacion.set(file);
    this.resultadoImportacion.set(null);
    this.erroresImportacion.set([]);
    if (file && !/\.xlsx$/i.test(file.name)) {
      this.mensajeEstudiante.set('Selecciona un archivo .xlsx.');
      this.mensajeEsError.set(true);
      this.archivoImportacion.set(null);
      input.value = '';
    }
  }

  descargarPlantillaImportacion(): void {
    this.descargarPlantilla();
  }

  importarEstudiantes(): void {
    const grupo = this.grupoActivo();
    const file = this.archivoImportacion();
    if (!grupo || !file || this.importandoEstudiantes()) return;

    this.importandoEstudiantes.set(true);
    this.mensajeEstudiante.set('');
    this.mensajeEsError.set(false);
    this.grupoService.importarEstudiantes(grupo.id, file).subscribe({
      next: result => {
        this.resultadoImportacion.set(result);
        this.erroresImportacion.set(result.errors);
        this.archivoImportacion.set(null);
        this.resetImportFileInput();
        this.importandoEstudiantes.set(false);
        this.grupos.update(list => list.map(g => g.id === grupo.id ? result.grupo : g));
        this.grupoActivo.set(result.grupo);
        this.cargarDetalle(grupo.id);
        const warnings = result.errors.length ? ` ${result.errors.length} fila(s) con observaciones.` : '';
        this.mensajeEstudiante.set(
          `Importación completada: ${result.assigned} asignados, ${result.created} creados, ${result.existing} ya existían.${warnings}`
        );
        this.mensajeEsError.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const result = err.error?.data as GrupoImportResult | undefined;
        if (result) {
          this.resultadoImportacion.set(result);
          this.erroresImportacion.set(result.errors ?? []);
        }
        this.mensajeEstudiante.set(this.mapImportError(err));
        this.mensajeEsError.set(true);
        this.importandoEstudiantes.set(false);
      }
    });
  }

  private resetImportFileInput(): void {
    if (this.importFileInput?.nativeElement) {
      this.importFileInput.nativeElement.value = '';
    }
  }

  private mapImportError(err: HttpErrorResponse): string {
    const body = err.error;
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message;
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return 'No fue posible importar el archivo. Verifica columnas nombre, apellido y email.';
  }

  private limpiarImportacion(): void {
    this.archivoImportacion.set(null);
    this.resultadoImportacion.set(null);
    this.erroresImportacion.set([]);
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
