import { defaultAvatar } from '../character/avatar-config.util';
import {
  AVATAR_ANIM_KEYS,
  AVATAR_DISPLAY_SCALE,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  AVATAR_IDLE_FRAMES,
  AVATAR_SHEET_HEIGHT,
  AVATAR_SHEET_WIDTH,
  AVATAR_TEXTURE_KEY,
  AVATAR_WALK_FRAMES,
  avatarFrameRects,
  avatarLayerSpecs,
  avatarRowLayerOrder,
  npcAvatarAnimKeys,
  npcAvatarTextureKey,
} from './phaser-avatar-renderer';

describe('phaser-avatar-renderer', () => {
  it('expone las capas del avatar con su tipo para la composición por fila', () => {
    const specs = avatarLayerSpecs(defaultAvatar());
    expect(specs.map(s => s.textureKey)).toEqual([
      'avatar-layer-hair-back-short-black',
      'avatar-layer-body',
      'avatar-layer-face-neutral',
      'avatar-layer-hair-front-short-black',
    ]);
    expect(specs.map(s => s.kind)).toEqual(['hairBack', 'body', 'face', 'hairFront']);
    for (const spec of specs) {
      expect(spec.assetPath).toMatch(/^\/assets\/characters\/modular\//);
    }
  });

  it('de frente/lado el pelo trasero va DETRÁS del cuerpo; de espaldas, encima', () => {
    expect(avatarRowLayerOrder(0)).toEqual(['hairBack', 'body', 'face', 'hairFront']);
    expect(avatarRowLayerOrder(1)).toEqual(['hairBack', 'body', 'face', 'hairFront']);
    expect(avatarRowLayerOrder(2)).toEqual(['body', 'hairBack', 'face', 'hairFront']);
  });

  it('omite las capas de pelo cuando el estilo es "ninguno"', () => {
    const specs = avatarLayerSpecs({ ...defaultAvatar(), hairStyle: 'ninguno' });
    expect(specs.map(s => s.textureKey)).toEqual([
      'avatar-layer-body',
      'avatar-layer-face-neutral',
    ]);
  });

  it('precarga las variantes de pelo promovidas en fase C', () => {
    const specs = avatarLayerSpecs({ ...defaultAvatar(), hairStyle: 'recogido' });
    expect(specs.map(s => s.assetPath)).toEqual(expect.arrayContaining([
      '/assets/characters/modular/hair/hair_tied_brown_back.png',
      '/assets/characters/modular/hair/hair_tied_brown_front.png',
    ]));
  });

  it('genera 9 frames de 64×96 que cubren exactamente la hoja de 192×288', () => {
    const rects = avatarFrameRects();
    expect(rects).toHaveLength(9);
    expect(rects[0]).toEqual({ index: 0, x: 0, y: 0, width: AVATAR_FRAME_WIDTH, height: AVATAR_FRAME_HEIGHT });
    expect(rects[8]).toEqual({
      index: 8,
      x: AVATAR_SHEET_WIDTH - AVATAR_FRAME_WIDTH,
      y: AVATAR_SHEET_HEIGHT - AVATAR_FRAME_HEIGHT,
      width: AVATAR_FRAME_WIDTH,
      height: AVATAR_FRAME_HEIGHT,
    });
  });

  it('las animaciones usan la fila correcta y el idle es la columna central', () => {
    expect(AVATAR_WALK_FRAMES.down).toEqual([0, 1, 2]);
    expect(AVATAR_WALK_FRAMES.side).toEqual([3, 4, 5]);
    expect(AVATAR_WALK_FRAMES.up).toEqual([6, 7, 8]);
    expect(AVATAR_IDLE_FRAMES).toEqual({ down: 1, side: 4, up: 7 });
  });

  describe('texturas/animaciones de NPC modular (fase competitiva)', () => {
    it('dos presets distintos producen texture keys distintas y ninguna pisa la del jugador', () => {
      const madre = npcAvatarTextureKey('madre-vbg');
      const colega = npcAvatarTextureKey('colega-clinica');
      expect(madre).toBe('npc-avatar-madre-vbg');
      expect(colega).toBe('npc-avatar-colega-clinica');
      expect(madre).not.toBe(colega);
      expect(madre).not.toBe(AVATAR_TEXTURE_KEY);
    });

    it('las anim keys de NPC no colisionan entre presets ni con las del jugador', () => {
      const a = npcAvatarAnimKeys('madre-vbg');
      const b = npcAvatarAnimKeys('seguridad');
      expect(a).toEqual({
        down: 'npc-madre-vbg-walk-down',
        side: 'npc-madre-vbg-walk-side',
        up: 'npc-madre-vbg-walk-up',
      });
      const all = [...Object.values(a), ...Object.values(b)];
      expect(new Set(all).size).toBe(all.length);
      for (const key of all) {
        expect(Object.values(AVATAR_ANIM_KEYS)).not.toContain(key);
      }
    });
  });

  it('mantiene la escala de render en el rango legible del MVP (fase 1.1)', () => {
    // 0.6 dejaba al protagonista ilegible; por debajo de 0.72 vuelve a pasar,
    // por encima de 0.85 desproporciona frente a los NPC de la sala autoría.
    expect(AVATAR_DISPLAY_SCALE).toBeGreaterThanOrEqual(0.72);
    expect(AVATAR_DISPLAY_SCALE).toBeLessThanOrEqual(0.85);
  });
});
