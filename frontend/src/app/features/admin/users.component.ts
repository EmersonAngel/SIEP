import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { AdminUser, UserAdminService, UserRole } from '../../core/api/user-admin.service';
import { AccessRequest, AccessRequestAdminService } from '../../core/api/access-request-admin.service';
import { ConfirmDialogComponent } from '../../shared/confirm/confirm-dialog.component';

@Component({
  selector: 'app-admin-users',
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
    MatTableModule,
    ConfirmDialogComponent
  ],
  template: `
    <section class="admin-users">
      <header class="page-header">
        <div>
          <p class="psy-eyebrow">Administración</p>
          <h1 class="page-title">Usuarios</h1>
        </div>
        <button class="psy-button psy-button--primary" type="button" (click)="newUser()">
          <mat-icon>person_add</mat-icon>
          Nuevo usuario
        </button>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (message()) {
        <p class="state-message" role="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="state-message state-message--error" role="alert">{{ error() }}</p>
      }

      @if (accessRequests().length) {
        <mat-card class="requests-card">
          <mat-card-header>
            <mat-card-title>Solicitudes de acceso pendientes</mat-card-title>
            <mat-card-subtitle>Estudiantes que pidieron cuenta desde el login</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="requests-list">
              @for (request of accessRequests(); track request.id) {
                <article class="request-item">
                  <div>
                    <strong>{{ request.nombre }} {{ request.apellido }}</strong>
                    <span>{{ request.email }}</span>
                    <small>Solicitado: {{ formatDate(request.createdAt) }}</small>
                  </div>
                  <div class="request-actions">
                    <button class="psy-button psy-button--primary" type="button" (click)="attendRequest(request)">
                      <mat-icon>person_add</mat-icon>
                      Crear usuario
                    </button>
                    <button class="psy-button psy-button--ghost" type="button" (click)="dismissRequest(request)" [disabled]="saving()">
                      Descartar
                    </button>
                  </div>
                </article>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <div class="admin-grid">
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="users()" class="full-width">
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let user">{{ user.nombre }} {{ user.apellido }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Rol</th>
                <td mat-cell *matCellDef="let user">{{ user.role }}</td>
              </ng-container>

              <ng-container matColumnDef="activo">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [color]="user.activo ? 'primary' : 'warn'" highlighted>
                    {{ user.activo ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-icon-button type="button" aria-label="Editar usuario" (click)="editUser(user)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="user.activo ? 'Desactivar usuario' : 'Activar usuario'"
                    (click)="toggleStatus(user)"
                    [disabled]="saving()"
                  >
                    <mat-icon>{{ user.activo ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>

            @if (!loading() && !users().length) {
              <p class="empty-state">No hay usuarios registrados.</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ selectedUser() ? 'Editar usuario' : 'Crear usuario' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" class="user-form">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="nombre">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Apellido</mat-label>
                <input matInput formControlName="apellido">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Rol</mat-label>
                <mat-select formControlName="role">
                  @for (role of roles; track role) {
                    <mat-option [value]="role">{{ role }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ selectedUser() ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</mat-label>
                <input matInput formControlName="password" type="password" autocomplete="new-password">
              </mat-form-field>

              <div class="form-actions">
                <button class="psy-button psy-button--primary" type="submit" [disabled]="form.invalid || saving()">
                  <mat-icon>save</mat-icon>
                  {{ saving() ? 'Guardando...' : 'Guardar' }}
                </button>
                <button class="psy-button psy-button--ghost" type="button" (click)="newUser()">
                  Cancelar
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    <app-confirm-dialog
      [open]="!!statusConfirmTarget()"
      [title]="statusConfirmTarget()?.activo ? 'Desactivar usuario' : 'Activar usuario'"
      [message]="statusConfirmMessage()"
      [confirmLabel]="statusConfirmTarget()?.activo ? 'Desactivar' : 'Activar'"
      [loading]="saving()"
      (cancel)="statusConfirmTarget.set(null)"
      (confirm)="confirmToggleStatus()"
    />
    </section>
  `,
  styles: [`
    .admin-users { display: grid; gap: 18px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .page-title { margin: 0; color: var(--siep-blue); font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; letter-spacing: 0; }
    .admin-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 360px); gap: 16px; align-items: start; }
    .full-width { width: 100%; }
    .user-form { display: grid; gap: 12px; }
    .form-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .state-message { margin: 0; padding: 12px 14px; border-radius: 12px; color: var(--psy-green-deep); background: rgba(66, 141, 101, .1); font-weight: 700; }
    .state-message--error { color: #8f2f3d; background: rgba(143, 47, 61, .1); }
    .empty-state { margin: 16px 0 0; color: var(--psy-muted); font-weight: 700; }
    .requests-card { border: 1px solid rgba(79, 124, 172, .18); }
    .requests-list { display: grid; gap: 12px; }
    .request-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 14px;
      border-radius: 14px;
      background: rgba(79, 124, 172, .06);
      border: 1px solid rgba(79, 124, 172, .14);
    }
    .request-item strong,
    .request-item span,
    .request-item small { display: block; }
    .request-item span { color: var(--psy-muted); font-weight: 700; font-size: .9rem; }
    .request-item small { margin-top: 4px; color: var(--psy-muted); font-size: .78rem; }
    .request-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 920px) {
      .admin-grid { grid-template-columns: 1fr; }
      .page-header { display: grid; }
      .page-header .psy-button, .form-actions .psy-button { width: 100%; }
    }
  `]
})
export class UsersComponent implements OnInit {
  private readonly service = inject(UserAdminService);
  private readonly accessRequestsService = inject(AccessRequestAdminService);
  private readonly fb = inject(FormBuilder);

