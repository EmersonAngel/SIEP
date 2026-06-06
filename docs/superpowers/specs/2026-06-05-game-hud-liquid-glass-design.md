# Juego 2.5D — Rebanada 2: HUD → identidad SIEP liquid-glass morada

- **Fecha:** 2026-06-05
- **Estado:** Aprobado (control delegado total). Gate de revisión delegado; spec escrito para auditoría.
- **Iniciativa:** SIEP 2.5D pixel-art. Rebanada 2 de ~7. Anterior: motor de profundidad (`feat/game-2_5d-depth-engine`, mergeada).
- **Repos:** **solo frontend.** Sin backend, sin migración.
- **Rama:** `feat/game-hud-liquid-glass`, sobre `master`.

## 1. Contexto

El shell del juego (`simulation-play.component.ts`, ~1300 líneas) define su propio tema **scoped** en `.game-container` (vars `--sim-*` + clases `pixel-*`). Hoy es **claro/institucional**: fondo gradiente claro, `.pixel-panel` blanco (`rgba(255,255,255,.94)`), textos azul-profundo (`--sim-blue-deep`), acentos azul/teal. Los mockups (`docs/ChatGPT Image *.png`, `iimagen_todo_.png`) y el doc §33 piden lo contrario para el **juego**: paneles **liquid-glass oscuros con bordes morados**, identidad **morado/lavanda SIEP**, escena pixel-art alrededor.

Estado por componente:
- `simulation-hud.component.ts`: ya es oscuro-glass, pero acento **teal** (`#4fa3a5`) y el estrés es una **barra**; el mockup lo muestra como **corazones** + marca SIEP.
- `tool-inventory.component.ts`: dock de botones glass con acento teal; el mockup muestra **badges numéricos** (1..n) por herramienta.
- Overlays ya oscuros (proximity-hint, journal-toggle, safe-exit, end-state, resume): se mantienen; solo se alinea el acento teal→lavanda.

Paleta objetivo (doc §5.3): morado `#7C4DFF`, lavanda `#B69CFF`, fondo `#111827`, panel `#1B2133`, texto `#F4F7FB`, alerta `#F5B84B`, riesgo `#E25A4F`, adecuado `#6EC67A`.

## 2. Objetivos / No-objetivos

**Objetivos:**
1. **Tema scoped del juego → oscuro liquid-glass morado.** Reapuntar las vars `--sim-*` de `.game-container` y volver las reglas que hoy son claras (`.pixel-panel`, `.pixel-badge/chip`, hero/títulos, textos de panel, botones, `progress-segment`, `.game-layer`) a superficies oscuras translúcidas con borde/glow morado y texto lavanda/blanco. Mantener legibilidad (contraste AA) y `prefers-reduced-motion`.
2. **Estrés como corazones** en el HUD: fila de 5 corazones (`full|half|empty`) derivada de `stressIndex`. **Semántica:** más corazones “gastados” = más estrés (el corazón representa la *calma/energía* restante → `calma = 100 - stress`). Lógica en util pura testeada.
3. **Marca SIEP** en el HUD: glifo cerebro (SVG inline) + wordmark “SIEP” a la izquierda del strip.
4. **Dock de herramientas con badge numérico** (1..n) por tile + acento morado glass.
5. **Acentos teal→lavanda** en HUD/dock/overlays para coherencia de identidad.

**No-objetivos (otras rebanadas):** arte pixel-art real, editor de personaje, mover/relayout estructural de paneles (se conserva el grid de posiciones), 1280×720, tocar lógica de juego/contratos, rediseñar la app fuera de la ruta del juego (el portal claro se mantiene).

## 3. Diseño

### 3.1 `stress-hearts.util.ts` (nuevo, puro) + spec

```ts
export type Heart = 'full' | 'half' | 'empty';
/** Convierte stressIndex (0..100) en una fila de `total` corazones que representan
 *  la CALMA restante (100 - stress): stress 0 → todos llenos; stress 100 → todos vacíos.
 *  Medios corazones para los tramos intermedios. */
export function stressToHearts(stressIndex: number, total = 5): Heart[];
```
- `calma = clamp(100 - stressIndex, 0, 100)`. Cada corazón vale `100/total` (=20). `fullCount = floor(calma / step)`; resto `rem = calma - fullCount*step`; un medio si `rem >= step/2`. Rellenar `empty` hasta `total`. Clamp de entradas fuera de rango.

### 3.2 `simulation-play.component.ts` — tema scoped oscuro-glass morado

