import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  NgZone,
  ViewChild,
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

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number | boolean>): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton', { static: false })
  private googleButton?: ElementRef<HTMLElement>;

  readonly brand = APP_BRAND;
  readonly assets = LOGIN_ASSETS;
  readonly layoutCssVars = signal(loginLayoutCssVars(this.viewportWidth()));
  readonly pillars = LOGIN_PEDAGOGY_PILLARS.map(p => ({ ...p, iconMissing: true }));

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private windowResizeListener?: () => void;
  private static googleScriptPromise?: Promise<void>;

  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly googleConfigured = signal(false);
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
    this.initializeGoogleButton();
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
    if (this.loading() || this.googleLoading()) return;
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
    if (!this.googleConfigured()) {
      this.ssoNotice.set(
        'El acceso con Google requiere configurar el Client ID web en frontend y backend.'
      );
      return;
    }
    this.ssoNotice.set('Espera un momento mientras Google termina de cargar.');
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
    const serverMessage = this.apiErrorMessage(error);
    if (error.status === 401) {
      if (serverMessage && serverMessage !== 'Credenciales inválidas') {
        return serverMessage;
      }
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

  private apiErrorMessage(error: HttpErrorResponse): string {
    const payload = error.error as { message?: unknown } | null;
    return typeof payload?.message === 'string' ? payload.message : '';
  }

  private initializeGoogleButton(): void {
    if (typeof document === 'undefined') return;

    const clientId = this.googleClientId();
    this.googleConfigured.set(!!clientId);
    if (!clientId) return;

    LoginComponent.loadGoogleIdentityScript()
      .then(() => this.renderGoogleButton(clientId))
      .catch(() => {
        this.ssoNotice.set('No fue posible cargar el inicio de sesión con Google.');
      });
  }

  private renderGoogleButton(clientId: string): void {
    const accounts = window.google?.accounts?.id;
    const host = this.googleButton?.nativeElement;
    if (!accounts || !host) {
      this.ssoNotice.set('No fue posible inicializar el botón de Google.');
      return;
    }

    accounts.initialize({
      client_id: clientId,
      callback: response => this.handleGoogleCredential(response),
      ux_mode: 'popup'
    });
    accounts.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: Math.max(host.clientWidth, 180)
    });
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    this.zone.run(() => {
      if (!response.credential || this.googleLoading() || this.loading()) {
        this.ssoNotice.set('Google no entregó una credencial válida.');
        return;
      }

      this.googleLoading.set(true);
      this.error.set('');
      this.ssoNotice.set('');

      this.auth.loginWithGoogle(response.credential).subscribe({
        next: () => this.router.navigate(['/portal/dashboard']),
        error: (error: unknown) => {
          this.error.set(this.loginErrorMessage(error));
          this.googleLoading.set(false);
        }
      });
    });
  }

  private googleClientId(): string {
    return document
      .querySelector<HTMLMetaElement>('meta[name="google-signin-client_id"]')
      ?.content
      ?.trim() ?? '';
  }

  private static loadGoogleIdentityScript(): Promise<void> {
    if (typeof document === 'undefined') return Promise.reject();
    if (window.google?.accounts?.id) return Promise.resolve();
    if (LoginComponent.googleScriptPromise) return LoginComponent.googleScriptPromise;

    LoginComponent.googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });

    return LoginComponent.googleScriptPromise;
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
