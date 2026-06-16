/**
 * Catálogo de assets y tokens de layout del login SIEP (pixel-art 2D).
 * Fuente única para integraciones Angular, SCSS (vía CSS vars) y Phaser 3.
 */

/** Rutas relativas al `base href` (producción y `ng serve`). */
export const LOGIN_ASSETS = {
  backgrounds: {
    definitive: 'assets/backgrounds/fondo_login_definitivo.png',
    fallback: 'assets/backgrounds/fondo_oficina.png.png'
  },
  character: {
    idle: [
      'assets/sprites/personaje/idle_1.png',
      'assets/sprites/personaje/idle_2.png',
      'assets/sprites/personaje/idle_3.png'
    ],
    blink: 'assets/sprites/personaje/blink.png'
  },
  panels: {
    loginCard: 'assets/panels/login_card.png',
    pedagogy: 'assets/panels/panel_inferior.png'
  },
  icons: {
    simula: 'assets/icons/simula.png',
    evalua: 'assets/icons/evalua.png',
    decide: 'assets/icons/decide.png',
    aprende: 'assets/icons/aprende.png'
  },
  buttons: {
    google: 'assets/buttons/google.png',
    microsoft: 'assets/buttons/microsoft.png'
  },
  images: {
    hero: 'assets/images/login/Login.jpeg'
  }
} as const;

/** Paleta morado/azul del login (alineada al fondo pixel-art). */
export const LOGIN_PALETTE = {
  ink: '#e8ecff',
  muted: 'rgba(232, 236, 255, 0.72)',
  purple: '#9b3dff',
  purpleDeep: '#5b1bb8',
  purpleGlow: 'rgba(155, 61, 255, 0.55)',
  cyan: '#5ce4ff',
  magenta: '#d946ef',
  fieldBg: 'rgba(8, 6, 24, 0.82)',
  fieldBorder: 'rgba(155, 61, 255, 0.45)'
} as const;

/**
 * Recorte del personaje dentro del lienzo 1920×1080 (idle_1 analizado).
 * Evita escalar el lienzo completo y mantiene proporción con el mobiliario del fondo.
 */
export const LOGIN_CHARACTER_SPRITE_TRIM = {
  sourceWidthPx: 1920,
  sourceHeightPx: 1080,
  leftPx: 723,
  topPx: 9,
  widthPx: 444,
  heightPx: 921,
  /** Centro normalizado del recorte en el lienzo fuente. */
  normCenterX: 0.4922,
  normFeetY: 0.8611
} as const;

/**
 * Punto de referencia del escritorio en fondo_login_definitivo / fondo_oficina (1402×1122).
 * Usado para documentar alineación con `background-size: cover; background-position: center`.
 */
export const LOGIN_BACKGROUND_DESK = {
  referenceWidthPx: 1402,
  referenceHeightPx: 1122,
  /** Centro aproximado del escritorio/silla (muestra madera, cuadrante inferior izquierdo). */
  anchorXPx: 179,
  anchorYPx: 800,
  floorYPx: 909,
  normFloorY: 0.8102,
  normAnchorX: 0.1277
} as const;

/** Perfil de posición/escala del personaje por viewport (QA: 1366 / 768 / 390). */
export interface LoginCharacterBreakpointProfile {
  id: string;
  minViewportWidthPx: number;
  stageWidthPx: number;
  stageHeightPx: number;
  /** Ancla Phaser X normalizada (0–1) dentro del stage. */
  anchorX: number;
  /** Ancla Phaser Y normalizada (0–1); ~0.96 alinea pies al borde inferior del stage. */
  anchorY: number;
  /** Escala respecto al alto del recorte (921px). */
  scaleHeightFactor: number;
  scaleWidthFactor: number;
  /** Desplazamiento inferior en `.siep-login__hero` (negativo = pies hacia el escritorio del fondo). */
  heroBottomOffsetPx: number;
  /** Extra hacia la izquierda (solo personaje; tarjeta y panel pedagógico sin mover). */
  heroLeftShiftPx: number;
}

