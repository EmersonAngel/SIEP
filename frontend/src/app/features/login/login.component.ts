import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/config/brand.config';
import {
  LOGIN_ASSETS,
  LOGIN_PEDAGOGY_PILLARS,
  LOGIN_REMEMBER_EMAIL_KEY,
  loginLayoutCssVars
} from './login-assets.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  readonly brand = APP_BRAND;
  readonly assets = LOGIN_ASSETS;
  readonly layoutCssVars = signal(loginLayoutCssVars(this.viewportWidth()));
  readonly pillars = LOGIN_PEDAGOGY_PILLARS.map(p => ({ ...p, iconMissing: true }));

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private windowResizeListener?: () => void;

  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly ssoNotice = signal('');
  readonly loginCardArtLoaded = signal(false);
  readonly pedagogyPanelArtLoaded = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: [this.loadRememberedEmail(), [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true]
  });

  ngAfterViewInit() {
    this.syncLayoutVars();
    if (typeof window !== 'undefined') {
      this.windowResizeListener = () => this.onViewportResize();
      window.addEventListener('resize', this.windowResizeListener);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined' && this.windowResizeListener) {
      window.removeEventListener('resize', this.windowResizeListener);
    }
  }

  onLoginCardArtLoad() {
    this.loginCardArtLoaded.set(true);
  }

  onPedagogyPanelArtLoad() {
    this.pedagogyPanelArtLoaded.set(true);
  }

  onPedagogyPanelArtError() {
    this.pedagogyPanelArtLoaded.set(false);
  }

  pedagogyBoardAlt(): string {
    return LOGIN_PEDAGOGY_PILLARS.map(
      p => `${p.title}: ${p.description}`
    ).join('. ');
  }

  onSubmit() {
    if (this.loading()) return;
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
      }
    });
  }

  onGoogleSso() {
    this.ssoNotice.set(
      'El acceso con Google estará disponible cuando la institución active el proveedor SSO.'
    );
  }

  onMicrosoftSso() {
    this.ssoNotice.set(
      'El acceso con Microsoft estará disponible cuando la institución active el proveedor SSO.'
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

  private viewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1366;
  }

  private syncLayoutVars() {
    this.layoutCssVars.set(loginLayoutCssVars(this.viewportWidth()));
  }

  private onViewportResize() {
    this.syncLayoutVars();
  }
}
