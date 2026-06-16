import { AvatarConfig, Expression } from '../character/avatar.model';
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
  // `mouth` = expresión base del NPC acorde al momento que atraviesa en su
  // escena (ver EXPRESSIONS). La emoción de cada línea de diálogo puede
  // sobreescribirla en runtime vía emotionToExpression().
  'madre-vbg': {
    gender: 'female', clothingColor: 'burgundy',
    skinTone: 'media', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'amables', brows: 'suaves', mouth: 'worried', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'paciente-vbg': {
    gender: 'female', clothingColor: 'gray',
    skinTone: 'clara', hairStyle: 'largo', hairColor: 'castano', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'sad', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'colega-clinica': {
    gender: 'female', clothingColor: 'green',
    skinTone: 'morena', hairStyle: 'recogido', hairColor: 'castano', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutral', accessory: 'pin',
    uniform: 'sin-bata',
  },
  'supervisor-clinico': {
    gender: 'male', clothingColor: 'blue',
    skinTone: 'media', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutral', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'seguridad': {
    gender: 'male', clothingColor: 'gray',
    skinTone: 'morena', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'neutros', brows: 'marcadas', mouth: 'neutral', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'adolescente-nna': {
    gender: 'female', clothingColor: 'purple',
    skinTone: 'clara', hairStyle: 'medio', hairColor: 'rojizo', fringe: false,
    eyes: 'neutros', brows: 'suaves', mouth: 'worried', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  // ── Caso PDF (hospital + comisaría) ──
  'psicologa-hospitalaria': {
    gender: 'female', clothingColor: 'green',
    skinTone: 'media', hairStyle: 'recogido', hairColor: 'castano', fringe: false,
    eyes: 'amables', brows: 'suaves', mouth: 'happy', accessory: 'pin',
    uniform: 'sin-bata',
  },
  'funcionaria-recepcion': {
    gender: 'female', clothingColor: 'blue',
    skinTone: 'clara', hairStyle: 'medio', hairColor: 'rojizo', fringe: false,
    eyes: 'neutros', brows: 'rectas', mouth: 'neutral', accessory: 'ninguno',
    uniform: 'sin-bata',
  },
  'comisaria-profesional': {
    gender: 'female', clothingColor: 'purple',
    skinTone: 'morena', hairStyle: 'corto', hairColor: 'negro', fringe: false,
    eyes: 'atentos', brows: 'rectas', mouth: 'neutral', accessory: 'pin',
    uniform: 'sin-bata',
  },
};

/**
 * Mapea la emoción de una línea de diálogo (DialogueState.emotion del backend)
 * a una expresión facial del avatar modular, para que el NPC refleje el momento
 * que está atravesando mientras habla.
 */
export function emotionToExpression(
  emotion: string | null | undefined,
  base: Expression = 'neutral',
): Expression {
  switch (emotion) {
    case 'positive': return 'happy';
    case 'concerned': return 'worried';
    case 'danger': return 'sad';
    case 'neutral': return base;
    default: return base;
  }
}

export interface NpcPresetRenderHints {
  /** Escala de render (jugador = 0.85; adultos 0.78-0.85; adolescente 0.70-0.76). */
  scale: number;
  /** Tint sutil para diferenciar presets que comparten pelo (opcional). */
  tint?: number;
}

export const NPC_PRESET_RENDER: Record<NpcAvatarPresetKey, NpcPresetRenderHints> = {
  'madre-vbg':              { scale: 0.82 },
  'paciente-vbg':           { scale: 0.78, tint: 0xf3ecff },
  'colega-clinica':         { scale: 0.82 },
  'supervisor-clinico':     { scale: 0.84 },
  'seguridad':              { scale: 0.84, tint: 0xdde6f2 },
  'adolescente-nna':        { scale: 0.72 },
  'psicologa-hospitalaria': { scale: 0.82 },
  'funcionaria-recepcion':  { scale: 0.80, tint: 0xf0f4ff },
  'comisaria-profesional':  { scale: 0.84 },
};

/**
 * Markers PERSON del backend que deben renderizarse con preset modular.
 * Caso PDF: actores de decisión/contexto sembrados por seed_caso_pdf.
 */
export const MAP_OBJECT_PRESETS: Record<string, NpcAvatarPresetKey> = {
  'escucha-segura': 'paciente-vbg',           // legacy (caso v1)
  'familia-crisis': 'madre-vbg',              // urgencias: abuela de la niña / madre de la sobreviviente
  'familia-duelo': 'madre-vbg',               // sala de escucha: decisión H1
  'psicologa-acompanante': 'psicologa-hospitalaria',  // sala de escucha: H3
  'funcionaria-recepcion': 'funcionaria-recepcion',   // comisaría recepción
  'sobreviviente-consulta': 'paciente-vbg',   // consultorio: decisión C1
  'profesional-psicosocial': 'comisaria-profesional', // consultorio: C3
};

export function npcPresetConfig(key: string | undefined | null): AvatarConfig | null {
  if (!key) return null;
  return NPC_AVATAR_PRESETS[key as NpcAvatarPresetKey] ?? null;
}

export function npcPresetRender(key: NpcAvatarPresetKey): NpcPresetRenderHints {
  return NPC_PRESET_RENDER[key];
}
