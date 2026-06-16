import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationService } from '../notifications/notification.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const token = auth.getToken();
  if (!token) {
    auth.clearSession();
    return router.createUrlTree(['/login']);
  }
  if (auth.isTokenMalformed(token)) {
    auth.clearSession();
    notifications.error('Tu sesión expiró. Inicia sesión nuevamente.');
    return router.createUrlTree(['/login']);
  }
  if (auth.isTokenExpired(token)) {
    auth.clearSession();
    notifications.warning('Tu sesión expiró. Inicia sesión nuevamente.');
    return router.createUrlTree(['/login']);
  }

  return true;
};

export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const token = auth.getToken();
  if (!token || auth.isTokenMalformed(token) || auth.isTokenExpired(token)) {
    auth.clearSession();
    notifications.warning('Tu sesión expiró. Inicia sesión nuevamente.');
    return router.createUrlTree(['/login']);
  }

  if (auth.hasRole(...roles)) return true;
  notifications.warning('No tienes permisos para acceder a esta sección.');
  return router.createUrlTree(['/portal/dashboard']);
};
