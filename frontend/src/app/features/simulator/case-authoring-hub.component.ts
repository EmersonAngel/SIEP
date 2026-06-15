import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SimulationService } from '../../core/api/simulation.service';
import { SimulationCaseSummary } from '../../core/models/simulation.model';

@Component({
  selector: 'app-case-authoring-hub',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule],
  template: `
    <section class="authoring-hub">
      <header class="hub-header">
        <div>
          <p class="psy-eyebrow">Modalidad administrador</p>
          <h1>Edicion de casos</h1>
          <p>Construye escenarios, NPCs, puertas, articulos, conversaciones y cuestionarios para estudiantes.</p>
        </div>
        <button class="psy-button psy-button--primary" type="button" (click)="toggleCreate()">
          <mat-icon>{{ creating() ? 'close' : 'add_circle' }}</mat-icon>
          {{ creating() ? 'Cerrar' : 'Agregar nuevo caso' }}
        </button>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="state-message state-message--error" role="alert">{{ error() }}</p>
      }

      @if (creating()) {
        <section class="new-case-panel">
          <div>
            <h2>Nuevo caso editable</h2>
            <p>Se creara en borrador con una escena inicial para que puedas editar NPCs, articulos, puertas y cuestionarios.</p>
          </div>
          <form [formGroup]="newCaseForm" (ngSubmit)="createCase()">
            <label>
              <span>Titulo del caso *</span>
              <input formControlName="title" placeholder="Caso de intervencion psicosocial" />
            </label>
            <label>
              <span>Codigo opcional</span>
              <input formControlName="code" placeholder="CASO-PSICO-001" />
            </label>
            <label class="new-case-panel__wide">
              <span>Descripcion</span>
              <textarea formControlName="description" rows="3" placeholder="Contexto breve para docentes y estudiantes"></textarea>
            </label>
            <div class="new-case-panel__actions">
              <button class="psy-button psy-button--ghost" type="button" (click)="toggleCreate()">Cancelar</button>
              <button class="psy-button psy-button--primary" type="submit" [disabled]="newCaseForm.invalid || creatingCase()">
                <mat-icon>{{ creatingCase() ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ creatingCase() ? 'Creando...' : 'Crear y abrir editor' }}
              </button>
            </div>
          </form>
        </section>
      }

      <div class="hub-grid">
        @for (item of cases(); track item.caseVersionId) {
          <article class="case-card">
            <div class="case-card__top">
              <span>{{ item.status }}</span>
              <small>v{{ item.semanticVersion }}</small>
            </div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
            <div class="case-card__meta">
              <span><mat-icon>account_tree</mat-icon>{{ item.nodeCount }} nodos</span>
              <span><mat-icon>tag</mat-icon>{{ item.code }}</span>
            </div>
            <div class="case-card__actions">
              <a class="psy-button psy-button--primary" [routerLink]="['/portal/casos', item.caseVersionId, 'editor']">
                <mat-icon>edit_square</mat-icon>
                Abrir entorno de edicion
              </a>
              <a class="psy-button psy-button--ghost" [routerLink]="['/portal/simulador', item.caseVersionId]">
                <mat-icon>play_arrow</mat-icon>
                Probar caso
              </a>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .authoring-hub { display: grid; gap: 18px; }
    .hub-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hub-header h1 {
      margin: 0;
      color: var(--siep-blue);
      font-size: clamp(1.8rem, 3vw, 2.6rem);
      font-weight: 900;
      letter-spacing: 0;
    }
    .hub-header p:last-child {
      max-width: 760px;
      margin: 8px 0 0;
      color: var(--psy-muted);
      font-weight: 700;
      line-height: 1.45;
    }
    .new-case-panel {
      display: grid;
      gap: 14px;
      padding: 16px;
      border: 1px solid rgba(0, 72, 118, .14);
      border-radius: 8px;
      background: rgba(255,255,255,.82);
      box-shadow: 4px 4px 0 rgba(0, 82, 130, .08);
    }
    .new-case-panel h2 {
      margin: 0;
      color: var(--psy-ink);
      font-size: 1.18rem;
      letter-spacing: 0;
    }
    .new-case-panel p {
      margin: 6px 0 0;
      color: var(--psy-muted);
      font-weight: 700;
      line-height: 1.45;
    }
    .new-case-panel form {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 12px;
    }
    .new-case-panel label {
      display: grid;
      gap: 5px;
      color: var(--psy-blue-deep);
      font-weight: 800;
      font-size: .84rem;
    }
    .new-case-panel input,
    .new-case-panel textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(79,124,172,.24);
      border-radius: 8px;
      padding: 10px 12px;
      color: var(--psy-ink);
      background: rgba(255,255,255,.9);
      font-family: inherit;
      font-size: .92rem;
    }
    .new-case-panel textarea { resize: vertical; }
    .new-case-panel__wide,
    .new-case-panel__actions { grid-column: 1 / -1; }
    .new-case-panel__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    .case-card {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid rgba(0, 72, 118, .14);
      border-radius: 8px;
      background: rgba(255,255,255,.76);
      box-shadow: 4px 4px 0 rgba(0, 82, 130, .08);
    }
    .case-card__top,
    .case-card__meta,
    .case-card__actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .case-card__top { justify-content: space-between; }
    .case-card__top span,
    .case-card__top small {
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(79,124,172,.12);
      color: var(--psy-blue-deep);
      font-weight: 900;
      font-size: .72rem;
    }
    .case-card h2 {
      margin: 0;
      color: var(--psy-ink);
      font-size: 1.08rem;
      line-height: 1.25;
    }
    .case-card p {
      margin: 0;
      color: var(--psy-muted);
      line-height: 1.5;
    }
    .case-card__meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--psy-muted);
      font-size: .78rem;
      font-weight: 800;
    }
    .case-card__meta mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .state-message { margin: 0; padding: 12px 14px; border-radius: 8px; color: var(--psy-green-deep); background: rgba(66,141,101,.1); font-weight: 800; }
    .state-message--error { color: #8f2f3d; background: rgba(143,47,61,.1); }
    @media (max-width: 680px) {
      .new-case-panel form { grid-template-columns: 1fr; }
      .new-case-panel__actions .psy-button,
      .hub-header .psy-button { width: 100%; }
    }
  `],
})
export class CaseAuthoringHubComponent implements OnInit {
  private readonly simulationService = inject(SimulationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly cases = signal<SimulationCaseSummary[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly creatingCase = signal(false);
  readonly error = signal('');
  readonly newCaseForm = this.fb.group({
    title: ['', Validators.required],
    code: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.loadCases();
  }

  toggleCreate(): void {
    this.creating.update(value => !value);
    this.error.set('');
  }

  createCase(): void {
    if (this.newCaseForm.invalid || this.creatingCase()) return;
    const value = this.newCaseForm.getRawValue();
    this.creatingCase.set(true);
    this.error.set('');
    this.simulationService.createCase({
      title: value.title ?? '',
      code: value.code || null,
      description: value.description || null,
    }).subscribe({
      next: model => {
        this.creatingCase.set(false);
        this.router.navigate(['/portal/casos', model.caseVersionId, 'editor']);
      },
      error: () => {
        this.error.set('No fue posible crear el caso. Revisa que el codigo no exista y vuelve a intentar.');
        this.creatingCase.set(false);
      },
    });
  }

  private loadCases(): void {
    this.loading.set(true);
    this.error.set('');
    this.simulationService.listAuthoringCases().subscribe({
      next: cases => {
        this.cases.set(cases);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los casos disponibles.');
        this.loading.set(false);
      },
    });
  }
}
