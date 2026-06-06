import {
  AvatarConfig, Uniform,
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, EYES, BROWS, MOUTHS, ACCESSORIES,
} from './avatar.model';

const has = (list: readonly { id: string }[], id: unknown): boolean =>
  typeof id === 'string' && list.some(o => o.id === id);

export function defaultAvatar(): AvatarConfig {
  return {
    skinTone: 'clara', hairStyle: 'corto', hairColor: 'castano', fringe: false,
    eyes: 'neutros', brows: 'rectas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  };
}

export function isValidAvatar(x: unknown): x is AvatarConfig {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return has(SKIN_TONES, a['skinTone']) && has(HAIR_STYLES, a['hairStyle'])
    && has(HAIR_COLORS, a['hairColor']) && typeof a['fringe'] === 'boolean'
    && has(EYES, a['eyes']) && has(BROWS, a['brows']) && has(MOUTHS, a['mouth'])
    && has(ACCESSORIES, a['accessory'])
    && (a['uniform'] === 'sin-bata' || a['uniform'] === 'con-bata');
}

export function coerceAvatar(x: unknown): AvatarConfig {
  const d = defaultAvatar();
  const a = (x && typeof x === 'object') ? x as Record<string, unknown> : {};
  const pick = (list: readonly { id: string }[], v: unknown, fb: string): string =>
    has(list, v) ? v as string : fb;
  const uni: Uniform = (a['uniform'] === 'con-bata' || a['uniform'] === 'sin-bata') ? a['uniform'] : d.uniform;
  return {
    skinTone: pick(SKIN_TONES, a['skinTone'], d.skinTone),
    hairStyle: pick(HAIR_STYLES, a['hairStyle'], d.hairStyle),
    hairColor: pick(HAIR_COLORS, a['hairColor'], d.hairColor),
    fringe: typeof a['fringe'] === 'boolean' ? a['fringe'] : d.fringe,
    eyes: pick(EYES, a['eyes'], d.eyes),
    brows: pick(BROWS, a['brows'], d.brows),
    mouth: pick(MOUTHS, a['mouth'], d.mouth),
    accessory: pick(ACCESSORIES, a['accessory'], d.accessory),
    uniform: uni,
  };
}

export function serializeAvatar(a: AvatarConfig): string { return JSON.stringify(a); }

export function parseAvatar(raw: string | null): AvatarConfig {
  if (!raw) return defaultAvatar();
  try { return coerceAvatar(JSON.parse(raw)); }
  catch { return defaultAvatar(); }
}
