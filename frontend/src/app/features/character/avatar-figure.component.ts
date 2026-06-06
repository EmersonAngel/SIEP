import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarConfig, HAIR_COLORS, SKIN_TONES, hexOf } from './avatar.model';

/**
 * Renderizador del avatar por capas (SVG vectorial).
 *
 * Cada capa (sombra, torso, piel, bata, rostro, cabello, accesorio) es un bloque
 * aislado marcado con "REEMPLAZO ARTE": cuando exista pixel-art real, se sustituye
 * el SVG de esa capa por su <image>/sprite sin cambiar el modelo ni la pantalla.
 */
@Component({
  selector: 'app-avatar-figure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 120 175'" class="avatar-svg" role="img"
      [attr.aria-label]="'Avatar del estudiante'">
      <!-- REEMPLAZO ARTE: sombra -->
      <ellipse cx="60" cy="168" rx="34" ry="6" fill="#000" opacity="0.28"/>

      <g [attr.transform]="pose() === 'side' ? 'translate(5 0)' : ''">
        <!-- REEMPLAZO ARTE: torso/uniforme -->
        <path d="M28 175 C30 132 40 116 60 116 C80 116 90 132 92 175 Z" [attr.fill]="uniform()"/>
        <path d="M60 116 L52 132 L60 140 L68 132 Z" [attr.fill]="uniformDark()"/>

        <!-- REEMPLAZO ARTE: bata blanca (con-bata) -->
        @if (config().uniform === 'con-bata') {
          <path d="M30 175 C32 134 42 120 60 120 L52 134 L57 175 Z" fill="#F4F7FB"/>
          <path d="M90 175 C88 134 78 120 60 120 L68 134 L63 175 Z" fill="#E7ECF3"/>
          <path d="M60 120 L52 134 L57 150 L60 140 Z" fill="#DCE3EC"/>
          <path d="M60 120 L68 134 L63 150 L60 140 Z" fill="#DCE3EC"/>
        }
        @if (showPin()) {
          <circle cx="73" cy="138" r="2.6" fill="#7C4DFF"/>
        }

        <!-- REEMPLAZO ARTE: cuello + cabeza (piel) -->
        <rect x="54" y="100" width="12" height="18" rx="5" [attr.fill]="skin()"/>
        <ellipse cx="42" cy="70" rx="4" ry="6" [attr.fill]="skin()"/>
        <ellipse cx="78" cy="70" rx="4" ry="6" [attr.fill]="skin()"/>
        <ellipse cx="60" cy="66" rx="26" ry="29" [attr.fill]="skin()"/>

        <!-- REEMPLAZO ARTE: cabello (detrás) -->
        @if (config().hairStyle === 'largo') {
          <path d="M32 60 C30 96 34 116 40 120 L46 120 C40 104 40 84 42 64 Z" [attr.fill]="hair()"/>
          <path d="M88 60 C90 96 86 116 80 120 L74 120 C80 104 80 84 78 64 Z" [attr.fill]="hair()"/>
        }
        @if (config().hairStyle === 'recogido') {
          <circle cx="60" cy="34" r="11" [attr.fill]="hair()"/>
        }

        <!-- REEMPLAZO ARTE: orejas -->
        <ellipse cx="35" cy="68" rx="4" ry="6" [attr.fill]="skin()"/>
        <ellipse cx="85" cy="68" rx="4" ry="6" [attr.fill]="skin()"/>

        <!-- REEMPLAZO ARTE: rostro -->
        <g [attr.opacity]="pose() === 'side' ? 0.96 : 1" [attr.transform]="pose() === 'side' ? 'translate(4 0)' : ''">
          <!-- cejas -->
          @if (config().brows === 'rectas') {
            <rect x="44" y="56" width="12" height="2.4" rx="1" [attr.fill]="hair()"/>
            <rect x="64" y="56" width="12" height="2.4" rx="1" [attr.fill]="hair()"/>
          } @else if (config().brows === 'suaves') {
            <path d="M44 57 Q50 54 56 57" [attr.stroke]="hair()" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <path d="M64 57 Q70 54 76 57" [attr.stroke]="hair()" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          } @else {
            <path d="M44 58 Q50 53 56 56" [attr.stroke]="hair()" stroke-width="3.2" fill="none" stroke-linecap="round"/>
            <path d="M64 56 Q70 53 76 58" [attr.stroke]="hair()" stroke-width="3.2" fill="none" stroke-linecap="round"/>
          }
          <!-- ojos -->
          @if (pose() !== 'side') {
            <ellipse cx="50" cy="64" [attr.rx]="eyeRx()" [attr.ry]="eyeRy()" fill="#fff"/>
            <circle cx="50" cy="64" r="2.1" fill="#3a2b22"/>
          }
          <ellipse cx="70" cy="64" [attr.rx]="eyeRx()" [attr.ry]="eyeRy()" fill="#fff"/>
          <circle cx="70" cy="64" r="2.1" fill="#3a2b22"/>
          <!-- nariz -->
          <path d="M60 66 L58 73 L62 73 Z" [attr.fill]="skinDark()" opacity="0.5"/>
          <!-- boca -->
          @if (config().mouth === 'sonrisa') {
            <path d="M53 79 Q60 86 67 79" stroke="#7a4a44" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          } @else if (config().mouth === 'seria') {
            <line x1="54" y1="80" x2="66" y2="80" stroke="#7a4a44" stroke-width="2.2" stroke-linecap="round"/>
          } @else {
            <path d="M54 80 Q60 83 66 80" stroke="#7a4a44" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          }
        </g>

        <!-- REEMPLAZO ARTE: cabello (adelante) -->
        @if (config().hairStyle !== 'ninguno') {
          <path d="M34 60 C34 36 48 30 60 30 C72 30 86 36 86 60 C86 50 78 44 60 44 C42 44 34 50 34 60 Z" [attr.fill]="hair()"/>
          @if (config().hairStyle === 'corto') {
            <path d="M34 58 C36 46 46 40 60 40 C74 40 84 46 86 58 L82 52 C76 46 66 44 60 44 C54 44 44 46 38 52 Z" [attr.fill]="hair()"/>
          }
          @if (config().hairStyle === 'medio' || config().hairStyle === 'largo') {
            <path d="M34 58 C33 76 35 86 38 90 L42 90 C39 80 39 68 40 58 Z" [attr.fill]="hair()"/>
            <path d="M86 58 C87 76 85 86 82 90 L78 90 C81 80 81 68 80 58 Z" [attr.fill]="hair()"/>
          }
          @if (config().fringe) {
            <path d="M38 50 C46 58 54 58 60 52 C66 58 74 58 82 50 C82 44 72 42 60 42 C48 42 38 44 38 50 Z" [attr.fill]="hair()"/>
          }
        }

        <!-- REEMPLAZO ARTE: accesorios -->
        @if (config().accessory === 'gafas') {
          <g [attr.stroke]="'#2b2b30'" stroke-width="1.6" fill="none">
            <circle cx="50" cy="64" r="6"/>
            <circle cx="70" cy="64" r="6"/>
            <line x1="56" y1="64" x2="64" y2="64"/>
          </g>
        }
        @if (config().accessory === 'pin' && config().uniform === 'sin-bata') {
          <circle cx="72" cy="136" r="2.6" fill="#7C4DFF"/>
        }
      </g>
    </svg>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .avatar-svg { width: 100%; height: 100%; display: block; }
  `]
})
export class AvatarFigureComponent {
  readonly config = input.required<AvatarConfig>();
  readonly pose = input<'front' | 'side'>('front');

  readonly skin = computed(() => hexOf(SKIN_TONES, this.config().skinTone, '#E8B596'));
  readonly skinDark = computed(() => shade(this.skin(), -22));
  readonly hair = computed(() => hexOf(HAIR_COLORS, this.config().hairColor, '#5B3A24'));
  readonly uniform = computed(() => '#5B6B82');
  readonly uniformDark = computed(() => '#46566E');

  readonly eyeRx = computed(() => this.config().eyes === 'atentos' ? 3.4 : 3);
  readonly eyeRy = computed(() => this.config().eyes === 'amables' ? 1.9 : this.config().eyes === 'atentos' ? 3 : 2.4);

  showPin(): boolean {
    return this.config().uniform === 'con-bata' || this.config().accessory === 'pin';
  }
}

/** Aclara/oscurece un hex por porcentaje (negativo = más oscuro). */
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(255 * pct / 100)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(255 * pct / 100)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(255 * pct / 100)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
