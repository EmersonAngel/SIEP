import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/config/brand.config';
import { LOGIN_REMEMBER_EMAIL_KEY } from './login-assets.config';
import { SiepParticleLayerComponent } from '../../shared/ui/siep-particle-layer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule, SiepParticleLayerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly brand = APP_BRAND;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showRegister = signal(false);
  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly ssoNotice = signal('');
  readonly registerNotice = signal('');

  readonly form = this.fb.nonNullable.group({
    email: [this.loadRememberedEmail(), [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  openSignIn(): void {
    this.showRegister.set(false);
    this.registerNotice.set('');
  }

  openSignUp(): void {
    this.showRegister.set(true);
    this.error.set('');
    this.ssoNotice.set('');
  }

  onSubmit(): void {
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { email, password, remember } = this.form.getRawValue();
    const normalizedEmail = email.trim().toLowerCase();

    if (remember) {
      localStorage.setItem(LOGIN_REMEMBER_EMAIL_KEY, normalizedEmail);
    } else {
      localStorage.removeItem(LOGIN_REMEMBER_EMAIL_KEY);
    }

    this.auth.login(normalizedEmail, password).subscribe({
      next: () => this.router.navigate(['/portal/dashboard']),
      error: (error: unknown) => {
        this.error.set(this.loginErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.registerNotice.set(
      'Las cuentas SIEP son creadas por el administrador académico. ' +
        'Escribe a secretariapsicologia@cue.edu.co con tus datos para solicitar acceso.',
    );
  }

  onGoogleSso(): void {
    this.ssoNotice.set(
      'El acceso con Google estará disponible cuando la institución active el proveedor SSO.',
    );
  }

  onMicrosoftSso(): void {
    this.ssoNotice.set(
      'El acceso con Microsoft estará disponible cuando la institución active el proveedor SSO.',
    );
  }

  private loadRememberedEmail(): string {
    try {
      return localStorage.getItem(LOGIN_REMEMBER_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private loginErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible conectar con el servidor. Intenta nuevamente.';
    }
    if (error.status === 401) {
      return 'Credenciales incorrectas.';
    }
    if (error.status === 403) {
      return 'Tu usuario está inactivo. Contacta al administrador.';
    }
    if (error.status === 0) {
      return 'No fue posible conectar con el servidor. Intenta nuevamente.';
    }
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }
}
