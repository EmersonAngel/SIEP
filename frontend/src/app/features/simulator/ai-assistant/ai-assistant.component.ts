import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open()) {
      <section class="assistant-shell" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
        <header class="assistant-head">
          <div>
            <p>Chatbot</p>
            <h3 id="assistant-title">Instructor guia chatbot</h3>
          </div>
          <button type="button" aria-label="Cerrar asistente" (click)="close.emit()">x</button>
        </header>

        <div class="assistant-log" role="log" aria-live="polite" aria-label="Conversacion con asistente">
          @if (!messages().length) {
            <article class="message assistant">
              Puedo ayudarte a pensar el caso sin decirte que opcion escoger.
            </article>
          }
          @for (msg of messages(); track $index) {
            <article class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              {{ msg.text }}
            </article>
          }
          @if (loading()) {
            <article class="message assistant message--loading">Pensando...</article>
          }
        </div>

        <form class="assistant-form" (ngSubmit)="sendQuestion()">
          <input
            name="assistant-question"
            type="text"
            [(ngModel)]="currentQuestion"
            [disabled]="loading()"
            placeholder="Pregunta sobre el caso..."
            autocomplete="off"
            aria-label="Pregunta al asistente" />
          <button type="submit" [disabled]="loading() || !currentQuestion.trim()">Enviar</button>
        </form>

        <p class="assistant-note">No revela respuestas correctas antes de decidir.</p>
      </section>
    }
  `,
  styles: [`
    .assistant-shell {
      position: absolute;
      right: 18px;
      top: 108px;
      z-index: 170;
      width: min(380px, calc(100vw - 28px));
      max-height: min(72vh, 620px);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      overflow: hidden;
      border: 1px solid rgba(182,156,255,.28);
      border-radius: 14px;
      background: rgba(9,13,22,.94);
      box-shadow: 0 24px 70px -36px rgba(124,77,255,.85);
      color: #f4f7fb;
      backdrop-filter: blur(18px) saturate(120%);
      animation: assistant-in 180ms ease both;
    }
    .assistant-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 14px 12px;
      border-bottom: 1px solid rgba(182,156,255,.18);
      background: rgba(124,77,255,.1);
    }
    .assistant-head p {
      margin: 0 0 2px;
      color: #6cc0c7;
      font-size: .66rem;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .assistant-head h3 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.2;
    }
    .assistant-head button {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: #f4f7fb;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
    .assistant-log {
      min-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      scrollbar-color: rgba(182,156,255,.45) rgba(255,255,255,.06);
    }
    .message {
      max-width: 88%;
      padding: 8px 10px;
      border-radius: 12px;
      font-size: .82rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .message.user {
      align-self: flex-end;
      background: rgba(124,77,255,.24);
      color: #e8e0ff;
    }
    .message.assistant {
      align-self: flex-start;
      background: rgba(255,255,255,.07);
      color: rgba(244,247,251,.9);
    }
    .message--loading { color: rgba(244,247,251,.55); font-style: italic; }
    .assistant-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      padding: 10px 12px 0;
    }
    .assistant-form input {
      min-width: 0;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 10px;
      background: rgba(255,255,255,.06);
      color: #f4f7fb;
      padding: 9px 10px;
      font-size: .82rem;
    }
    .assistant-form input:focus-visible,
    .assistant-form button:focus-visible,
    .assistant-head button:focus-visible {
      outline: 2px solid rgba(108,192,199,.85);
      outline-offset: 2px;
    }
    .assistant-form button {
      border: 0;
      border-radius: 10px;
      background: #7c4dff;
      color: white;
      padding: 0 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .assistant-form button:disabled,
    .assistant-form input:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
    .assistant-note {
      margin: 0;
      padding: 8px 12px 12px;
      color: rgba(244,247,251,.48);
      font-size: .68rem;
      line-height: 1.35;
    }
    @keyframes assistant-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 640px) {
      .assistant-shell {
        top: 58px;
        right: 10px;
        left: 10px;
        width: auto;
        max-height: 68vh;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .assistant-shell { animation: none; }
    }
  `]
})
export class AIAssistantComponent {
  readonly open = input(false);
  readonly attemptId = input<string>('');
  readonly currentNodeId = input<string>('');
  readonly decisionAlreadyTaken = input(false);
  readonly close = output<void>();

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  currentQuestion = '';

  constructor(private readonly http: HttpClient) {}

  async sendQuestion(): Promise<void> {
    const question = this.currentQuestion.trim();
    if (!question || this.loading()) return;

    this.currentQuestion = '';
    this.messages.update(messages => [...messages, { role: 'user', text: question }]);
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<{ response: string }>('/api/simulation/ai-assistant', {
          attempt_id: this.attemptId(),
          question,
          current_node_id: this.currentNodeId(),
          decision_already_taken: this.decisionAlreadyTaken(),
        })
      );
      this.messages.update(messages => [...messages, {
        role: 'assistant',
        text: response.response || 'No recibi una respuesta del asistente.',
      }]);
    } catch {
      this.messages.update(messages => [...messages, {
        role: 'assistant',
        text: 'No pude conectar con el asistente. Revisa la configuracion del backend.',
      }]);
    } finally {
      this.loading.set(false);
    }
  }
}
