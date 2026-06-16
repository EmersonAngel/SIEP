import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationService } from '../notifications/notification.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const token = auth.getToken();
  const isLoginRequest = req.url.includes('/api/auth/login');

  if (token && !isLoginRequest && !auth.isTokenExpired(token)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        notifications.error('No fue posible conectar con el servidor. Intenta nuevamente.');
        return throwError(() => error);
      }

      if (isLoginRequest) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        auth.clearSession();
        if (!router.url.startsWith('/login')) {
          notifications.warning('Tu sesión ya no es válida o tu usuario está inactivo. Contacta al administrador.');
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      if (error.status === 403 && req.url.includes('/api/auth/me')) {
        auth.clearSession();
        if (!router.url.startsWith('/login')) {
          notifications.warning('Tu sesión ya no es válida o tu usuario está inactivo. Contacta al administrador.');
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      if (error.status === 403) {
        notifications.warning('No tienes permisos para realizar esta acción.');
        return throwError(() => error);
      }

      if (error.status === 0) {
        notifications.error('No fue posible conectar con el servidor. Intenta nuevamente.');
      }

      return throwError(() => error);
    })
  );
};