export const LOGIN_CHARACTER_BREAKPOINTS: LoginCharacterBreakpointProfile[] = [
  {
    id: 'desktop-1366',
    minViewportWidthPx: 1101,
    stageWidthPx: 268,
    stageHeightPx: 332,
    anchorX: 0.8,
    anchorY: 0.98,
    scaleHeightFactor: 0.91,
    scaleWidthFactor: 0.88,
    /** Pies alineados al borde inferior de la tarjeta / escritorio del fondo. */
    heroBottomOffsetPx: -64,
    heroLeftShiftPx: 96
  },
  {
    id: 'desktop-narrow-1100',
    minViewportWidthPx: 901,
    stageWidthPx: 252,
    stageHeightPx: 312,
    anchorX: 0.8,
    anchorY: 0.98,
    scaleHeightFactor: 0.9,
    scaleWidthFactor: 0.87,
    heroBottomOffsetPx: -58,
    heroLeftShiftPx: 80
  },
  {
    id: 'tablet-768',
    minViewportWidthPx: 821,
    stageWidthPx: 212,
    stageHeightPx: 268,
    anchorX: 0.79,
    anchorY: 0.98,
    scaleHeightFactor: 0.89,
    scaleWidthFactor: 0.86,
    heroBottomOffsetPx: -52,
    heroLeftShiftPx: 56
  },
  {
    id: 'tablet-compact-820',
    minViewportWidthPx: 561,
    stageWidthPx: 178,
    stageHeightPx: 228,
    anchorX: 0.78,
    anchorY: 0.98,
    scaleHeightFactor: 0.88,
    scaleWidthFactor: 0.85,
    heroBottomOffsetPx: -42,
    heroLeftShiftPx: 40
  }
];

/**
 * QA viewports (mockup adjunto jun 2026):
 * - 1366×768 → `desktop-1366` (268×332, left-shift 96px, offset -64px).
 * - 768×1024 → `tablet-768` (212×268, offset -52px).
 * - 390×844 → personaje oculto; tarjeta + panel 2×2 centrados.
 */

/** Resuelve perfil activo según ancho de viewport (móvil ≤560 oculta el stage por CSS). */
export function resolveLoginCharacterProfile(
  viewportWidthPx: number
): LoginCharacterBreakpointProfile {
  const sorted = [...LOGIN_CHARACTER_BREAKPOINTS].sort(
    (a, b) => b.minViewportWidthPx - a.minViewportWidthPx
  );
  return (
    sorted.find(p => viewportWidthPx >= p.minViewportWidthPx) ??
    LOGIN_CHARACTER_BREAKPOINTS[LOGIN_CHARACTER_BREAKPOINTS.length - 1]
  );
}

/** Referencia visual QA (mockup objetivo de alineación). */
export const LOGIN_REFERENCE_MOCKUP = {
  fileName: 'ChatGPT_Image_1_jun_2026__08_41_19_a.m.-25e20853-42cc-40b1-af97-bce4ffac13ca.png',
  viewportDesktop: { widthPx: 1366, heightPx: 768 },
  viewportTablet: { widthPx: 768, heightPx: 1024 },
  viewportMobile: { widthPx: 390, heightPx: 844 }
} as const;

/**
 * Layout del escenario de login (mockup pixel-art final adjunto).
 * - `.siep-login__cluster`: tarjeta + panel centrados en viewport.
 * - `.siep-login__hero`: absoluto a la izquierda de la tarjeta (sin desplazar el centro).
 * - Tarjeta 420px; panel 562px; gap 24px.
 */
export const LOGIN_LAYOUT = {
  card: {
    maxWidthPx: 420,
    minWidthPx: 300
  },
  pedagogy: {
    nativeWidthPx: 562,
    nativeHeightPx: 142,
    /** Ancho visual del panel (mockup); centrado bajo la tarjeta. */
    displayWidthPx: 562,
    maxWidthPx: 980,
    gapBelowCardPx: 24,
    pillarIconPx: 40,
    pillarGapPx: 10,
    frameBorderPx: 3,
    frameGlow: '0 0 28px rgba(155, 61, 255, 0.38), 0 8px 0 rgba(46, 16, 101, 0.82)'
  },
  cluster: {
    characterSlotPx: 292,
    /** Separación horizontal personaje ↔ tarjeta (mockup). */
    characterGapPx: 12
  },
  character: {
    /** Una sola instancia Phaser (`data-siep-character-stage="single"`). */
    singleton: true,
    stageMinWidthPx: 200,
    stageMinHeightPx: 260,
    idleFrameRate: 3,
    blinkDelayMinMs: 2400,
    blinkDelayMaxMs: 4800,
    blinkFrameMs: 140,
    /** Perfil por defecto (desktop 1366px). */
    defaultProfileId: 'desktop-1366'
  },
  breakpoints: {
    tabletMaxPx: 900,
    mobileMaxPx: 560
  }
} as const;

