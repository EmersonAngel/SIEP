import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { RubricAdmin, RubricService } from '../../core/api/rubric.service';
import { SimulationService } from '../../core/api/simulation.service';
import { SimulationCaseSummary } from '../../core/models/simulation.model';

@Component({
  selector: 'app-rubrics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <section class="rubrics-page">
      <header class="rubrics-header">
        <div>
          <p class="psy-eyebrow">Evaluación</p>
          <h1>Rúbricas</h1>
        </div>
        <button class="psy-button psy-button--primary" type="button" (click)="newRubric()">
          <mat-icon>add</mat-icon>
          Nueva rúbrica
        </button>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (message()) {
        <p class="state-message" [class.state-message--error]="messageIsError()">{{ message() }}</p>
      }

      <div class="rubrics-grid">
        <mat-card>
          <mat-card-content>
            <div class="filters">
              <mat-form-field appearance="outline">
                <mat-label>Buscar</mat-label>
                <input matInput [value]="query()" (input)="query.set($any($event.target).value)">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Estado</mat-label>
                <select matNativeControl [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)">
                  <option value="ALL">Todas</option>
                  <option value="ACTIVE">Activas</option>
                  <option value="INACTIVE">Inactivas</option>
                </select>
              </mat-form-field>
            </div>

            <div class="rubric-list">
              @for (rubric of filteredRubrics(); track rubric.id) {
                <button type="button" class="rubric-row" [class.rubric-row--active]="selected()?.id === rubric.id" (click)="openRubric(rubric.id)">
                  <span>
                    <strong>{{ rubric.name }}</strong>
                    <small>{{ rubric.criteriaCount }} criterios · {{ rubric.totalWeight }}%</small>
                  </span>
                  <span class="badge" [class.badge--default]="rubric.isDefault">
                    {{ rubric.isDefault ? 'Predeterminada' : (rubric.active ? 'Activa' : 'Inactiva') }}
                  </span>
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Versión</mat-label>
                  <input matInput formControlName="version">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="3" formControlName="description"></textarea>
              </mat-form-field>

              <div class="weight-line" [class.weight-line--bad]="totalWeight() !== 100">
                Ponderación total: {{ totalWeight() }} %
              </div>

              <div formArrayName="criteria" class="criteria">
                @for (criterion of criteria.controls; track $index; let i = $index) {
                  <section class="criterion" [formGroupName]="i">
                    <div class="criterion__top">
                      <strong>Criterio {{ i + 1 }}</strong>
                      <button mat-icon-button type="button" aria-label="Eliminar criterio" (click)="removeCriterion(i)">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Nombre</mat-label>
                        <input matInput formControlName="title">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Peso %</mat-label>
                        <input matInput type="number" min="0" max="100" formControlName="weight">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Orden</mat-label>
                        <input matInput type="number" min="1" formControlName="displayOrder">
                      </mat-form-field>
                    </div>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Descripción</mat-label>
                      <textarea matInput rows="2" formControlName="description"></textarea>
                    </mat-form-field>
                  </section>
                }
              </div>

              <div class="actions">
                <button mat-stroked-button type="button" (click)="addCriterion()">
                  <mat-icon>playlist_add</mat-icon>
                  Agregar criterio
                </button>
                <button class="psy-button psy-button--primary" type="submit" [disabled]="form.invalid || saving()">
                  <mat-icon>save</mat-icon>
                  Guardar
                </button>
                <button mat-stroked-button type="button" [disabled]="!selected() || totalWeight() !== 100" (click)="activate()">
                  Activar
                </button>
                <button mat-stroked-button type="button" [disabled]="!selected()" (click)="deactivate()">
                  Desactivar
                </button>
                <button mat-stroked-button type="button" [disabled]="!selected() || totalWeight() !== 100" (click)="setDefault()">
                  Predeterminada
                </button>
                <button mat-stroked-button type="button" [disabled]="!selected()" (click)="duplicate()">
                  Duplicar
                </button>
              </div>
            </form>

            <section class="assignment">
              <h2>Asignar a simulación</h2>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Simulación publicada</mat-label>
                  <select matNativeControl [value]="caseVersionId()" (change)="selectCaseVersion($any($event.target).value)">
                    <option [value]="0">Selecciona una simulación</option>
                    @for (caseItem of cases(); track caseItem.caseVersionId) {
                      <option [value]="caseItem.caseVersionId">{{ caseItem.title }} · v{{ caseItem.semanticVersion }}</option>
                    }
                  </select>
                </mat-form-field>
                <button class="psy-button psy-button--primary" type="button" [disabled]="!selected() || !caseVersionId()" (click)="assign()">
                  <mat-icon>assignment_turned_in</mat-icon>
                  Asignar
                </button>
              </div>
            </section>
          </mat-card-content>
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .rubrics-page { display: grid; gap: 16px; }
    .rubrics-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .rubrics-header h1 { margin: 0; color: var(--siep-blue); font-size: 2rem; letter-spacing: 0; }
    .rubrics-grid { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 16px; align-items: start; }
    .filters, .form-row, .actions { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .filters mat-form-field, .form-row mat-form-field { flex: 1 1 190px; }
    .full-width { width: 100%; }
    .rubric-list { display: grid; gap: 8px; }
    .rubric-row { display: flex; justify-content: space-between; gap: 10px; width: 100%; padding: 12px; border: 1px solid rgba(0,72,118,.14); border-radius: 8px; background: #fff; text-align: left; cursor: pointer; }
    .rubric-row--active { border-color: var(--siep-blue); box-shadow: 0 0 0 2px rgba(0,72,118,.12); }
    .rubric-row span:first-child { display: grid; gap: 3px; min-width: 0; }
    .rubric-row strong { color: var(--psy-ink); overflow-wrap: anywhere; }
    .rubric-row small { color: var(--psy-muted); }
    .badge { align-self: start; padding: 4px 8px; border-radius: 999px; background: rgba(0,72,118,.1); color: var(--siep-blue); font-size: .74rem; font-weight: 800; white-space: nowrap; }
    .badge--default { background: rgba(60,140,96,.14); color: var(--psy-green-deep); }
    .weight-line { margin: 8px 0 12px; font-weight: 900; color: var(--psy-green-deep); }
    .weight-line--bad { color: #8f2f3d; }
    .criteria { display: grid; gap: 10px; }
    .criterion { padding: 12px; border: 1px solid rgba(0,72,118,.12); border-radius: 8px; background: rgba(255,255,255,.74); }
    .criterion__top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .assignment { margin-top: 18px; border-top: 1px solid rgba(0,72,118,.12); padding-top: 14px; }
    .assignment h2 { margin: 0 0 10px; color: var(--psy-ink); font-size: 1rem; letter-spacing: 0; }
    .state-message { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(60,140,96,.1); color: var(--psy-green-deep); font-weight: 800; }
    .state-message--error { color: #8f2f3d; background: rgba(143,47,61,.1); }
    @media (max-width: 980px) { .rubrics-grid { grid-template-columns: 1fr; } }
  `]
})
export class RubricsComponent implements OnInit {
  private readonly rubricService = inject(RubricService);
  private readonly simulationService = inject(SimulationService);
  private readonly fb = inject(FormBuilder);

  rubrics = signal<RubricAdmin[]>([]);
  selected = signal<RubricAdmin | null>(null);
  cases = signal<SimulationCaseSummary[]>([]);
  caseVersionId = signal(0);
  query = signal('');
  statusFilter = signal('ALL');
  loading = signal(false);
  saving = signal(false);
  message = signal('');
  messageIsError = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    version: ['1.0', Validators.required],
    criteria: this.fb.array([]),
  });

  get criteria(): FormArray {
    return this.form.get('criteria') as FormArray;
  }

  ngOnInit(): void {
    this.load();
    this.simulationService.listCases().subscribe({
      next: cases => this.cases.set(cases),
      error: () => this.cases.set([]),
    });
  }

  filteredRubrics(): RubricAdmin[] {
    const query = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rubrics().filter(rubric => {
      const matchesQuery = !query || rubric.name.toLowerCase().includes(query);
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? rubric.active : !rubric.active);
      return matchesQuery && matchesStatus;
    });
  }

  totalWeight(): number {
    return this.criteria.controls.reduce((sum, control) => sum + Number(control.get('weight')?.value || 0), 0);
  }

  load(): void {
    this.loading.set(true);
    this.rubricService.list().subscribe({
      next: rubrics => {
        this.rubrics.set(rubrics);
        this.loading.set(false);
        if (!this.selected() && rubrics.length) this.openRubric(rubrics[0].id);
      },
      error: () => {
        this.message.set('No fue posible cargar las rúbricas.');
        this.messageIsError.set(true);
        this.loading.set(false);
      },
    });
  }

  openRubric(id: number): void {
    this.rubricService.detail(id).subscribe({
      next: rubric => {
        this.selected.set(rubric);
        this.populate(rubric);
      },
      error: () => {
        this.message.set('No fue posible abrir la rúbrica.');
        this.messageIsError.set(true);
      },
    });
  }

  newRubric(): void {
    this.selected.set(null);
    this.form.reset({ name: '', description: '', version: '1.0' });
    this.criteria.clear();
    this.addCriterion();
  }

  addCriterion(): void {
    this.criteria.push(this.fb.group({
      id: [null],
      title: ['', Validators.required],
      description: [''],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      displayOrder: [this.criteria.length + 1, [Validators.required, Validators.min(1)]],
      active: [true],
    }));
  }

  removeCriterion(index: number): void {
    this.criteria.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.payload();
    this.saving.set(true);
    const request = this.selected()
      ? this.rubricService.update(this.selected()!.id, payload)
      : this.rubricService.create(payload);
    request.subscribe({
      next: rubric => {
        this.selected.set(rubric);
        this.populate(rubric);
        this.message.set('Rúbrica guardada.');
        this.messageIsError.set(false);
        this.saving.set(false);
        this.load();
      },
      error: err => {
        this.message.set(err.error?.message || 'No fue posible guardar la rúbrica.');
        this.messageIsError.set(true);
        this.saving.set(false);
      },
    });
  }

  activate(): void {
    this.withSelected(id => this.rubricService.activate(id), 'Rúbrica activada.');
  }

  deactivate(): void {
    this.withSelected(id => this.rubricService.deactivate(id), 'Rúbrica desactivada.');
  }

  duplicate(): void {
    this.withSelected(id => this.rubricService.duplicate(id), 'Rúbrica duplicada.');
  }

  setDefault(): void {
    this.withSelected(id => this.rubricService.setDefault(id), 'Rúbrica predeterminada actualizada.');
  }

  assign(): void {
    const rubric = this.selected();
    const caseVersionId = this.caseVersionId();
    if (!rubric || !caseVersionId) return;
    this.rubricService.assignToCaseVersion(caseVersionId, rubric.id).subscribe({
      next: () => {
        this.message.set('Rúbrica asignada a la simulación.');
        this.messageIsError.set(false);
      },
      error: err => {
        this.message.set(err.error?.message || 'No fue posible asignar la rúbrica.');
        this.messageIsError.set(true);
      },
    });
  }

  selectCaseVersion(value: string): void {
    this.caseVersionId.set(Number(value || 0));
  }

  private populate(rubric: RubricAdmin): void {
    this.form.reset({
      name: rubric.name,
      description: rubric.description || '',
      version: rubric.version || '1.0',
    });
    this.criteria.clear();
    (rubric.criteria || []).forEach(item => {
      this.criteria.push(this.fb.group({
        id: [item.id ?? null],
        title: [item.title, Validators.required],
        description: [item.description || ''],
        weight: [item.weight, [Validators.required, Validators.min(0), Validators.max(100)]],
        displayOrder: [item.displayOrder, [Validators.required, Validators.min(1)]],
        active: [item.active],
      }));
    });
  }

  private payload(): Partial<RubricAdmin> {
    return {
      name: this.form.value.name || '',
      description: this.form.value.description || '',
      version: this.form.value.version || '1.0',
      criteria: this.criteria.controls.map((control, index) => ({
        id: control.get('id')?.value || undefined,
        title: control.get('title')?.value || '',
        competency: control.get('title')?.value || '',
        description: control.get('description')?.value || '',
        weight: Number(control.get('weight')?.value || 0),
        displayOrder: Number(control.get('displayOrder')?.value || index + 1),
        active: Boolean(control.get('active')?.value),
      })),
    };
  }

  private withSelected(action: (id: number) => Observable<RubricAdmin>, success: string): void {
    const rubric = this.selected();
    if (!rubric) return;
    action(rubric.id).subscribe({
      next: updated => {
        this.selected.set(updated);
        this.populate(updated);
        this.message.set(success);
        this.messageIsError.set(false);
        this.load();
      },
      error: err => {
        this.message.set(err.error?.message || 'No fue posible actualizar la rúbrica.');
        this.messageIsError.set(true);
      },
    });
  }
}
