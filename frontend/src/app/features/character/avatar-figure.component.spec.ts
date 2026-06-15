import { defaultAvatar } from './avatar-config.util';
import { avatarFramePosition, resolveAvatarSpriteLayers } from './avatar-figure.component';

describe('AvatarFigureComponent pixel layers', () => {
  it('compone pelo atrás → cuerpo → cara → pelo frente (variante por defecto)', () => {
    const layers = resolveAvatarSpriteLayers(defaultAvatar());

    expect(layers.map(layer => layer.key)).toEqual([
      'hair-back-short-black',
      'body',
      'face-neutral',
      'hair-front-short-black',
    ]);
    expect(layers.map(layer => layer.kind)).toEqual(['hairBack', 'body', 'face', 'hairFront']);
    expect(layers[0].assetPath).toBe('/assets/characters/modular/hair/hair_short_black_back.png');
    expect(layers[1].assetPath).toBe('/assets/characters/modular/body/body_orientadora_purple.png');
    expect(layers[2].assetPath).toBe('/assets/characters/modular/face/face_neutral.png');
    expect(layers[3].assetPath).toBe('/assets/characters/modular/hair/hair_short_black_front.png');
    // El z-index respeta el orden: la masa trasera queda bajo el cuerpo.
    expect(layers[0].zIndex).toBeLessThan(layers[1].zIndex);
  });

  it('renderiza las variantes de cabello promovidas en fase C', () => {
    const longBrown = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'largo' });
    expect(longBrown[0].assetPath).toBe('/assets/characters/modular/hair/hair_long_brown_back.png');
    expect(longBrown[3].assetPath).toBe('/assets/characters/modular/hair/hair_long_brown_front.png');

    const tied = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'recogido' });
    expect(tied[0].assetPath).toBe('/assets/characters/modular/hair/hair_tied_brown_back.png');

    const red = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairColor: 'rojizo' });
    expect(red[0].assetPath).toBe('/assets/characters/modular/hair/hair_red_back.png');
    expect(red[3].assetPath).toBe('/assets/characters/modular/hair/hair_red_front.png');
  });

  it('maps existing mouth options to available face expressions', () => {
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'sonrisa' })[2].key).toBe('face-calm');
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'seria' })[2].key).toBe('face-worried');
  });

  it('omits hair layers when the user chooses no hair', () => {
    const layers = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'ninguno' });

    expect(layers.map(layer => layer.key)).toEqual(['body', 'face-neutral']);
  });

  it('selects frame rows for front and side previews', () => {
    expect(avatarFramePosition('front')).toBe('0% 0%');
    expect(avatarFramePosition('side')).toBe('0% 50%');
  });

  it('omite la capa de ojos/cara en la orientacion lateral', () => {
    const layers = resolveAvatarSpriteLayers(defaultAvatar(), 'side');

    expect(layers.map(layer => layer.key)).toEqual([
      'hair-back-short-black',
      'body',
      'hair-front-short-black',
    ]);
    expect(layers.some(layer => layer.kind === 'face')).toBe(false);
  });
});
