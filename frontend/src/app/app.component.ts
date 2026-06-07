import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationHostComponent } from './shared/notifications/notification-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationHostComponent],
  template: `
    <a class="psy-skip-link" href="#main-content">Saltar al contenido principal</a>
    <a class="psy-skip-link" href="#game-area">Saltar al juego</a>
    <app-notification-host />
    <router-outlet />
  `
})
export class AppComponent {}