  readonly roles: UserRole[] = ['ADMIN', 'PROFESOR', 'ESTUDIANTE'];
  readonly cols = ['nombre', 'email', 'role', 'activo', 'acciones'];
  readonly users = signal<AdminUser[]>([]);
  readonly accessRequests = signal<AccessRequest[]>([]);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly statusConfirmTarget = signal<AdminUser | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['ESTUDIANTE' as UserRole, Validators.required],
    password: ['']
  });

  statusConfirmMessage(): string {
    const user = this.statusConfirmTarget();
    if (!user) return '';
    return user.activo
      ? `¿Desactivar a ${user.nombre} ${user.apellido}? No podrá iniciar sesión hasta reactivarlo.`
      : `¿Activar a ${user.nombre} ${user.apellido}?`;
  }

  ngOnInit() {
    this.load();
    this.loadAccessRequests();
  }

  loadAccessRequests() {
    this.accessRequestsService.listPending().subscribe({
      next: requests => this.accessRequests.set(requests),
      error: () => this.accessRequests.set([]),
    });
  }

  attendRequest(request: AccessRequest) {
    this.selectedUser.set(null);
    this.form.reset({
      nombre: request.nombre,
      apellido: request.apellido,
      email: request.email,
      role: 'ESTUDIANTE',
      password: '',
    });
    this.message.set(`Solicitud de ${request.nombre} ${request.apellido} lista para crear usuario.`);
    this.error.set('');
  }

  dismissRequest(request: AccessRequest) {
    if (this.saving()) return;
    this.saving.set(true);
    this.accessRequestsService.updateStatus(request.id, 'DISMISSED').subscribe({
      next: () => {
        this.accessRequests.update(items => items.filter(item => item.id !== request.id));
        this.message.set('Solicitud descartada.');
        this.saving.set(false);
      },
      error: error => {
        this.error.set(error?.error?.message || 'No fue posible actualizar la solicitud.');
        this.saving.set(false);
      },
    });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.list().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los usuarios.');
        this.loading.set(false);
      }
    });
  }

  newUser() {
    this.selectedUser.set(null);
    this.form.reset({
      nombre: '',
      apellido: '',
      email: '',
      role: 'ESTUDIANTE',
      password: ''
    });
    this.message.set('');
    this.error.set('');
  }

  editUser(user: AdminUser) {
    this.selectedUser.set(user);
    this.form.reset({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
      password: ''
    });
    this.message.set('');
    this.error.set('');
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos obligatorios.');
      return;
    }
    const selected = this.selectedUser();
    const value = this.form.getRawValue();
    const email = value.email.trim().toLowerCase();
    if (!selected && !value.password) {
      this.form.controls.password.markAsTouched();
      this.error.set('La contraseña es obligatoria al crear usuarios.');
      return;
    }
    if (!selected && value.password.length < 8) {
      this.form.controls.password.markAsTouched();
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');

    const request$ = selected
      ? this.service.update(selected.id, {
          email,
          password: value.password || undefined,
          nombre: value.nombre,
          apellido: value.apellido,
          role: value.role
        })
      : this.service.create({
          email,
          password: value.password,
          nombre: value.nombre,
          apellido: value.apellido,
          role: value.role,
          activo: true
        });

    request$.subscribe({
      next: saved => {
        this.users.update(users => {
          const exists = users.some(user => user.id === saved.id);
          return exists ? users.map(user => user.id === saved.id ? saved : user) : [...users, saved];
        });
        this.message.set(selected ? 'La información se guardó correctamente.' : 'Usuario creado correctamente.');
        this.saving.set(false);
        this.editUser(saved);
        this.loadAccessRequests();
      },
      error: error => {
        this.error.set(error?.error?.message || 'No fue posible guardar los cambios.');
        this.saving.set(false);
      }
    });
  }

  toggleStatus(user: AdminUser) {
    if (this.saving()) return;
    this.statusConfirmTarget.set(user);
  }

  confirmToggleStatus() {
    const user = this.statusConfirmTarget();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.service.updateStatus(user.id, !user.activo).subscribe({
      next: saved => {
        this.users.update(users => users.map(item => item.id === saved.id ? saved : item));
        this.message.set(saved.activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.');
        this.statusConfirmTarget.set(null);
        this.saving.set(false);
        if (this.selectedUser()?.id === saved.id) this.editUser(saved);
      },
      error: error => {
        this.error.set(error?.error?.message || 'No fue posible actualizar el estado del usuario.');
        this.saving.set(false);
      }
    });
  }
}
