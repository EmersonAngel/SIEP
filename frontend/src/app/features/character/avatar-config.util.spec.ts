import {
  coerceAvatar,
  defaultAvatar,
  hairVariantId,
  hairVariantPatch,
  isValidAvatar,
  parseAvatar,
  serializeAvatar,
} from './avatar-config.util';
import { HAIR_VARIANTS } from './avatar.model';

describe('avatar-config', () => {
  it('defaultAvatar is valid', () => {
    expect(isValidAvatar(defaultAvatar())).toBe(true);
  });

  it('coerceAvatar fixes invalid ids but keeps valid ones', () => {
    const out = coerceAvatar({ ...defaultAvatar(), skinTone: 'inexistente', hairColor: 'rubio', clothingColor: 'blue' });
    expect(out.skinTone).toBe(defaultAvatar().skinTone);
    expect(out.hairColor).toBe('rubio');
    expect(out.clothingColor).toBe('blue');
  });

  it('coerceAvatar fills missing fields from default', () => {
    const out = coerceAvatar({ uniform: 'con-bata' });
    expect(out.uniform).toBe('con-bata');
    expect(out.eyes).toBe(defaultAvatar().eyes);
    expect(out.gender).toBe(defaultAvatar().gender);
    expect(out.clothingColor).toBe(defaultAvatar().clothingColor);
  });

  it('parseAvatar tolerates null and corrupt JSON', () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar());
    expect(parseAvatar('{not json')).toEqual(defaultAvatar());
  });

  it('serialize -> parse roundtrips', () => {
    const a = { ...defaultAvatar(), hairStyle: 'largo' as const, uniform: 'con-bata' as const };
    expect(parseAvatar(serializeAvatar(a))).toEqual(a);
  });
});

describe('variantes de cabello con arte real', () => {
  it('resuelve la variante por forma y color', () => {
    expect(hairVariantId({ hairStyle: 'corto', hairColor: 'negro' })).toBe('short_black');
    expect(hairVariantId({ hairStyle: 'corto', hairColor: 'castano' })).toBe('short_brown');
    expect(hairVariantId({ hairStyle: 'largo', hairColor: 'castano' })).toBe('long_brown');
    expect(hairVariantId({ hairStyle: 'medio', hairColor: 'rubio' })).toBe('medium_blonde');
    expect(hairVariantId({ hairStyle: 'recogido', hairColor: 'gris' })).toBe('tied_gray');
    expect(hairVariantId({ hairStyle: 'largo', hairColor: 'rojizo' })).toBe('long_red');
    expect(hairVariantId({ hairStyle: 'ninguno', hairColor: 'negro' })).toBe('none');
  });

  it('el patch canonico de cada variante produce esa misma variante', () => {
    for (const variant of HAIR_VARIANTS) {
      const config = coerceAvatar({ ...defaultAvatar(), ...hairVariantPatch(variant.id) });
      expect(hairVariantId(config)).toBe(variant.id);
    }
  });

  it('la config por defecto cae en la variante estable corto negro', () => {
    expect(hairVariantId(defaultAvatar())).toBe('short_black');
  });
});
