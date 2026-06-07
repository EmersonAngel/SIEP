import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface QuickAction {
  label: string;
  route: string;
  icon: string;
  accent?: boolean;
}

/**
 * Panel de acciones rápidas del dashboard, extraído de DashboardComponent.
 *
 * Presentacional: recibe la lista de accesos directos y los pinta como tarjetas
 * enlazadas. Sin lógica ni llamadas de red.
 */
@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="quick-actions pixel-panel" aria-label="Acciones rápidas">
      <p class="pixel-section-title">Acciones rápidas</p>
      <div class="quick-actions__grid">
        @for (action of actions(); track action.label) {
          <a class="quick-action-card" [class.quick-action-card--accent]="action.accent" [routerLink]="action.route">
            <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            <span>{{ action.label }}</span>
          </a>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      --dash-purple-main: #4b00b5;
      --dash-ink: #1a2b3c;
      --dash-pixel-shadow: 5px 5px 0 rgba(75, 0, 181, 0.06);
      --dash-border: 2px solid rgba(75, 0, 181, 0.14);
      display: block;
      min-width: 0;
    }

    .pixel-panel {
      position: relative;
      overflow: hidden;
      background: #ffffff;
      border: var(--dash-border);
      border-radius: 20px;
      box-shadow: var(--dash-pixel-shadow);
    }

    .pixel-panel::before {
      content: '';
      position: absolute;
      top: 14px;
      right: 14px;
      width: 8px;
      height: 8px;
      background: rgba(124, 77, 255, 0.45);
      box-shadow:
        -14px 0 0 rgba(0, 82, 130, 0.25),
        -28px 0 0 rgba(46, 125, 50, 0.22);
      pointer-events: none;
    }

    .pixel-section-title {
      margin: 0 0 10px;
      color: #5a3e86;
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .quick-actions {
      padding: 18px 20px;
    }

    .quick-actions__grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }

    .quick-action-card {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 54px;
      padding: 12px 14px;
      border: var(--dash-border);
      border-radius: 14px;
      background: #fff;
      color: var(--dash-ink);
      text-decoration: none;
      font-size: 0.86rem;
      font-weight: 800;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .quick-action-card mat-icon {
      color: var(--dash-purple-main);
    }

    .quick-action-card:hover,
    .quick-action-card:focus-visible {
      transform: translate(-1px, -1px);
      box-shadow: var(--dash-pixel-shadow);
      outline: 2px solid rgba(75, 0, 181, 0.35);
      outline-offset: 2px;
    }

    .quick-action-card--accent {
      background: linear-gradient(135deg, rgba(75, 0, 181, 0.08), #fff);
      border-color: rgba(75, 0, 181, 0.24);
    }

    @media (max-width: 912px) {
      .quick-actions__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 390px) {
      .quick-actions__grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class QuickActionsComponent {
  readonly actions = input.required<QuickAction[]>();
}
