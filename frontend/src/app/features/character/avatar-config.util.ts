import {
  ACCESSORIES,
  AvatarConfig,
  AvatarGender,
  BROWS,
  CLOTHING_COLORS,
  ClothingColor,
  EYES,
  GENDER_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  HairAssetColor,
  HairAssetShape,
  HairColor,
  HairStyle,
  HairVariantId,
  MOUTHS,
  SKIN_TONES,
  Uniform,
} from './avatar.model';

const has = (list: readonly { id: string }[], id: unknown): boolean =>
  typeof id === 'string' && list.some(o => o.id === id);

const hairShapeByStyle: Record<Exclude<HairStyle, 'ninguno'>, HairAssetShape> = {
  corto: 'short',
  medio: 'medium',
  largo: 'long',
  recogido: 'tied',
};

const hairStyleByShape: Record<HairAssetShape, HairStyle> = {
  short: 'corto',
  medium: 'medio',
  long: 'largo',
  tied: 'recogido',
};

const hairAssetColorByColor: Record<HairColor, HairAssetColor> = {
  negro: 'black',
  castano: 'brown',
  rubio: 'blonde',
  rojizo: 'red',
  gris: 'gray',
};

const hairColorByAssetColor: Record<HairAssetColor, HairColor> = {
  black: 'negro',
  brown: 'castano',
  blonde: 'rubio',
  red: 'rojizo',
  gray: 'gris',
};

export function defaultAvatar(): AvatarConfig {
  return {
    gender: 'female',
    clothingColor: 'purple',
    skinTone: 'clara',
    hairStyle: 'corto',
    hairColor: 'negro',
    fringe: false,
    eyes: 'neutros',
    brows: 'rectas',
    mouth: 'neutra',
    accessory: 'ninguno',
    uniform: 'sin-bata',
  };
}

export function isValidAvatar(x: unknown): x is AvatarConfig {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return has(GENDER_OPTIONS, a['gender'])
    && has(CLOTHING_COLORS, a['clothingColor'])
    && has(SKIN_TONES, a['skinTone'])
    && has(HAIR_STYLES, a['hairStyle'])
    && has(HAIR_COLORS, a['hairColor'])
    && typeof a['fringe'] === 'boolean'
    && has(EYES, a['eyes'])
    && has(BROWS, a['brows'])
    && has(MOUTHS, a['mouth'])
    && has(ACCESSORIES, a['accessory'])
    && (a['uniform'] === 'sin-bata' || a['uniform'] === 'con-bata');
}

export function coerceAvatar(x: unknown): AvatarConfig {
  const d = defaultAvatar();
  const a = (x && typeof x === 'object') ? x as Record<string, unknown> : {};
  const pick = <T extends string>(list: readonly { id: T }[], v: unknown, fb: T): T =>
    has(list, v) ? v as T : fb;
  const uni: Uniform = (a['uniform'] === 'con-bata' || a['uniform'] === 'sin-bata') ? a['uniform'] : d.uniform;

  return {
    gender: pick(GENDER_OPTIONS, a['gender'], d.gender),
    clothingColor: pick(CLOTHING_COLORS, a['clothingColor'], d.clothingColor),
    skinTone: pick(SKIN_TONES, a['skinTone'], d.skinTone),
    hairStyle: pick(HAIR_STYLES, a['hairStyle'], d.hairStyle) as HairStyle,
    hairColor: pick(HAIR_COLORS, a['hairColor'], d.hairColor) as HairColor,
    fringe: typeof a['fringe'] === 'boolean' ? a['fringe'] : d.fringe,
    eyes: pick(EYES, a['eyes'], d.eyes),
    brows: pick(BROWS, a['brows'], d.brows),
    mouth: pick(MOUTHS, a['mouth'], d.mouth),
    accessory: pick(ACCESSORIES, a['accessory'], d.accessory),
    uniform: uni,
  };
}

export function hairVariantId(config: Pick<AvatarConfig, 'hairStyle' | 'hairColor'>): HairVariantId {
  if (config.hairStyle === 'ninguno') return 'none';
  return `${hairShapeByStyle[config.hairStyle]}_${hairAssetColorByColor[config.hairColor]}`;
}

export function hairVariantPatch(id: HairVariantId | 'red'): Partial<AvatarConfig> {
  if (id === 'none') return { hairStyle: 'ninguno' };
  const normalized = id === 'red' ? 'medium_red' : id;
  const [shape, color] = normalized.split('_') as [HairAssetShape, HairAssetColor];
  return {
    hairStyle: hairStyleByShape[shape],
    hairColor: hairColorByAssetColor[color],
  };
}

export function bodyAssetName(config: Pick<AvatarConfig, 'gender' | 'clothingColor'>): string {
  const gender: AvatarGender = has(GENDER_OPTIONS, config.gender) ? config.gender : defaultAvatar().gender;
  const clothingColor: ClothingColor = has(CLOTHING_COLORS, config.clothingColor)
    ? config.clothingColor
    : defaultAvatar().clothingColor;
  return `body_${gender}_${clothingColor}.png`;
}

export function serializeAvatar(a: AvatarConfig): string { return JSON.stringify(a); }

export function parseAvatar(raw: string | null): AvatarConfig {
  if (!raw) return defaultAvatar();
  try { return coerceAvatar(JSON.parse(raw)); }
  catch { return defaultAvatar(); }
}
