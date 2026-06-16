import { CommonModule } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { AfterViewInit, Component, ElementRef, computed, inject, isDevMode, signal, viewChild } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../core/auth/auth.service';

import { APP_BRAND } from '../../core/config/brand.config';

import { LOGIN_ASSETS, LOGIN_PEDAGOGY_PILLARS, LOGIN_REMEMBER_EMAIL_KEY } from './login-assets.config';

import { findLoginRole, LOGIN_ROLES, LoginRole } from './login-role.config';

import { SiepParticleLayerComponent } from '../../shared/ui/siep-particle-layer.component';

// Google Identity Services (cargado dinámicamente desde accounts.google.com/gsi/client)
declare const google: any;



@Component({

  selector: 'app-login',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule, SiepParticleLayerComponent],

  templateUrl: './login.component.html',

  styleUrl: './login.component.scss',

})

export class LoginComponent implements AfterViewInit {

  readonly brand = APP_BRAND;

  readonly roles = LOGIN_ROLES;

  readonly pedagogyPillars = LOGIN_PEDAGOGY_PILLARS;

  readonly loginHeroImage = LOGIN_ASSETS.images.hero;

  readonly isDev = isDevMode();



  private readonly fb = inject(FormBuilder);

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);



  readonly selectedRole = signal<LoginRole>('ESTUDIANTE');

  readonly activeRole = computed(() => findLoginRole(this.selectedRole()));

  readonly showRegister = signal(false);

  readonly hidePassword = signal(true);

  readonly loading = signal(false);

  readonly error = signal('');

  // ── Google Identity Services ──────────────────────────────────────────────
  readonly googleBtn = viewChild<ElementRef<HTMLDivElement>>('googleBtn');
  readonly googleEnabled = signal(false);
  readonly googleLoading = signal(false);
  private googleInitialized = false;

  readonly registerNotice = signal('');
  readonly registerLoading = signal(false);
  readonly registerError = signal('');



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



  selectRole(role: LoginRole): void {

    this.selectedRole.set(role);

    this.error.set('');



    if (!this.isDev) {

      return;

    }



    const option = findLoginRole(role);

    const currentEmail = this.form.controls.email.value.trim().toLowerCase();

    const knownDemoEmails = new Set(LOGIN_ROLES.map(item => item.demoEmail));

    if (!currentEmail || knownDemoEmails.has(currentEmail)) {

      this.form.controls.email.setValue(option.demoEmail);

    }

  }



  openSignIn(): void {

    this.showRegister.set(false);

    this.registerNotice.set('');

    this.registerError.set('');

  }



  openSignUp(): void {

    this.showRegister.set(true);

    this.error.set('');

    this.registerNotice.set('');

    this.registerError.set('');

    this.selectedRole.set('ESTUDIANTE');

  }



  fillDemoCredentials(): void {

    const option = this.activeRole();

    this.form.patchValue({

      email: option.demoEmail,

      password: option.demoPassword,

    });

  }



  ngAfterViewInit(): void {
    // Pide el client id público; si está configurado, monta el botón de Google.
    this.auth.googleConfig().subscribe({
      next: cfg => {
        if (cfg.enabled && cfg.clientId) {
          this.setupGoogle(cfg.clientId);
        }
      },
      error: () => { /* Google opcional: si falla, se mantiene oculto */ },
    });
  }

  private setupGoogle(clientId: string): void {
    this.loadGoogleScript()
      .then(() => {
        if (typeof google === 'undefined' || !google.accounts?.id) return;
        if (!this.googleInitialized) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => this.onGoogleCredential(response),
          });
          this.googleInitialized = true;
        }
        this.googleEnabled.set(true);
        const host = this.googleBtn()?.nativeElement;
        if (host) {
          host.innerHTML = '';
          google.accounts.id.renderButton(host, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 320,
          });
        }
      })
      .catch(() => this.googleEnabled.set(false));
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        resolve();
        return;
      }
      const existing = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private onGoogleCredential(response: { credential: string }): void {
    if (!response?.credential || this.googleLoading()) {
      return;
    }
    this.googleLoading.set(true);
    this.error.set('');
    this.auth.loginWithGoogle(response.credential).subscribe({
      next: () => this.router.navigate(['/portal/dashboard']),
      error: (error: unknown) => {
        this.error.set(this.googleErrorMessage(error));
        this.googleLoading.set(false);
      },
    });
  }

  private googleErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible conectar con Google. Intenta nuevamente.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Esa cuenta de Google no está registrada o está inactiva. Solicita acceso o usa tu correo y contraseña.';
    }
    return error.error?.message || 'No fue posible iniciar sesión con Google. Intenta nuevamente.';
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

    if (this.registerLoading()) {

      return;

    }

    if (this.registerForm.invalid) {

      this.registerForm.markAllAsTouched();

      return;

    }



    const { nombre, apellido, email } = this.registerForm.getRawValue();

    this.registerLoading.set(true);

    this.registerNotice.set('');

    this.registerError.set('');



    this.auth.requestAccess({

      nombre: nombre.trim(),

      apellido: apellido.trim(),

      email: email.trim().toLowerCase(),

    }).subscribe({

      next: response => {

        this.registerNotice.set(

          response.message ??

            'Solicitud enviada. El equipo académico revisará tu acceso y te contactará por correo.',

        );

        this.registerLoading.set(false);

        this.registerForm.reset({ nombre: '', apellido: '', email: '' });

      },

      error: (error: unknown) => {

        this.registerError.set(this.registerErrorMessage(error));

        this.registerLoading.set(false);

      },

    });

  }



  private registerErrorMessage(error: unknown): string {

    if (!(error instanceof HttpErrorResponse)) {

      return 'No fue posible enviar la solicitud. Intenta nuevamente en unos minutos.';

    }

    return error.error?.message || 'No fue posible enviar la solicitud. Intenta nuevamente en unos minutos.';

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

      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';

    }

    if (error.status === 403) {

      return 'Tu usuario está inactivo o no tiene permisos para ingresar. Contacta al administrador.';

    }

    if (error.status === 0) {

      return 'No fue posible conectar con el servidor. Intenta nuevamente.';

    }

    return 'No fue posible iniciar sesión. Intenta nuevamente.';

  }

}