/** Variables CSS inyectadas en `<main class="siep-login">`. */
export function loginLayoutCssVars(viewportWidthPx = 1366): Record<string, string> {
  const { card, pedagogy, cluster } = LOGIN_LAYOUT;
  const profile = resolveLoginCharacterProfile(viewportWidthPx);
  const pedagogyRatio = pedagogy.nativeWidthPx / pedagogy.nativeHeightPx;

  return {
    '--login-card-max': `${card.maxWidthPx}px`,
    '--login-card-min': `${card.minWidthPx}px`,
    '--login-pedagogy-max': `${pedagogy.maxWidthPx}px`,
    '--login-pedagogy-display': `${pedagogy.displayWidthPx}px`,
    '--login-pedagogy-ratio': `${pedagogy.nativeWidthPx} / ${pedagogy.nativeHeightPx}`,
    '--login-pedagogy-gap': `${pedagogy.gapBelowCardPx}px`,
    '--login-pedagogy-pillar-icon': `${pedagogy.pillarIconPx}px`,
    '--login-pedagogy-pillar-gap': `${pedagogy.pillarGapPx}px`,
    '--login-pedagogy-frame-border': `${pedagogy.frameBorderPx}px`,
    '--login-cluster-slot': `${cluster.characterSlotPx}px`,
    '--login-character-gap': `${cluster.characterGapPx}px`,
    '--login-character-w': `${profile.stageWidthPx}px`,
    '--login-character-h': `${profile.stageHeightPx}px`,
    '--login-character-wrap-offset': `${profile.heroBottomOffsetPx}px`,
    '--login-character-left-shift': `${profile.heroLeftShiftPx}px`,
    '--login-main-width': `min(${pedagogy.displayWidthPx}px, calc(100vw - 32px))`,
    '--login-bp-tablet': `${LOGIN_LAYOUT.breakpoints.tabletMaxPx}px`,
    '--login-bp-mobile': `${LOGIN_LAYOUT.breakpoints.mobileMaxPx}px`,
    '--login-pedagogy-width': `min(${pedagogy.displayWidthPx}px, calc(100vw - 32px))`,
    '--login-pedagogy-height': `calc(var(--login-pedagogy-width) / ${pedagogyRatio})`
  };
}

export const LOGIN_REMEMBER_EMAIL_KEY = 'siep_login_email';

export interface LoginPedagogyPillar {
  key: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  short: string;
}

export const LOGIN_PEDAGOGY_PILLARS: LoginPedagogyPillar[] = [
  {
    key: 'simula',
    title: 'SIMULA',
    description: 'Entornos reales para practicar sin riesgos.',
    color: '#b24bff',
    icon: LOGIN_ASSETS.icons.simula,
    short: 'S'
  },
  {
    key: 'evalua',
    title: 'EVALÚA',
    description: 'Mide tu progreso y toma decisiones informadas.',
    color: '#4cc9ff',
    icon: LOGIN_ASSETS.icons.evalua,
    short: 'E'
  },
  {
    key: 'decide',
    title: 'DECIDE',
    description: 'Desarrolla criterio y toma mejores decisiones.',
    color: '#f5c451',
    icon: LOGIN_ASSETS.icons.decide,
    short: 'D'
  },
  {
    key: 'aprende',
    title: 'APRENDE',
    description: 'Fortalece competencias para transformar.',
    color: '#5ce38a',
    icon: LOGIN_ASSETS.icons.aprende,
    short: 'A'
  }
];
