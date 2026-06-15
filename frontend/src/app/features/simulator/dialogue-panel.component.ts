import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, ViewChild, effect, inject, input, output, signal } from '@angular/core';
import { DialogueChoiceState, DialogueState, MapObjectState } from '../../core/models/simulation.model';
import { AudioDirectorService } from './audio-director.service';
import { digitIndex } from './dialogue-keys.util';

const CHARS_PER_SEC = 22;
const TYPEWRITER_INTERVAL_MS = Math.round(1000 / CHARS_PER_SEC); // ~45ms

@Component({
  selector: 'app-dialogue-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogue(); as d) {
      <div #dialogueBox
        class="dialogue-strip"
        [class.dialogue-strip--side]="mode() === 'side'"
        [class.strip--warning]="interaction()?.type === 'WARNING'"
        [class.strip--supervisory]="d.speakerName === 'Supervisión clínica'"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="d.speakerName + ': ' + fullText()">

        <div class="portrait" aria-hidden="true" [style.color]="emotionColor(d.emotion)">
          <svg viewBox="0 0 48 48" class="portrait-svg" width="40" height="40">
            <circle cx="24" cy="18" r="9" fill="currentColor"/>
            <path d="M8 44 C8 33 15 28 24 28 C33 28 40 33 40 44 Z" fill="currentColor"/>
          </svg>
          @if (d.emotion && d.emotion !== 'neutral') {
            <span class="emotion-chip" [attr.data-emotion]="d.emotion"></span>
          }
        </div>

        <!-- Text area -->
        <div class="strip-body">
          <p class="speaker-name">{{ d.speakerName }}
            @if (emotionLabel(d.emotion); as em) {
              <span class="emotion-tag" [style.color]="emotionColor(d.emotion)">{{ em }}</span>
            }
          </p>
          <p class="dialogue-text" role="status" aria-live="polite" aria-atomic="true">{{ displayedText() }}<span class="cursor" [class.cursor--done]="isTypingComplete()" aria-hidden="true">▋</span></p>

          @if (isTypingComplete() && d.choices.length) {
            <div class="choices" role="group" aria-label="Opciones de intervención"
              [class.choices--locked]="chosenKey() !== null">
              @for (choice of d.choices; track choice.key; let i = $index) {
                <button
                  type="button"
                  class="choice-btn"
                  [class.choice-btn--chosen]="chosenKey() === choice.key"
                  [style.--stagger]="i"
                  [attr.aria-label]="(i + 1) + '. ' + choice.text + (choice.evidenceWarning ? ' (información incompleta)' : '')"
                  (mouseenter)="onChoiceHover()"
                  (click)="handleChoice(choice)">
                  <span class="choice-num" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="choice-btn__icon" aria-hidden="true"></span>
                  <span class="choice-btn__body">
                    <span class="choice-btn__label">{{ choice.text }}</span>
                    @if (choice.evidenceWarning) {
                      <span class="choice-btn__meta choice-btn__meta--evidence">Información incompleta</span>
                    }
                  </span>
                </button>
              }
            </div>
          }

          @if (!isTypingComplete()) {
            <button type="button" class="close-btn psy-button psy-button--ghost"
              (click)="skipTypewriter()"
              aria-label="Saltar animación de texto">
              Saltar <span aria-hidden="true">▶</span>
            </button>
          }
          @if (isTypingComplete() && !d.choices.length) {
            <button type="button" class="close-btn psy-button psy-button--ghost"
              (click)="close.emit()"
              aria-label="Cerrar diálogo (Esc)">
              Continuar <span aria-hidden="true">▶</span>
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .dialogue-strip {
      width: 100%;
      min-height: 180px;
      display: flex;
      align-items: flex-start;
      gap: 0;
      padding: 0;
      background: rgba(8,12,18,.95);
      border-top: 2px solid rgba(182,156,255,.4);
      backdrop-filter: blur(16px) saturate(110%);
      animation: strip-rise 160ms cubic-bezier(.2,.8,.2,1) both;
    }
    .strip--warning {
      border-top-color: rgba(168,80,98,.6);
    }
    .strip--supervisory {
      border-top-color: rgba(79,163,100,.6);
      background: rgba(8,14,10,.95);
    }

    .portrait {
      position: relative;
      flex-shrink: 0;
      width: 88px;
      min-height: 180px;
      display: grid;
      place-items: center;
      border-right: 1px solid rgba(182,156,255,.2);
      background: rgba(124,77,255,.08);
    }
    .portrait-svg {
      color: #B69CFF;
    }
    .emotion-chip {
      position: absolute;
      bottom: 12px;
      right: 12px;
      width: 10px;
      height: 10px;
      background: #B69CFF;
      border: 2px solid rgba(8,12,18,.92);
      border-radius: 50%;
    }

    .strip-body {
      flex: 1;
      padding: 16px 22px 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .speaker-name {
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: .7rem;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #B69CFF;
    }
    .strip--supervisory .speaker-name { color: #5d9278; }
    .strip--warning .speaker-name { color: #a85062; }
    .emotion-tag {
      font-size: .6rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: lowercase;
      opacity: .75;
    }
    .emotion-tag::before { content: '· '; opacity: .6; }

    .dialogue-text {
      margin: 0;
      font-size: .97rem;
      line-height: 1.65;
      letter-spacing: .01em;
      color: rgba(232,240,244,.92);
      min-height: 1.6em;
      white-space: pre-line;
    }
    .cursor {
      display: inline-block;
      animation: blink .6s step-end infinite;
      color: #B69CFF;
      margin-left: 1px;
    }
    .cursor--done { display: none; }

    .choices {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      margin-top: 4px;
    }
    .choice-btn {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      min-height: 64px;
      padding: 11px 12px;
      border-radius: 14px;
      border: 1px solid rgba(182,156,255,.3);
      background: rgba(255,255,255,.06);
      color: rgba(232,240,244,.9);
      font: inherit;
      font-size: .82rem;
      line-height: 1.35;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 14px 34px -22px rgba(124,77,255,.5);
      transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
    }
    .choice-btn:hover {
      transform: translateY(-1px);
      border-color: rgba(182,156,255,.7);
      background: rgba(124,77,255,.16);
    }
    .choice-btn:focus-visible {
      outline: 3px solid rgba(182,156,255,.5);
      outline-offset: 3px;
    }
    /* Entrada escalonada de opciones (sutil, una sola vez). */
    .choice-btn {
      animation: choice-in 200ms cubic-bezier(.2,.8,.2,1) both;
      animation-delay: calc(var(--stagger, 0) * 45ms);
    }
    /* Confirmación: la card elegida se resalta y las demás ceden. */
    .choices--locked .choice-btn { pointer-events: none; }
    .choices--locked .choice-btn:not(.choice-btn--chosen) { opacity: .45; }
    .choice-btn--chosen {
      border-color: rgba(232,240,244,.85) !important;
      background: rgba(124,77,255,.3);
      animation: choice-confirm 170ms ease both;
    }
    @keyframes choice-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes choice-confirm {
      0%   { transform: scale(1); }
      45%  { transform: scale(.985); }
      100% { transform: scale(1); }
    }
    .choice-num {
      display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0;
      border-radius: 7px; border: 1px solid rgba(182,156,255,.5);
      background: rgba(124,77,255,.16); color: #cdbcff;
      font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: .76rem;
    }
    .choice-btn__icon {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: rgba(124,77,255,.14);
      color: #cdbcff;
    }
    .choice-btn__icon::before {
      content: '';
      width: 10px;
      height: 10px;
      border: 2px solid currentColor;
      border-radius: 50%;
    }
    .choice-btn__body { display: grid; gap: 5px; min-width: 0; }
    .choice-btn__label { display: block; }
    .choice-btn__meta {
      width: fit-content;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid currentColor;
      font-size: .66rem;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
      opacity: .85;
    }
    .choice-btn__meta--evidence {
      border-color: rgba(245,184,75,.6);
      color: #f5d49b;
    }
    .close-btn {
      align-self: flex-end;
      font-size: .88rem;
      padding: 9px 20px;
      min-height: 42px;
      cursor: pointer;
    }

    @keyframes strip-rise {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }
    /* ── Modo lateral (panel derecho del HUD redesign) ──────────────────── */
    .dialogue-strip--side {
      flex-direction: column;
      min-height: 0;
      height: 100%;
      border-top: none;
      background: transparent;
      backdrop-filter: none;
      animation: none;
      overflow-y: auto;
    }
    .dialogue-strip--side .portrait {
      flex-direction: row;
      width: 100%;
      min-height: 0;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: flex-start;
      border-right: none;
      border-bottom: 1px solid rgba(182,156,255,.18);
    }
    .dialogue-strip--side .portrait-svg { width: 30px; height: 30px; }
    .dialogue-strip--side .emotion-chip { position: static; }
    .dialogue-strip--side .strip-body {
      padding: 12px 16px 16px;
      gap: 10px;
    }
    .dialogue-strip--side .dialogue-text { font-size: .88rem; line-height: 1.55; }
    .dialogue-strip--side .choices { grid-template-columns: minmax(0, 1fr); }
    .dialogue-strip--side .choice-btn { min-height: 56px; }

    @media (max-width: 560px) {
      .portrait { width: 60px; min-height: 180px; }
      .dialogue-strip--side .portrait { width: 100%; min-height: 0; }
      .strip-body { padding: 12px 14px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dialogue-strip { animation: none; }
      .cursor { animation: none; }
      .choice-btn, .choice-btn--chosen { animation: none; }
      .choice-btn:hover { transform: none; }
    }
  `]
})
export class DialoguePanelComponent implements AfterViewChecked, OnDestroy {
  readonly dialogue    = input<DialogueState | null>(null);
  readonly interaction = input<MapObjectState | null>(null);
  /** 'cinematic' = franja inferior a lo ancho; 'side' = columna en panel derecho. */
  readonly mode        = input<'cinematic' | 'side'>('cinematic');

  readonly close   = output<void>();
  readonly execute = output<number>();
  readonly useTool = output<string>();
  readonly frontendChoice = output<string>();

  @ViewChild('dialogueBox') private dialogueBox?: ElementRef<HTMLDivElement>;

  readonly displayedText    = signal('');
  readonly isTypingComplete = signal(false);
  /** Opción ya elegida: pausa breve de confirmación antes de ejecutar. */
  readonly chosenKey = signal<string | null>(null);

  private typewriterHandle: ReturnType<typeof setInterval> | null = null;
  private confirmHandle: ReturnType<typeof setTimeout> | null = null;
  private currentLineIndex = 0;
  private readonly audio = inject(AudioDirectorService);

  constructor() {
    effect(() => {
      const d = this.dialogue();
      this.stopTypewriter();
      this.currentLineIndex = 0;
      this.chosenKey.set(null);
      if (d?.lines?.length) {
        this.audio.playSfx('ui_select');
        const fullText = d.lines.map(l => l.text).join('\n');
        this.startTypewriter(fullText);
      } else {
        this.displayedText.set('');
        this.isTypingComplete.set(true);
      }
    });
  }

  /** Color del retrato/etiqueta según la emoción del hablante. */
  emotionColor(emotion: string | null | undefined): string {
    switch (emotion) {
      case 'positive': return '#6EC67A';
      case 'concerned': return '#F5B84B';
      case 'danger': return '#E25A4F';
      default: return '#B69CFF';
    }
  }

  /** Estado emocional textual discreto (null = no se muestra). */
  emotionLabel(emotion: string | null | undefined): string | null {
    switch (emotion) {
      case 'positive': return 'receptiva';
      case 'concerned': return 'preocupada';
      case 'danger': return 'alerta';
      default: return null;
    }
  }

  onChoiceHover(): void {
    this.audio.playSfx('ui_select');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const d = this.dialogue();
    if (!d) return;

    // Escape: safe exit (REGLA-004 — always reachable via keyboard)
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close.emit();
      return;
    }

    // Space or Enter: skip typewriter animation when still typing
    if ((e.key === ' ' || e.key === 'Enter') && !this.isTypingComplete()) {
      e.preventDefault();
      this.skipTypewriter();
      return;
    }

    if (!this.isTypingComplete()) return;

    if (e.key === 'Enter' && !d.choices.length) {
      e.preventDefault();
      this.close.emit();
      return;
    }

    // Digit keys: select choice by number
    if (d.choices.length) {
      const idx = digitIndex(e.key);
      if (idx !== null && idx < d.choices.length) {
        e.preventDefault();
        this.handleChoice(d.choices[idx]);
      }
    }
  }

  ngAfterViewChecked() {
    // Ensure dialogue box is scrolled to bottom when new text renders
    if (this.dialogueBox) {
      const el = this.dialogueBox.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  ngOnDestroy() {
    this.stopTypewriter();
    if (this.confirmHandle !== null) clearTimeout(this.confirmHandle);
  }

  handleChoice(choice: DialogueChoiceState) {
    if (this.chosenKey() !== null) return;   // ya hay una elección en curso
    this.chosenKey.set(choice.key);
    this.audio.playSfx('ui_confirm');
    // Pausa breve de confirmación: la card elegida se resalta antes de ejecutar.
    this.confirmHandle = setTimeout(() => {
      this.confirmHandle = null;
      if (choice.decisionOptionId != null) {
        this.execute.emit(choice.decisionOptionId);
      } else if (choice.requiredToolCode != null) {
        this.useTool.emit(choice.requiredToolCode);
      } else if (choice.key.startsWith('frontend:')) {
        this.frontendChoice.emit(choice.key);
      }
    }, 170);
  }

  /** Skip typewriter animation — shows full text immediately. */
  skipTypewriter(): void {
    if (this.isTypingComplete()) return;
    this.stopTypewriter();
    const d = this.dialogue();
    if (d?.lines?.length) {
      this.displayedText.set(d.lines.map(l => l.text).join('\n'));
    }
    this.isTypingComplete.set(true);
  }

  fullText(): string {
    return this.dialogue()?.lines?.map(l => l.text).join(' ') ?? '';
  }

  private startTypewriter(text: string) {
    this.displayedText.set('');
    this.isTypingComplete.set(false);
    let pos = 0;
    this.typewriterHandle = setInterval(() => {
      pos++;
      this.displayedText.set(text.slice(0, pos));
      if (pos >= text.length) {
        this.stopTypewriter();
        this.isTypingComplete.set(true);
      }
    }, TYPEWRITER_INTERVAL_MS);
  }

  private stopTypewriter() {
    if (this.typewriterHandle !== null) {
      clearInterval(this.typewriterHandle);
      this.typewriterHandle = null;
    }
  }
}
