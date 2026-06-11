import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AudioDirectorService } from './audio-director.service';

export type JournalSaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Bitácora reflexiva como overlay modal centrado (HUD redesign):
 * reflexión guiada + trazabilidad de decisiones + recursos de apoyo.
 */
@Component({
  selector: 'app-journal-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="journal-modal"
      [class.journal-modal--open]="open()"
      role="dialog"
      aria-modal="true"
      [attr.aria-hidden]="!open()"
      aria-label="Bitácora reflexiva cifrada">

      <div class="sheet-header">
        <mat-icon aria-hidden="true">menu_book</mat-icon>
        <div class="sheet-header__copy">
          <h3 id="journal-heading">Bitácora reflexiva</h3>
          <p class="psy-eyebrow sheet-sub">Razonamiento ético y formativo</p>
        </div>
        <button class="sheet-close psy-icon-button" type="button" aria-label="Cerrar bitácora y continuar la simulación" (click)="onCloseClick()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="journal-columns">
        <section class="journal-write" aria-label="Registro reflexivo">
          <ul class="guided-prompts" aria-label="Preguntas guía">
            @for (prompt of prompts(); track prompt) {
              <li>{{ prompt }}</li>
            }
          </ul>

          <textarea
            [(ngModel)]="text"
            [disabled]="disabled() || saveState() === 'saving'"
            placeholder="Registra señales observadas, hipótesis de riesgo, ruta ética y decisión profesional."
            aria-labelledby="journal-heading"
            aria-describedby="encrypt-note journal-status"></textarea>

          <button class="psy-button psy-button--primary" type="button"
            (click)="save.emit(text)"
            [disabled]="!text.trim() || disabled() || saveState() === 'saving'">
            <mat-icon aria-hidden="true">{{ saveState() === 'saving' ? 'hourglass_top' : 'encrypted' }}</mat-icon>
            {{ saveState() === 'saving' ? 'Guardando…' : 'Guardar bitácora' }}
          </button>

          @if (message()) {
            <p id="journal-status" class="journal-message"
              [class.journal-message--error]="saveState() === 'error'"
              [class.journal-message--saved]="saveState() === 'saved'"
              role="status" aria-live="polite">{{ message() }}</p>
          }
        </section>

        @if (timeline().length || resources().length) {
          <aside class="journal-context" aria-label="Contexto del caso">
            @if (timeline().length) {
              <div class="context-block">
                <p class="context-title">Trazabilidad</p>
                <ol>
                  @for (stage of timeline(); track stage) {
                    <li>{{ stage }}</li>
                  }
                </ol>
              </div>
            }
            @if (resources().length) {
              <div class="context-block">
                <p class="context-title">Apoyo profesional</p>
                <ul>
                  @for (resource of resources(); track resource) {
                    <li>{{ resource }}</li>
                  }
                </ul>
              </div>
            }
          </aside>
        }
      </div>

      <footer class="sheet-footer">
        <p class="encrypt-note" id="encrypt-note">
          <mat-icon aria-hidden="true">lock</mat-icon>
          Las bitácoras se cifran con AES-GCM antes de guardarse.
        </p>
        <button class="psy-button psy-button--ghost continue-btn" type="button" (click)="onCloseClick()">
          Continuar simulación
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .journal-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(760px, 94vw);
      max-height: min(620px, 88vh);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
      padding: 20px;
      border: 1px solid rgba(182,156,255,.3);
      border-radius: 18px;
      background: rgba(13,18,32,.96);
      backdrop-filter: blur(20px) saturate(115%);
      box-shadow: 0 28px 80px -32px rgba(124,77,255,.55);
      color: #e8f0f4;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translate(-50%, -47%) scale(.97);
      transition: opacity 220ms ease, transform 220ms cubic-bezier(.2,.8,.2,1), visibility 220ms;
      overflow: hidden;
      z-index: 100;
    }
    .journal-modal--open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }
    .sheet-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(182,156,255,.14);
    }
    .sheet-header > mat-icon { color: #B69CFF; flex-shrink: 0; }
    .sheet-header__copy { flex: 1; min-width: 0; }
    .sheet-header h3 {
      margin: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      font-size: 1.1rem;
      color: rgba(232,240,244,.95);
    }
    .sheet-close {
      background: rgba(255,255,255,.06);
      border-color: rgba(255,255,255,.1);
      color: rgba(232,240,244,.5);
      flex-shrink: 0;
    }
    .sheet-sub { color: rgba(182,156,255,.7); margin: 2px 0 0; }

    .journal-columns {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      gap: 16px;
      min-height: 0;
    }
    .journal-write {
      display: grid;
      grid-template-rows: auto minmax(96px, 1fr) auto auto;
      gap: 12px;
      min-height: 0;
    }
    .guided-prompts {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 4px;
      color: rgba(232,240,244,.55);
      font-size: .76rem;
      line-height: 1.4;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      resize: none;
      padding: 12px 14px;
      border: 1px solid rgba(182,156,255,.22);
      border-radius: 12px;
      background: rgba(255,255,255,.04);
      color: #e8f0f4;
      font: inherit;
      line-height: 1.55;
      outline: none;
    }
    textarea:focus { border-color: rgba(182,156,255,.55); box-shadow: 0 0 0 3px rgba(124,77,255,.12); }
    textarea:disabled { opacity: .4; cursor: not-allowed; }
    .journal-message { margin: 0; font-weight: 800; font-size: .84rem; color: #6EC67A; }
    .journal-message--error { color: #c97a86; }
    .journal-message--saved { color: #6EC67A; }

    .journal-context {
      display: grid;
      align-content: start;
      gap: 14px;
      min-height: 0;
      overflow-y: auto;
      padding: 12px;
      border: 1px solid rgba(182,156,255,.16);
      border-radius: 12px;
      background: rgba(124,77,255,.06);
    }
    .context-block { display: grid; gap: 8px; }
    .context-title {
      margin: 0;
      color: #B69CFF;
      font-size: .68rem;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .journal-context ol,
    .journal-context ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
    .journal-context li { color: rgba(232,240,244,.66); font-size: .78rem; line-height: 1.4; }

    .sheet-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid rgba(255,255,255,.06);
      padding-top: 12px;
    }
    .encrypt-note {
      display: flex; gap: 8px; align-items: center;
      margin: 0; font-size: .7rem;
      color: rgba(232,240,244,.28);
    }
    .encrypt-note mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .continue-btn { flex-shrink: 0; }

    @media (max-width: 700px) {
      .journal-modal { padding: 14px; max-height: 92vh; }
      .journal-columns { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
      .journal-context { order: 2; }
    }
    @media (prefers-reduced-motion: reduce) {
      .journal-modal { transition: none; }
    }
  `]
})
export class JournalPanelComponent {
  readonly open = input(false);
  readonly disabled = input(false);
  readonly message = input('');
  readonly saveState = input<JournalSaveState>('idle');
  readonly timeline = input<string[]>([]);
  readonly resources = input<string[]>([]);
  readonly prompts = input<string[]>([
    '¿Qué señales de riesgo identificaste?',
    '¿Qué decisión cambiarías si repitieras el caso?',
    '¿Qué principio ético aplicaste?',
    '¿Qué ruta institucional consideraste?',
    '¿Cómo evitaste revictimizar a la persona afectada?'
  ]);
  readonly save = output<string>();
  readonly closeSheet = output<void>();

  text = '';
  private readonly audio = inject(AudioDirectorService);

  constructor() {
    effect(() => { if (this.open()) this.audio.playSfx('ui_select'); });
  }

  onCloseClick(): void {
    this.audio.playSfx('ui_cancel');
    this.closeSheet.emit();
  }

  clear() {
    this.text = '';
  }
}
