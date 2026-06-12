import { AvatarConfig } from '../character/avatar.model';
import { NpcAvatarPresetKey } from '../../core/models/simulation.model';

/**
 * Presets visuales fijos de NPC (Fase 3 del flujo competitivo).
 *
 * Mismo universo modular que el avatar del jugador: cada preset es un
 * AvatarConfig REAL (solo ids que existen en avatar.model — el spec lo
 * garantiza con coerceAvatar). El cuerpo es compartido por ahora
 * (body_orientadora_purple): la identidad sale de pelo, cara, escala y un
 * tint sutil. No se exponen en /portal/personaje.
 *
 * Nota de adaptación: el prompt maestro pedía hairStyle 'rojizo' para la
 * adolescente; ese id no existe — el contrato real es hairVariantPatch('red')
 * = { hairStyle: 'medio', hairColor: 'rojizo' } (variante con arte `red`).
 */
export const NPC_AVATAR_PRESETS: Record<NpcAvatarPresetKey, AvatarConfig> = {
  'madre-vbg': {
    skinTone: 'media', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'amables', brows: 'suaves', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'paciente-vbg': {
    skinTone: 'clara', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'colega-clinica': {
    skinTone: 'morena', hairStyle: 'recogido', hairColor: 'castano', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutra', accessory: 'pin',
    uniform: 'sin-bata',
  },
  'supervisor-clinico': {
    skinTone: 'media', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'seguridad': {
    skinTone: 'morena', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'neutra', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'adolescente-nna': {
    skinTone: 'clara', hairStyle: 'medio', hairColor: 'rojizo', fringe: false,
    eyes: 'neutros', brows: 'suaves', mouth: 'seria', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
};

export interface NpcPresetRenderHints {
  /** Escala de render (jugador = 0.85; adultos 0.78-0.85; adolescente 0.70-0.76). */
  scale: number;
  /** Tint sutil para diferenciar presets que comparten pelo (opcional). */
  tint?: number;
}

export const NPC_PRESET_RENDER: Record<NpcAvatarPresetKey, NpcPresetRenderHints> = {
  'madre-vbg':          { scale: 0.82 },
  'paciente-vbg':       { scale: 0.78, tint: 0xf3ecff },
  'colega-clinica':     { scale: 0.82 },
  'supervisor-clinico': { scale: 0.84 },
  'seguridad':          { scale: 0.84, tint: 0xdde6f2 },
  'adolescente-nna':    { scale: 0.72 },
};

/**
 * Markers PERSON del backend que deben renderizarse con preset modular
 * (la consultante 'escucha-segura' es la paciente del caso).
 */
export const MAP_OBJECT_PRESETS: Record<string, NpcAvatarPresetKey> = {
  'escucha-segura': 'paciente-vbg',
};

export function npcPresetConfig(key: string | undefined | null): AvatarConfig | null {
  if (!key) return null;
  return NPC_AVATAR_PRESETS[key as NpcAvatarPresetKey] ?? null;
}

export function npcPresetRender(key: NpcAvatarPresetKey): NpcPresetRenderHints {
  return NPC_PRESET_RENDER[key];
}
