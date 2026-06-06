# Juego 2.5D — Rebanada 5: Panel de diálogo (identidad morada + opciones numeradas)

- **Fecha:** 2026-06-05
- **Estado:** Aprobado (control delegado total). Spec para auditoría.
- **Iniciativa:** SIEP 2.5D pixel-art. Rebanada 5 de ~7. Anteriores: motor profundidad, HUD, editor de personaje, pantalla de resultados (todas mergeadas).
- **Repos:** **solo frontend.** Sin backend, sin migración.
- **Rama:** `feat/game-dialogue-panel`, sobre `master`.

## 1. Contexto

`dialogue-panel.component.ts` (383 líneas) ya renderiza: retrato (un `<mat-icon>` que en esta app es un **rombo placeholder** — no hay fuente de iconos), nombre del hablante, texto con **typewriter**, y opciones de respuesta con estilos `recomendada`/`contraindicada`. Acento **teal** (`#4fa3a5`). Tiene un warning **NG8107** pre-existente en la línea 70 (`d.choices?.length` con `?.` redundante).

El mockup §22.2 / imagen 2 (panel "¿Cómo responderás?") y la lámina §10 muestran: retrato del NPC, texto, y **opciones numeradas (1, 2, 3)** seleccionables, con identidad morada/lavanda. La doc §22.2 sugiere además selección por número.

## 2. Objetivos / No-objetivos

**Objetivos:**
1. **Opciones numeradas**: cada opción muestra un **badge numérico** (1..n) y se puede **seleccionar con el teclado** (teclas 1–9) cuando el diálogo está completo y hay opciones. Lógica tecla→índice en util pura testeada.
2. **Identidad morada/lavanda**: reemplazar acentos teal/azul del panel (strip, retrato, nombre, opciones, cursor) por morado/lavanda (coherente con el HUD de la rebanada 2). Variantes `recomendada`/`contraindicada` re-tintadas legibles sobre glass oscuro.
3. **Retrato NPC vectorial**: reemplazar el `<mat-icon>` (rombo) por una **silueta SVG** de persona + aro de emoción, en marco morado. Reusable, sin fuente de iconos.
4. **Fix NG8107** (línea 70): `!d.choices?.length` → `!d.choices.length` (el tipo no es nullable).
5. Mantener typewriter, audio, recomendada/contraindicada, accesibilidad (aria-label de opciones, `role="dialog"`), y `prefers-reduced-motion`.

**No-objetivos:**
- Cambiar la **pedagogía** de mostrar recomendada/contraindicada antes de elegir (es decisión de producto existente; la doc §22.2 prefiere revelar la clasificación *después*, pero eso es un cambio de comportamiento fuera de esta rebanada visual). Se conserva el comportamiento actual.
- Retrato con arte real del NPC; emociones animadas complejas; tocar backend/contratos.

## 3. Diseño

### 3.1 `dialogue-keys.util.ts` (nuevo, puro) + spec

```ts
/** Mapea una tecla de dígito '1'..'9' a un índice 0..8; cualquier otra → null. */
export function digitIndex(key: string): number | null;
```
- `'1'`→0 … `'9'`→8; `'0'`, letras, vacío, multi-char → null.

### 3.2 `dialogue-panel.component.ts`

- **Badge numérico**: en el `@for (choice of d.choices; track choice.key; let i = $index)` añadir `<span class="choice-num">{{ i + 1 }}</span>` al inicio del botón (junto al icono de estado). El número es la guía visual del mockup.
- **Teclado**: `@HostListener('document:keydown', ['$event'])` → si `dialogue()` y `isTypingComplete()` y hay choices y `digitIndex(e.key)` cae dentro del rango, `e.preventDefault()` + `handleChoice(choices[idx])`. Guarda para no interferir con el juego (solo actúa con choices visibles). No captura Escape (lo maneja el shell).
- **Retrato SVG**: reemplazar el `<mat-icon>{{ portraitIcon(...) }}</mat-icon>` por una silueta inline `<svg>` (cabeza + hombros) en lavanda; conservar `emotion-chip`. `portraitIcon()` deja de usarse para el glifo (se puede retirar o conservar para aria).
- **Restyle**: teal→morado/lavanda en `.dialogue-strip` (borde superior), `.portrait`, `.speaker-name`, `.cursor`, `.choice-btn` (borde/hover/focus), `.choice-btn__icon`. `recomendada` (azul→lavanda/teal suave) y `contraindicada` (rojo, se mantiene semántico). Quitar el `box-shadow: 4px 4px 0` plano por un glow sutil. `strip--supervisory`/`strip--warning` conservan verde/rojo semánticos.
- **Fix NG8107**: línea 70.

### 3.3 Estilos del badge

`.choice-num`: círculo/cuadro redondeado ~22px, borde lavanda, número monoespaciado, color lavanda; en `recomendada` hereda el acento.

## 4. Errores / bordes / accesibilidad

- Teclas fuera de rango o sin choices → no-op (no `preventDefault`).
- Más de 9 opciones (improbable) → solo 1–9 mapean; el resto por click.
- `digitIndex` robusto a `''`/multi-char/no dígitos.
- Opciones siguen con `aria-label` descriptivo; el badge es `aria-hidden`.
- `prefers-reduced-motion`: sin cambios (ya respetado).

## 5. Pruebas

- **jest (TDD):** `dialogue-keys.util.spec.ts`: `digitIndex('1')===0`, `digitIndex('3')===2`, `digitIndex('9')===8`, `digitIndex('0')===null`, `digitIndex('a')===null`, `digitIndex('')===null`, `digitIndex('12')===null`.
- **ng build** verde (y **sin** el warning NG8107 de dialogue-panel).
- **jest suite** completa sin regresión.
- **Smoke navegador:** en `SIM-VBG-001`, acercarse a un NPC/objeto con decisión y abrir el diálogo → panel morado liquid-glass, retrato SVG, **opciones numeradas**; pulsar una tecla numérica selecciona la opción; verificar recomendada/contraindicada legibles y typewriter intacto.

## 6. Criterios de aceptación

- Panel de diálogo con identidad morada/lavanda, retrato SVG y opciones numeradas seleccionables por teclado y click.
- `dialogue-keys.util.spec.ts` verde; `ng build` verde sin el NG8107 de este componente; suite jest sin regresión.
- Typewriter, audio, recomendada/contraindicada y accesibilidad intactos; sin backend; flujo del estudiante sin cambios.

## 7. Cómo se procede

`writing-plans` → plan → `executing-plans` (TDD util, luego restyle/teclado/retrato, build) → `verify` (jest+build+smoke) → `finishing-a-development-branch` (merge a master).
