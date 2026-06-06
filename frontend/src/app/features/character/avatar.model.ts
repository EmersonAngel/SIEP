export type Uniform = 'sin-bata' | 'con-bata';

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  fringe: boolean;
  eyes: string;
  brows: string;
  mouth: string;
  accessory: string;
  uniform: Uniform;
}

export interface Option { id: string; label: string; value?: string; }

export const SKIN_TONES: readonly Option[] = [
  { id: 'porcelana', label: 'Porcelana', value: '#F2D2BD' },
  { id: 'clara',     label: 'Clara',     value: '#E8B596' },
  { id: 'media',     label: 'Media',     value: '#C68A63' },
  { id: 'morena',    label: 'Morena',    value: '#9C6644' },
  { id: 'oscura',    label: 'Oscura',    value: '#6B4329' },
];
export const HAIR_COLORS: readonly Option[] = [
  { id: 'negro',   label: 'Negro',   value: '#2B2B30' },
  { id: 'castano', label: 'Castaño', value: '#5B3A24' },
  { id: 'rubio',   label: 'Rubio',   value: '#C9A05A' },
  { id: 'rojizo',  label: 'Rojizo',  value: '#8C4B2F' },
  { id: 'gris',    label: 'Gris',    value: '#9AA0A6' },
];
export const HAIR_STYLES: readonly Option[] = [
  { id: 'corto',    label: 'Corto' },
  { id: 'medio',    label: 'Medio' },
  { id: 'largo',    label: 'Largo' },
  { id: 'recogido', label: 'Recogido' },
  { id: 'ninguno',  label: 'Sin cabello' },
];
export const EYES: readonly Option[] = [
  { id: 'neutros', label: 'Neutros' },
  { id: 'amables', label: 'Amables' },
  { id: 'atentos', label: 'Atentos' },
];
export const BROWS: readonly Option[] = [
  { id: 'rectas',   label: 'Rectas' },
  { id: 'suaves',   label: 'Suaves' },
  { id: 'marcadas', label: 'Marcadas' },
];
export const MOUTHS: readonly Option[] = [
  { id: 'neutra',  label: 'Neutra' },
  { id: 'sonrisa', label: 'Sonrisa' },
  { id: 'seria',   label: 'Seria' },
];
export const ACCESSORIES: readonly Option[] = [
  { id: 'ninguno', label: 'Ninguno' },
  { id: 'gafas',   label: 'Gafas' },
  { id: 'pin',     label: 'Pin del programa' },
];
export const UNIFORMS: readonly { id: Uniform; label: string }[] = [
  { id: 'sin-bata', label: 'Sin bata' },
  { id: 'con-bata', label: 'Con bata' },
];

export function hexOf(list: readonly Option[], id: string, fallback: string): string {
  return list.find(o => o.id === id)?.value ?? fallback;
}
