import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClinicalToolState } from '../../core/models/simulation.model';

/**
 * Dock horizontal inferior de herramientas clínicas (HUD redesign).
 * Cards compactas: atajo numérico + icono + nombre corto. Scroll horizontal
 * cuando faltan píxeles; la salida segura vive FUERA de este dock (bloque
 * separado a la izquierda en la bottom-zone del gameplay).
 */
@Component({
  selector: 'app-tool-inventory',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="tool-dock" role="toolbar" aria-label="Inventario clínico de herramientas">
      @for (tool of tools(); track tool.code; let i = $index) {
        <button
          class="tool-card"
          type="button"
          [class.tool-card--owned]="inventory().includes(tool.code)"
          [class.tool-card--locked]="!inventory().includes(tool.code)"
          [class.tool-card--selected]="selectedToolCode() === tool.code"
          [disabled]="!inventory().includes(tool.code)"
          [title]="tool.label + ' — ' + tool.description"
          [attr.aria-label]="tool.label + ': ' + tool.description + '. ' + (inventory().includes(tool.code) ? 'Disponible.' : 'No disponible.')"
          (click)="select.emit(tool.code)">
          <span class="tool-key" aria-hidden="true">{{ i + 1 }}</span>
          @if (!inventory().includes(tool.code)) {
            <mat-icon class="tool-lock" aria-hidden="true">lock</mat-icon>
          }
          <mat-icon aria-hidden="true">{{ tool.icon }}</mat-icon>
          <span class="tool-name" aria-hidden="true">{{ tool.label }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .tool-dock {
      display: flex;
      align-items: stretch;
      gap: 6px;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      padding-bottom: 2px;
    }
    .tool-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      flex-shrink: 0;
      min-width: 76px;
      max-width: 104px;
      padding: 6px 10px 5px;
      border: 1px solid rgba(182,156,255,.28);
      border-radius: 11px;
      background: rgba(8,12,18,.76);
      color: rgba(182,156,255,.6);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
    }
    .tool-card mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .tool-name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: .58rem;
      font-weight: 800;
      letter-spacing: .02em;
      line-height: 1.1;
    }
    .tool-card--owned {
      border-color: rgba(182,156,255,.5);
      color: #B69CFF;
    }
    .tool-card--owned:hover {
      border-color: rgba(182,156,255,.9);
      background: rgba(124,77,255,.18);
      box-shadow: 0 0 14px -4px rgba(124,77,255,.5);
    }
    .tool-card--owned:active { transform: translateY(1px) scale(.985); }
    .tool-card--selected {
      border-color: rgba(182,156,255,.95);
      background: rgba(124,77,255,.22);
      color: #d6c6ff;
      box-shadow: 0 0 16px -4px rgba(124,77,255,.65);
      animation: tool-pop 170ms cubic-bezier(.2,.8,.2,1);
    }
    .tool-card--locked {
      opacity: .35;
      cursor: default;
    }
    .tool-lock {
      position: absolute;
      top: 3px;
      right: 5px;
      font-size: 11px !important;
      width: 11px !important;
      height: 11px !important;
      color: rgba(232,240,244,.75);
    }
    .tool-key {
      position: absolute;
      top: 3px;
      left: 6px;
      font-size: .56rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 900;
      color: #cdbcff;
      opacity: .85;
      pointer-events: none;
    }
    .tool-card:focus-visible {
      outline: 2px solid rgba(182,156,255,.7);
      outline-offset: 2px;
    }
    @keyframes tool-pop {
      0%   { transform: scale(.94); }
      70%  { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .tool-card--selected { animation: none; }
      .tool-card--owned:active { transform: none; }
    }
  `]
})
export class ToolInventoryComponent {
  readonly tools = input<ClinicalToolState[]>([]);
  readonly inventory = input<string[]>([]);
  readonly selectedToolCode = input<string | null>(null);
  readonly select = output<string>();
}
