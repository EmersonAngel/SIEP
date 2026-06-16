import { defaultAvatar } from './avatar-config.util';
import { avatarFramePosition, resolveAvatarSpriteLayers } from './avatar-figure.component';

describe('AvatarFigureComponent pixel layers', () => {
  it('compone pelo atras -> cuerpo -> cara -> pelo frente', () => {
    const layers = resolveAvatarSpriteLayers(defaultAvatar());

    expect(layers.map(layer => layer.key)).toEqual([
      'hair-back-short-black',
      'body-female-purple',
      'face-neutral',
      'hair-front-short-black',
    ]);
    expect(layers.map(layer => layer.kind)).toEqual(['hairBack', 'body', 'face', 'hairFront']);
    expect(layers[0].assetPath).toBe('/assets/characters/modular/hair/hair_short_black_back.png');
    expect(layers[1].assetPath).toBe('/assets/characters/modular/body/body_female_purple.png');
    expect(layers[2].assetPath).toBe('/assets/characters/modular/face/face_neutral.png');
    expect(layers[3].assetPath).toBe('/assets/characters/modular/hair/hair_short_black_front.png');
    expect(layers[0].zIndex).toBeLessThan(layers[1].zIndex);
  });

  it('renderiza forma y color de cabello combinables', () => {
    const blonde = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'medio', hairColor: 'rubio' });
    expect(blonde[0].assetPath).toBe('/assets/characters/modular/hair/hair_medium_blonde_back.png');
    expect(blonde[3].assetPath).toBe('/assets/characters/modular/hair/hair_medium_blonde_front.png');

    const tiedGray = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'recogido', hairColor: 'gris' });
    expect(tiedGray[0].assetPath).toBe('/assets/characters/modular/hair/hair_tied_gray_back.png');
  });

  it('renderiza genero y color de ropa', () => {
    const layers = resolveAvatarSpriteLayers({ ...defaultAvatar(), gender: 'male', clothingColor: 'blue' });
    expect(layers[1].key).toBe('body-male-blue');
    expect(layers[1].assetPath).toBe('/assets/characters/modular/body/body_male_blue.png');
  });

  it('mapea valores antiguos de mouth a las nuevas expresiones', () => {
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'sonrisa' })[2].key).toBe('face-happy');
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'seria' })[2].key).toBe('face-worried');
  });

  it('usa directamente los ids de expresión nuevos', () => {
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'angry' })[2].assetPath)
      .toBe('/assets/characters/modular/face/face_angry.png');
    expect(resolveAvatarSpriteLayers({ ...defaultAvatar(), mouth: 'surprised' })[2].key).toBe('face-surprised');
  });

  it('omits hair layers when the user chooses no hair', () => {
    const layers = resolveAvatarSpriteLayers({ ...defaultAvatar(), hairStyle: 'ninguno' });

    expect(layers.map(layer => layer.key)).toEqual(['body-female-purple', 'face-neutral']);
  });

  it('selects idle frame rows for front and side previews', () => {
    expect(avatarFramePosition('front')).toBe('0% 0%');
    expect(avatarFramePosition('side')).toBe('0% 50%');
  });
});
