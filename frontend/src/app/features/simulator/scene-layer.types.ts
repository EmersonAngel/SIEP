/**
 * Tipos de capas de escena 2.5D (preparación fase C).
 *
 * Contrato futuro: una sala se compone de capas apiladas y reutilizables.
 * Hoy solo la sala clínica premium (premium-clinical-room.renderer.ts) las
 * implementa con Graphics; la fase C podrá sustituir cada capa por bitmaps,
 * tilemaps o sistemas dinámicos sin tocar el gameplay.
 *
 *   background  → paredes, ventanas, decoración de muro
 *   floor       → piso con perspectiva, alfombras, zócalo
 *   backProps   → mobiliario pegado a la pared trasera (nunca solapa actores)
 *   midProps    → mobiliario en el piso, ordenado por Y junto a los actores
 *   actors      → jugador, NPCs, marcadores (los gestiona el gameplay, NO el renderer)
 *   frontProps  → oclusión de primer plano (siluetas, esquinas, plantas)
 *   lighting    → pools de luz, haz de ventana, viñeta
 *   uiHints     → hints contextuales del mundo (los gestiona el gameplay)
 */
export type SceneLayerKind =
  | 'background'
  | 'floor'
  | 'backProps'
  | 'midProps'
  | 'actors'
  | 'frontProps'
  | 'lighting'
  | 'uiHints';

/** Capas que un renderer de sala premium debe pintar (las demás son del gameplay). */
export const PREMIUM_RENDERER_LAYERS: readonly SceneLayerKind[] = [
  'background',
  'floor',
  'backProps',
  'midProps',
  'frontProps',
  'lighting',
] as const;

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScenePoint {
  x: number;
  y: number;
}

/** Opciones de render de una sala premium. */
export interface PremiumClinicalRoomOptions {
  width: number;
  height: number;
  /** true → sin tweens ni partículas (prefers-reduced-motion). */
  reduceMotion: boolean;
  /** Tono ambiental autorado (calm | clinical | warm | tense). Reservado fase C. */
  ambientTone?: string;
}

/** Metadata visual que el renderer devuelve al gameplay. */
export interface PremiumRoomRenderResult {
  bounds: { width: number; height: number };
  /** Rect caminable (coincide con las colisiones de authored-clinical-room.util). */
  floorBounds: SceneRect;
  /** Puntos de interés visual (cámara/guía/futuras salas). */
  focusPoints: Record<string, ScenePoint>;
  /** Capas efectivamente pintadas, en orden. */
  paintedLayers: readonly SceneLayerKind[];
}
