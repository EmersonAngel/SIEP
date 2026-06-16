import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarConfig, EXPRESSIONS, Expression, LEGACY_MOUTH_TO_EXPRESSION } from './avatar.model';
import { bodyAssetName, hairVariantId } from './avatar-config.util';

export type AvatarPreviewPose = 'front' | 'side';
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

const EXPRESSION_IDS = new Set<string>(EXPRESSIONS.map(e => e.id));

/** Resuelve el id de expresión (hoja face_{id}.png) a partir del campo `mouth`. */
function faceId(config: AvatarConfig): Expression {
  const raw = config.mouth;
  if (EXPRESSION_IDS.has(raw)) return raw as Expression;
  return LEGACY_MOUTH_TO_EXPRESSION[raw] ?? 'neutral';
}

export function avatarFramePosition(pose: AvatarPreviewPose): string {
  return pose === 'side' ? '0% 50%' : '0% 0%';
}

export function resolveAvatarSpriteLayers(config: AvatarConfig, pose: AvatarPreviewPose = 'front'): AvatarSpriteLayer[] {
  const face = faceId(config);
  const variant = hairVariantId(config);
  const layers: AvatarSpriteLayer[] = [];

  // Lateral: el rostro de perfil va SOBRE el flequillo (si no, el cabello lo
  // tapa). De frente el flequillo cae sobre la frente (rostro debajo).
  const faceZ = pose === 'side' ? 45 : 30;
  const hairFrontZ = pose === 'side' ? 40 : 40;

  if (variant !== 'none') {
    const variantKey = variant.replace(/_/g, '-');
    layers.push(layer(`hair-back-${variantKey}`, 'hairBack', `${MODULAR_ASSET_BASE}/hair/hair_${variant}_back.png`, 5));
  }

  layers.push(layer(
    `body-${config.gender}-${config.clothingColor}`,
    'body',
    `${MODULAR_ASSET_BASE}/body/${bodyAssetName(config)}`,
    10,
  ));

  layers.push(layer(`face-${face}`, 'face', `${MODULAR_ASSET_BASE}/face/face_${face}.png`, faceZ));

  if (variant !== 'none') {
    const variantKey = variant.replace(/_/g, '-');
    layers.push(layer(`hair-front-${variantKey}`, 'hairFront', `${MODULAR_ASSET_BASE}/hair/hair_${variant}_front.png`, hairFrontZ));
  }

  return layers;
}

@Component({
  selector: 'app-avatar-figure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-pixel" [class.avatar-pixel--portrait]="portrait()" role="img"
      [style.transform]="flipX() ? 'scaleX(-1)' : null"
      [attr.aria-label]="'Avatar pixel art'">
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
  /** Espeja horizontalmente (lateral mirando a la izquierda). */
  readonly flipX = input(false);

  readonly layers = computed(() => resolveAvatarSpriteLayers(this.config(), this.pose()));
  readonly framePosition = computed(() => avatarFramePosition(this.pose()));
}
