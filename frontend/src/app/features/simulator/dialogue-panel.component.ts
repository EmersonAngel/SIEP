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
        [class.strip--warning]="interaction()?.type === 'WARNING'"
        [class.strip--supervisory]="d.speakerName === 'Supervisión clínica'"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="d.speakerName + ': ' + fullText()">

        <div class="portrait" aria-hidden="true">
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
          <p class="speaker-name">{{ d.speakerName }}</p>
          <p class="dialogue-text" role="status" aria-live="polite" aria-atomic="true">{{ displayedText() }}<span class="cursor" [class.cursor--done]="isTypingComplete()" aria-hidden="true">▋</span></p>

          @if (isTypingComplete() && d.choices.length) {
            <div class="choices" role="group" aria-label="Opciones de intervención">
              @for (choice of d.choices; track choice.key; let i = $index) {
                <button
                  type="button"
                  class="choice-btn"
                  [class.choice-btn--recommended]="choice.isRecommended"
                  [class.choice-btn--prohibited]="choice.isProhibited"
                  [attr.aria-label]="(i + 1) + '. ' + choice.text + (choice.isRecommended ? ' (recomendada)' : '') + (choice.isProhibited ? ' (contraindicada)' : '')"
                  (mouseenter)="onChoiceHover()"
                  (click)="handleChoice(choice)">
                  <span class="choice-num" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="choice-btn__icon" aria-hidden="true"></span>
                  <span class="choice-btn__body">
                    <span class="choice-btn__label">{{ choice.text }}</span>
                    @if (choice.isRecommended) {
                      <span class="choice-btn__meta">Recomendada</span>
                    }
                    @if (choice.isProhibited) {
                      <span class="choice-btn__meta">Contraindicada</span>
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
      font-size: .7rem;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #B69CFF;
    }
    .strip--supervisory .speaker-name { color: #5d9278; }
    .strip--warning .speaker-name { color: #a85062; }

    .dialogue-text {
      margin: 0;
      font-size: .97rem;
      line-height: 1.6;
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
    .choice-btn--recommended .choice-btn__icon::before {
      width: 12px;
      height: 7px;
      border-top: 0;
      border-right: 0;
      border-radius: 0;
      transform: rotate(-45deg);
    }
    .choice-btn--prohibited .choice-btn__icon::before {
      content: '!';
      width: auto;
      height: auto;
      border: 0;
      font-weight: 900;
      line-height: 1;
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
    .choice-btn--recommended {
      border-color: rgba(108,192,199,.5);
      background: rgba(108,192,199,.12);
      color: #bfeef1;
    }
    .choice-btn--recommended:hover { border-color: rgba(108,192,199,.85); background: rgba(108,192,199,.2); }
    .choice-btn--prohibited {
      border-color: rgba(168,80,98,.45);
      background: rgba(168,80,98,.08);
      color: rgba(252,165,165,.88);
    }
    .choice-btn--prohibited:hover { border-color: rgba(168,80,98,.7); }

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
    @media (max-width: 560px) {
      .portrait { width: 60px; min-height: 180px; }
      .strip-body { padding: 12px 14px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dialogue-strip { animation: none; }
      .cursor { animation: none; }
    }
  `]
})
export class DialoguePanelComponent implements AfterViewChecked, OnDestroy {
  readonly dialogue    = input<DialogueState | null>(null);
  readonly interaction = input<MapObjectState | null>(null);

  readonly close   = output<void>();
  readonly execute = output<number>();
  readonly useTool = output<string>();
  readonly frontendChoice = output<string>();

  @ViewChild('dialogueBox') private dialogueBox?: ElementRef<HTMLDivElement>;

  readonly displayedText    = signal('');
  readonly isTypingComplete = signal(false);

  private typewriterHandle: ReturnType<typeof setInterval> | null = null;
  private currentLineIndex = 0;
  private readonly audio = inject(AudioDirectorService);

  constructor() {
    effect(() => {
      const d = this.dialogue();
      this.stopTypewriter();
      this.currentLineIndex = 0;
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
  }

  handleChoice(choice: DialogueChoiceState) {
    this.audio.playSfx(choice.isProhibited ? 'ui_cancel' : 'ui_confirm');
    if (choice.decisionOptionId != null) {
      this.execute.emit(choice.decisionOptionId);
    } else if (choice.requiredToolCode != null) {
      this.useTool.emit(choice.requiredToolCode);
    } else if (choice.key.startsWith('frontend:')) {
      this.frontendChoice.emit(choice.key);
    }
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