En el bloque `.game-container` añadir/reapuntar vars:
```
--sim-purple: #7C4DFF; --sim-lavender: #B69CFF;
--sim-ink: #F4F7FB; --sim-ink-soft: rgba(244,247,251,.72); --sim-ink-mute: rgba(244,247,251,.52);
--sim-surface: rgba(27,33,51,.72); --sim-surface-2: rgba(20,26,46,.6);
--sim-border: rgba(182,156,255,.22); --sim-glow: 0 18px 48px -28px rgba(124,77,255,.55);
--sim-green:#6EC67A; --sim-orange:#F5B84B; --sim-red:#E25A4F;
```
y cambiar `.game-container` background a un gradiente oscuro (`#111827`→`#0e1322`) con el grid tenue en morado. Reglas a voltear (claro→glass):
- `.pixel-panel` → `background: var(--sim-surface); backdrop-filter: blur(18px) saturate(125%); border:1px solid var(--sim-border); box-shadow: var(--sim-glow);`
- `.pixel-kicker/.pixel-section-title` → `color: var(--sim-lavender)`.
- `.simulator-hero h1`, `.scenario-panel h2` → `color: var(--sim-ink)`. Textos de cuerpo (`p`, `li`, `timeline-empty`) → `var(--sim-ink-soft/mute)`.
- `.pixel-badge/.pixel-chip` base → glass oscuro (`var(--sim-surface-2)`, borde `--sim-border`, texto lavanda); variantes `--purple/--blue/--green/--orange/--neutral` re-tintadas sobre glass.
- `.pixel-button`, `.pixel-icon-button` → glass morado, texto lavanda, sombra glow (quitar el “4px 4px 0” claro).
- `.progress-segment` base oscuro translúcido; `--filled` → `linear-gradient(90deg, var(--sim-purple), var(--sim-lavender))`.
- `.game-layer`/`.world-skeleton` → borde morado translúcido, fondo `#0e1322`.
- `.ethic-note` (alerta) sobre glass ámbar; `.reflection-box`/`.simulator-empty` sobre glass morado/neutro.
- Overlays ya oscuros: cambiar acentos teal (`#4fa3a5`, `rgba(79,163,165,*)`) → lavanda/morado (proximity-hint, journal-toggle, controls-hint, end-state icon, report span).

### 3.3 `simulation-hud.component.ts` — corazones + marca + acento

- Importar `stressToHearts`; `heartsRow = computed(() => stressToHearts(stress))`. Reemplazar el bloque `.hud-stress` (barra) por una fila de corazones (`mat-icon` `favorite`/`favorite_border`; medio = `favorite` con `clip`/medio-opacidad o icono `heart_broken` para el tramo). Mantener `role="meter"` con `aria-valuenow` y `aria-label` (estrés %). Tinte de corazón según `stressTier` (calm lavanda/verde → critical rojo).
- Añadir a la izquierda del strip un `.hud-brand`: SVG inline del cerebro SIEP (2 hemisferios + nodos) en lavanda + texto “SIEP”.
- Reapuntar `--siep-blue-soft`/teal usados en el HUD a lavanda (`#B69CFF`) vía estilos locales.

### 3.4 `tool-inventory.component.ts` — badge numérico + glass morado

- Añadir índice: `@for (tool of tools(); track tool.code; let i = $index)` y un `<span class="tool-key">{{ i + 1 }}</span>` (badge esquina superior-izq). Acentos teal→morado/lavanda; `--owned` borde/realce lavanda con glow morado.

### 3.5 Marca SIEP (SVG reutilizable)

Glifo inline minimalista (cerebro estilizado: dos formas redondeadas espejadas + 3 nodos/circuito), `currentColor`, ~18px. Vive inline en el HUD (no se crea librería de assets en esta rebanada).

## 4. Errores / bordes / accesibilidad

- `stressToHearts` clamp para `<0`/`>100`/no-finito → fila válida.
- Contraste: textos lavanda/blanco sobre glass oscuro deben cumplir AA (verificar en smoke).
- `prefers-reduced-motion`: sin nuevas animaciones (los corazones no laten salvo el pulse existente, que ya respeta reduce-motion).
- Corazones: `role="meter"` conserva el valor numérico para lectores de pantalla; los iconos son `aria-hidden`.

## 5. Pruebas

- **jest (TDD):** `stress-hearts.util.spec.ts` — `stressToHearts(0)` = 5×full; `(100)` = 5×empty; `(50)` = 2 full + 1 half + 2 empty (calma 50 → 2.5 corazones); `(90)` ≈ 0/1; clamp `(-10)`→full, `(130)`→empty; `total` configurable.
- **ng build** verde.
- **jest suite** completa sin regresión.
- **Smoke navegador** (Brave): abrir `SIM-VBG-001`; capturar el HUD/paneles oscuro-glass morados, corazones de estrés, marca SIEP, dock con badges; comparar contra `iimagen_todo_.png` (§5/§9/§22). Verificar legibilidad y que el portal claro (fuera del juego) no cambió.

## 6. Criterios de aceptación

- El shell del juego se ve oscuro liquid-glass con identidad morada/lavanda; paneles, badges, botones y barra de progreso coherentes con los mockups.
- Estrés mostrado como corazones derivados de `stressIndex` (util testeada); marca SIEP visible; dock con badges numéricos.
- `stress-hearts.util.spec.ts` verde; `ng build` verde; suite jest sin regresión.
- El resto de la app (portal claro) intacto; sin backend/migración; flujo del estudiante y salida segura sin cambios.

## 7. Cómo se procede

`writing-plans` → plan → `executing-plans` (TDD util + restyle por componente, build entre pasos) → `verify` (jest + build + smoke) → `finishing-a-development-branch` (merge a master). Siguiente: editor de personaje.
