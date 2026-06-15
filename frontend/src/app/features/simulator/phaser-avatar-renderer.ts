import Phaser from 'phaser';
import { AvatarConfig } from '../character/avatar.model';
import { AvatarLayerKind, resolveAvatarSpriteLayers } from '../character/avatar-figure.component';

/**
 * Avatar modular dentro de Phaser (Fase 4 del MVP).
 *
 * Los assets modulares (`/assets/characters/modular/...`) son hojas de
 * 192×288 px = 3 columnas (frames de caminata) × 3 filas (direcciones):
 *   fila 0 = frente (down) · fila 1 = lado (mira a la DERECHA) · fila 2 = espalda (up)
 *
 * La composición por capas (cuerpo → pelo atrás → cara → pelo frente) se hace
 * una vez en un CanvasTexture y se registra como spritesheet de 9 frames.
 */

export const AVATAR_TEXTURE_KEY = 'player-avatar-composite';
export const AVATAR_SHEET_WIDTH = 192;
export const AVATAR_SHEET_HEIGHT = 288;
export const AVATAR_FRAME_WIDTH = 64;
export const AVATAR_FRAME_HEIGHT = 96;

/**
 * Escala de render del avatar modular dentro del mundo. El frame 64×96 trae
 * bastante aire alrededor del cuerpo (~30×60 px útiles), así que 0.6 lo dejaba
 * ilegible (auditoría fase 1.1). 0.85 lo vuelve protagonista (~51 px de cuerpo
 * visible) sin desproporcionarlo frente a los NPC Kenney de la sala autoría.
 */
export const AVATAR_DISPLAY_SCALE = 0.85;

/** Animaciones del avatar (no chocan con las `walk-*` de Kenney). */
export const AVATAR_ANIM_KEYS = {
  down: 'avatar-walk-down',
  side: 'avatar-walk-side',
  up: 'avatar-walk-up',
} as const;

/** Frame de reposo por dirección (columna central de cada fila). */
export const AVATAR_IDLE_FRAMES = { down: 1, side: 4, up: 7 } as const;

/** Frames de caminata por dirección (fila completa). */
export const AVATAR_WALK_FRAMES = {
  down: [0, 1, 2],
  side: [3, 4, 5],
  up: [6, 7, 8],
} as const;

/**
 * The modular side row faces right. Flip only when the actor moves or rests
 * to the left; otherwise face/hair layers appear mirrored.
 */
export function modularAvatarFlipX(direction: 'down' | 'up' | 'left' | 'right'): boolean {
  return direction === 'left';
}

export interface AvatarLayerSpec {
  /** Clave de textura Phaser para precargar la capa. */
  textureKey: string;
  /** Ruta del asset (servible por el dev server). */
  assetPath: string;
  /** Tipo de capa (gobierna el orden de composición por fila). */
  kind: AvatarLayerKind;
}

/** Capas a precargar para un AvatarConfig, en orden de dibujo (z). */
export function avatarLayerSpecs(config: AvatarConfig): AvatarLayerSpec[] {
  return resolveAvatarSpriteLayers(config).map(layer => ({
    textureKey: `avatar-layer-${layer.key}`,
    assetPath: layer.assetPath,
    kind: layer.kind,
  }));
}

/**
 * Orden de composición por fila: de frente/lado la masa trasera del pelo va
 * DETRÁS del cuerpo (es opaca y taparía la cara); de espaldas va encima del
 * cráneo. La cara va sobre el cuerpo y el flequillo cierra.
 */
export function avatarRowLayerOrder(row: number): readonly AvatarLayerKind[] {
  if (row === 0) return ['hairBack', 'body', 'face', 'hairFront'];
  if (row === 1) return ['hairBack', 'body', 'face', 'hairFront'];
  return ['body', 'hairBack', 'hairFront'];
}

/** Geometría de los 9 frames (índice = fila*3 + columna). */
export function avatarFrameRects(): Array<{ index: number; x: number; y: number; width: number; height: number }> {
  const rects = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      rects.push({
        index: row * 3 + col,
        x: col * AVATAR_FRAME_WIDTH,
        y: row * AVATAR_FRAME_HEIGHT,
        width: AVATAR_FRAME_WIDTH,
        height: AVATAR_FRAME_HEIGHT,
      });
    }
  }
  return rects;
}

/** Clave de textura compuesta de un preset de NPC (no pisa la del jugador). */
export function npcAvatarTextureKey(presetKey: string): string {
  return `npc-avatar-${presetKey}`;
}

export interface AvatarAnimKeySet { down: string; side: string; up: string; }

/** Claves de animación de caminata por preset de NPC. */
export function npcAvatarAnimKeys(presetKey: string): AvatarAnimKeySet {
  return {
    down: `npc-${presetKey}-walk-down`,
    side: `npc-${presetKey}-walk-side`,
    up: `npc-${presetKey}-walk-up`,
  };
}

/**
 * Compone capas (ya cargadas como imágenes) en un CanvasTexture con la clave
 * dada (jugador o NPC) y registra los 9 frames. Devuelve false si ninguna capa
 * está disponible (el llamador usa el fallback Kenney).
 */
export function composeAvatarTextureAs(
  scene: Phaser.Scene,
  textureKey: string,
  specs: AvatarLayerSpec[],
): boolean {
  const available = specs.filter(spec => scene.textures.exists(spec.textureKey));
  if (!available.length) return false;

  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  const canvasTexture = scene.textures.createCanvas(textureKey, AVATAR_SHEET_WIDTH, AVATAR_SHEET_HEIGHT);
  if (!canvasTexture) return false;

  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  // Composición fila a fila: el orden de capas depende de la dirección
  // (ver avatarRowLayerOrder) — la hoja completa no se puede apilar de una vez.
  for (let row = 0; row < 3; row++) {
    for (const kind of avatarRowLayerOrder(row)) {
      const spec = available.find(s => s.kind === kind);
      if (!spec) continue;
      const source = scene.textures.get(spec.textureKey).getSourceImage();
      ctx.drawImage(
        source as CanvasImageSource,
        0, row * AVATAR_FRAME_HEIGHT, AVATAR_SHEET_WIDTH, AVATAR_FRAME_HEIGHT,
        0, row * AVATAR_FRAME_HEIGHT, AVATAR_SHEET_WIDTH, AVATAR_FRAME_HEIGHT,
      );
    }
  }
  canvasTexture.refresh();

  for (const rect of avatarFrameRects()) {
    canvasTexture.add(rect.index, 0, rect.x, rect.y, rect.width, rect.height);
  }
  return true;
}

/** Composición del avatar del JUGADOR (firma estable de la fase 4 del MVP). */
export function composeAvatarTexture(scene: Phaser.Scene, specs: AvatarLayerSpec[]): boolean {
  return composeAvatarTextureAs(scene, AVATAR_TEXTURE_KEY, specs);
}

/** (Re)crea animaciones de caminata para una textura compuesta con claves dadas. */
export function createAvatarAnimationsFor(
  scene: Phaser.Scene,
  textureKey: string,
  animKeys: AvatarAnimKeySet,
): void {
  for (const dir of ['down', 'side', 'up'] as const) {
    const key = animKeys[dir];
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: AVATAR_WALK_FRAMES[dir].map(frame => ({ key: textureKey, frame })),
      frameRate: 7,
      repeat: -1,
    });
  }
}

/** (Re)crea las animaciones de caminata del avatar compuesto del jugador. */
export function createAvatarAnimations(scene: Phaser.Scene): void {
  createAvatarAnimationsFor(scene, AVATAR_TEXTURE_KEY, AVATAR_ANIM_KEYS);
}
