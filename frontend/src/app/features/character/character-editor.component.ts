import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AvatarFigureComponent } from './avatar-figure.component';
import { AvatarStore } from './avatar.store';
import {
  AvatarConfig,
  ClothingColor,
  HairColor,
  HairStyle,
  Uniform,
  CLOTHING_COLORS,
  GENDER_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTHS,
  UNIFORMS,
} from './avatar.model';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarFigureComponent],
  template: `
    <div class="ce-container" id="main-content" tabindex="-1">
      <header class="ce-header glass">
        <div>
          <p class="ce-kicker">Editor de personaje</p>
          <h1>Personaliza tu avatar profesional</h1>
          <p class="ce-sub">Crea la identidad con la que entraras a los casos. No afecta tu evaluacion.</p>
        </div>
        <div class="ce-id">
          <span class="ce-chip">Programa: Psicologia</span>
          <span class="ce-chip ce-chip--soft">Rol: {{ roleLabel() }}</span>
          <a class="ce-btn ce-btn--ghost" routerLink="/portal/dashboard">Volver</a>
        </div>
      </header>

      <div class="ce-grid">
        <section class="ce-panel glass" aria-label="Apariencia">
          <p class="ce-section">Cuerpo</p>
          <div class="ce-opts" role="radiogroup" aria-label="Genero">
            @for (o of genderOptions; track o.id) {
              <button type="button" class="ce-opt" [class.sel]="avatar().gender === o.id"
                role="radio" [attr.aria-checked]="avatar().gender === o.id"
                (click)="store.update({ gender: o.id })">{{ o.label }}</button>
            }
          </div>

          <p class="ce-section">Ropa</p>
          <div class="ce-swatches" role="radiogroup" aria-label="Color de ropa">
            @for (o of clothingColors; track o.id) {
              <button type="button" class="ce-swatch" [class.sel]="avatar().clothingColor === o.id"
                [style.background]="o.value"
                [title]="o.label"
                role="radio" [attr.aria-checked]="avatar().clothingColor === o.id"
                (click)="setClothingColor(o.id)"></button>
            }
          </div>

          <p class="ce-section">Cabello</p>
          <div class="ce-opts" role="radiogroup" aria-label="Forma de cabello">
            @for (o of hairStyles; track o.id) {
              <button type="button" class="ce-opt" [class.sel]="avatar().hairStyle === o.id"
                role="radio" [attr.aria-checked]="avatar().hairStyle === o.id"
                (click)="setHairStyle(o.id)">{{ o.label }}</button>
            }
          </div>

          @if (avatar().hairStyle !== 'ninguno') {
            <div class="ce-swatches" role="radiogroup" aria-label="Color de cabello">
              @for (o of hairColors; track o.id) {
                <button type="button" class="ce-swatch" [class.sel]="avatar().hairColor === o.id"
                  [style.background]="o.value"
                  [title]="o.label"
                  role="radio" [attr.aria-checked]="avatar().hairColor === o.id"
                  (click)="setHairColor(o.id)"></button>
              }
            </div>
          }

          <p class="ce-section">Expresion</p>
          <div class="ce-opts" role="radiogroup" aria-label="Expresion">
            @for (o of mouths; track o.id) {
              <button type="button" class="ce-opt" [class.sel]="avatar().mouth === o.id"
                role="radio" [attr.aria-checked]="avatar().mouth === o.id"
                (click)="store.update({ mouth: o.id })">{{ o.label }}</button>
            }
          </div>
        </section>

        <section class="ce-stage glass" aria-label="Vista previa del avatar">
          <div class="ce-halo"></div>
          <app-avatar-figure class="ce-figure" [config]="avatar()" [pose]="pose()" />
          <div class="ce-pose" role="radiogroup" aria-label="Pose">
            <button type="button" class="ce-opt" [class.sel]="pose() === 'front'"
              role="radio" [attr.aria-checked]="pose() === 'front'" (click)="pose.set('front')">Frontal</button>
            <button type="button" class="ce-opt" [class.sel]="pose() === 'side'"
              role="radio" [attr.aria-checked]="pose() === 'side'" (click)="pose.set('side')">Lateral</button>
          </div>
          <p class="sr-only">{{ avatarSummary() }}</p>
        </section>

        <section class="ce-panel glass" aria-label="Resumen">
          <p class="ce-section">Uniforme</p>
          <div class="ce-uniforms" role="radiogroup" aria-label="Uniforme">
            @for (u of uniforms; track u.id) {
              <button type="button" class="ce-uniform" [class.sel]="avatar().uniform === u.id"
                role="radio" [attr.aria-checked]="avatar().uniform === u.id"
                [disabled]="u.id === 'con-bata'"
                (click)="store.update({ uniform: u.id })">
                <app-avatar-figure class="ce-uniform-fig" [config]="withUniform(u.id)" />
                <span>{{ u.label }}</span>
                @if (u.id === 'con-bata') { <small class="ce-soon">Proximamente</small> }
              </button>
            }
          </div>

          <p class="ce-section">Resumen</p>
          <ul class="ce-summary">
            <li><span>Rol</span><strong>{{ roleLabel() }}</strong></li>
            <li><span>Genero</span><strong>{{ labelOf(genderOptions, avatar().gender) }}</strong></li>
            <li><span>Ropa</span><strong>{{ labelOf(clothingColors, avatar().clothingColor) }}</strong></li>
            <li><span>Cabello</span><strong>{{ labelOf(hairStyles, avatar().hairStyle) }} {{ hairColorLabel() }}</strong></li>
            <li><span>Expresion</span><strong>{{ labelOf(mouths, avatar().mouth) }}</strong></li>
          </ul>
        </section>
      </div>

      <footer class="ce-footer glass">
        <button type="button" class="ce-btn ce-btn--ghost" (click)="restablecer()">Restablecer</button>
        <button type="button" class="ce-btn ce-btn--primary" (click)="guardar()">Guardar personaje</button>
        <button type="button" class="ce-btn ce-btn--go" (click)="continuar()">Continuar</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ce-container {
      --pp: #7C4DFF; --pl: #B69CFF; --ink: #F4F7FB; --ink-soft: rgba(244,247,251,.72);
      --surface: rgba(27,33,51,.72); --surface-2: rgba(18,24,42,.6); --border: rgba(182,156,255,.22);
      --glow: 0 18px 48px -28px rgba(124,77,255,.6);
      min-height: 100%; padding: 18px; color: var(--ink);
      background:
        linear-gradient(90deg, rgba(124,77,255,.05) 1px, transparent 1px) 0 0 / 26px 26px,
        linear-gradient(rgba(124,77,255,.05) 1px, transparent 1px) 0 0 / 26px 26px,
        linear-gradient(180deg, #111827 0%, #0e1322 100%);
    }
    .glass { background: var(--surface); backdrop-filter: blur(18px) saturate(125%); border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--glow); }
    .ce-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 20px; margin-bottom: 14px; }
    .ce-kicker { margin: 0; color: var(--pl); font-size: .72rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
    .ce-header h1 { margin: 4px 0; font-size: clamp(1.2rem,2vw,1.6rem); color: var(--ink); }
    .ce-sub { margin: 0; color: var(--ink-soft); font-size: .86rem; }
    .ce-id { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ce-chip { padding: 6px 12px; border-radius: 999px; background: rgba(124,77,255,.16); border: 1px solid rgba(124,77,255,.4); color: #d6c6ff; font-size: .76rem; font-weight: 800; }
    .ce-chip--soft { background: var(--surface-2); border-color: var(--border); color: var(--ink-soft); }
    .ce-grid { display: grid; grid-template-columns: 310px minmax(0,1fr) 300px; gap: 14px; align-items: start; }
    .ce-panel { padding: 16px; display: grid; gap: 12px; max-height: calc(100vh - 230px); overflow-y: auto; }
    .ce-section { margin: 4px 0 0; color: var(--pl); font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .ce-opts { display: flex; flex-wrap: wrap; gap: 6px; }
    .ce-opt { padding: 6px 11px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--ink-soft); font-size: .78rem; font-weight: 700; cursor: pointer; transition: all .15s; }
    .ce-opt:hover { border-color: rgba(182,156,255,.5); color: var(--ink); }
    .ce-opt.sel { background: rgba(124,77,255,.2); border-color: var(--pl); color: #e7ddff; }
    .ce-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
    .ce-swatch { width: 31px; height: 31px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); cursor: pointer; transition: transform .15s, border-color .15s, box-shadow .15s; }
    .ce-swatch.sel { border-color: var(--pl); box-shadow: 0 0 0 3px rgba(124,77,255,.3); transform: scale(1.08); }
    .ce-stage { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; min-height: 420px; overflow: hidden; }
    .ce-halo { position: absolute; bottom: 70px; width: 220px; height: 60px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(124,77,255,.45), transparent 70%); filter: blur(6px); }
    .ce-figure { position: relative; width: 220px; height: 330px; }
    .ce-pose { display: flex; gap: 8px; z-index: 1; }
    .ce-uniforms { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .ce-uniform { display: grid; justify-items: center; gap: 4px; padding: 10px 6px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2); color: var(--ink-soft); font-size: .78rem; font-weight: 800; cursor: pointer; transition: all .15s; }
    .ce-uniform.sel { border-color: var(--pl); background: rgba(124,77,255,.16); color: #e7ddff; }
    .ce-uniform:disabled { opacity: .45; cursor: not-allowed; }
    .ce-uniform-fig { width: 64px; height: 96px; }
    .ce-soon { color: var(--pl); font-size: .68rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .ce-summary { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
    .ce-summary li { display: flex; justify-content: space-between; gap: 10px; font-size: .82rem; }
    .ce-summary span { color: var(--ink-soft); }
    .ce-summary strong { color: var(--ink); text-align: right; }
    .ce-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; margin-top: 14px; }
    .ce-btn { min-height: 42px; padding: 8px 18px; border-radius: 12px; font-weight: 900; cursor: pointer; border: 1px solid var(--border); background: var(--surface-2); color: var(--ink); transition: all .15s; }
    .ce-btn--ghost { background: transparent; color: var(--ink-soft); }
    .ce-btn--primary { background: rgba(124,77,255,.2); border-color: rgba(182,156,255,.5); color: #e7ddff; }
    .ce-btn--go { background: linear-gradient(90deg, var(--pp), #6336e0); border-color: transparent; color: #fff; }
    .ce-btn:hover { box-shadow: var(--glow); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    @media (max-width: 1080px) { .ce-grid { grid-template-columns: 1fr; } .ce-panel { max-height: none; } }
    @media (prefers-reduced-motion: reduce) { .ce-swatch, .ce-opt, .ce-btn, .ce-uniform { transition: none; } }
  `]
})
export class CharacterEditorComponent {
  readonly store = inject(AvatarStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly avatar = this.store.avatar;
  readonly pose = signal<'front' | 'side'>('front');

  readonly genderOptions = GENDER_OPTIONS;
  readonly clothingColors = CLOTHING_COLORS;
  readonly hairStyles = HAIR_STYLES;
  readonly hairColors = HAIR_COLORS;
  readonly mouths = MOUTHS;
  readonly uniforms = UNIFORMS;

  readonly roleLabel = computed(() => {
    const r = this.auth.currentUser()?.role;
    return r === 'PROFESOR' ? 'Docente' : r === 'ADMIN' ? 'Administrador' : 'Estudiante';
  });

  readonly uniformLabel = computed(() =>
    this.uniforms.find(u => u.id === this.avatar().uniform)?.label ?? '');

  readonly hairColorLabel = computed(() =>
    this.avatar().hairStyle === 'ninguno' ? '' : this.labelOf(this.hairColors, this.avatar().hairColor).toLowerCase());

  readonly avatarSummary = computed(() =>
    `Avatar ${this.labelOf(this.genderOptions, this.avatar().gender)}, ropa ${this.labelOf(this.clothingColors, this.avatar().clothingColor)}, cabello ${this.labelOf(this.hairStyles, this.avatar().hairStyle)} ${this.hairColorLabel()}, expresion ${this.labelOf(this.mouths, this.avatar().mouth)}.`);

  setHairStyle(id: string): void {
    this.store.update({ hairStyle: id as HairStyle });
  }

  setHairColor(id: string): void {
    this.store.update({ hairColor: id as HairColor });
  }

  setClothingColor(id: string): void {
    this.store.update({ clothingColor: id as ClothingColor });
  }

  withUniform(u: Uniform): AvatarConfig {
    return { ...this.avatar(), uniform: u };
  }

  labelOf(list: readonly { id: string; label: string }[], id: string): string {
    return list.find(o => o.id === id)?.label ?? id;
  }

  guardar(): void {
    this.store.save();
    this.notify.success('Personaje guardado.');
  }

  restablecer(): void {
    this.store.reset();
  }

  continuar(): void {
    this.store.save();
    this.router.navigate(['/portal/simulador']);
  }
}
