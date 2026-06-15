import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarConfig } from './avatar.model';
import { hairVariantId } from './avatar-config.util';

export type AvatarPreviewPose = 'front' | 'side';

/** Tipo de capa del avatar modular (gobierna el orden de composición). */
export type AvatarLayerKind = 'body' | 'hairBack' | 'face' | 'hairFront';

export interface AvatarSpriteLayer {
  key: string;
  kind: AvatarLayerKind;
  assetPath: string;
  backgroundImage: string;
  zIndex: number;
}

const MODULAR_ASSET_BASE = '/assets/characters/modular';

function layer(key: string, kind: AvatarLayerKind, assetPath: string, zIndex: number): AvatarSpriteLayer {
  return {
    key,
    kind,
    assetPath,
    backgroundImage: `url("${assetPath}")`,
    zIndex,
  };
}

function faceId(config: AvatarConfig): 'neutral' | 'calm' | 'worried' {
  if (config.mouth === 'sonrisa') return 'calm';
  if (config.mouth === 'seria') return 'worried';
  return 'neutral';
}

export function avatarFramePosition(pose: AvatarPreviewPose): string {
  return pose === 'side' ? '0% 50%' : '0% 0%';
}

export function resolveAvatarSpriteLayers(config: AvatarConfig, pose: AvatarPreviewPose = 'front'): AvatarSpriteLayer[] {
  const face = faceId(config);
  const variant = hairVariantId(config);
  const layers: AvatarSpriteLayer[] = [];

  // Composición fase C: pelo atrás → cuerpo → cara → pelo frente. La masa
  // trasera del pelo es opaca y va DETRÁS del cuerpo (en la vista de espaldas
  // el runtime Phaser la sube por fila; el editor solo muestra frente/lado).
  // Solo variantes con arte real (hairVariantId); 'none' omite ambas capas.
  const variantKey = variant.replace(/_/g, '-');
  if (variant !== 'none') {
    layers.push(layer(`hair-back-${variantKey}`, 'hairBack', `${MODULAR_ASSET_BASE}/hair/hair_${variant}_back.png`, 5));
  }

  layers.push(layer('body', 'body', `${MODULAR_ASSET_BASE}/body/body_orientadora_purple.png`, 10));

  if (pose === 'front') {
    layers.push(layer(`face-${face}`, 'face', `${MODULAR_ASSET_BASE}/face/face_${face}.png`, 30));
  }

  if (variant !== 'none') {
    layers.push(layer(`hair-front-${variantKey}`, 'hairFront', `${MODULAR_ASSET_BASE}/hair/hair_${variant}_front.png`, 40));
  }

  return layers;
}

@Component({
  selector: 'app-avatar-figure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-pixel" [class.avatar-pixel--portrait]="portrait()" role="img"
      [attr.aria-label]="'Avatar pixel art del estudiante'">
      <span class="avatar-shadow" aria-hidden="true"></span>
      @for (layer of layers(); track layer.key) {
        <span class="avatar-layer" aria-hidden="true"
          [attr.data-layer]="layer.key"
          [style.z-index]="layer.zIndex"
          [style.background-image]="layer.backgroundImage"
          [style.background-position]="framePosition()"></span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      line-height: 0;
    }

    .avatar-pixel {
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 32px;
      min-height: 48px;
      overflow: visible;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .avatar-layer {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-size: 300% 300%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .avatar-shadow {
      position: absolute;
      left: 50%;
      bottom: 2%;
      z-index: 0;
      width: 46%;
      height: 6%;
      border-radius: 50%;
      background: rgba(0, 0, 0, .34);
      filter: blur(1px);
      transform: translateX(-50%);
    }

    .avatar-pixel--portrait {
      overflow: hidden;
    }

    .avatar-pixel--portrait .avatar-layer {
      inset: auto;
      top: -24%;
      left: 0;
      width: 100%;
      height: 150%;
    }

    .avatar-pixel--portrait .avatar-shadow {
      display: none;
    }
  `]
})
export class AvatarFigureComponent {
  readonly config = input.required<AvatarConfig>();
  readonly pose = input<AvatarPreviewPose>('front');
  readonly portrait = input(false);

  readonly layers = computed(() => resolveAvatarSpriteLayers(this.config(), this.pose()));
  readonly framePosition = computed(() => avatarFramePosition(this.pose()));
}
