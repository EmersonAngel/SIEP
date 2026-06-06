# Juego 2.5D — Rebanada 3: Editor de personaje (avatar por capas)

- **Fecha:** 2026-06-05
- **Estado:** Aprobado (control delegado total). Spec escrito para auditoría.
- **Iniciativa:** SIEP 2.5D pixel-art. Rebanada 3 de ~7. Anteriores: motor de profundidad + HUD liquid-glass (ambas mergeadas).
- **Repos:** **solo frontend.** **Sin backend, sin migración** — el avatar se persiste en `localStorage` (RNF-010 intacto; el esquema Flyway está congelado y el avatar no es dato clínico sensible).
- **Rama:** `feat/character-editor`, sobre `master`.

## 1. Contexto y la restricción de arte

Los mockups (`docs/ChatGPT Image *09_01_31*.png`, `iimagen_todo_.png` §4) muestran un **editor de personaje**: avatar central grande, panel izquierdo de apariencia (tono de piel, ojos, cejas, nariz, boca, peinado, flequillo, largo, color de cabello, accesorios), panel derecho de resumen, selector de **uniforme sin bata / con bata**, vistas previa, botones Guardar/Restablecer/Continuar. Hoy **no existe** ninguna pantalla ni concepto de avatar en el código.

**Restricción dura:** no hay arte pixel-art de avatar por capas (cuerpo/piel/rostro/cabello/uniforme/bata) y no se puede producir en esta rebanada. **Decisión:** construir la pantalla y el sistema de capas **completos y funcionales**, renderizando el avatar con **capas SVG vectoriales** (estilo avatar-creator limpio, coherente con la identidad liquid-glass morada). El renderer se diseña **por capas reemplazables**: cuando exista arte real (PNG/sprites), cada capa SVG se sustituye por su asset sin cambiar el modelo ni la lógica.

## 2. Objetivos / No-objetivos

**Objetivos:**
1. **Modelo `AvatarConfig`** (tipos + catálogos de opciones) y utilidades puras: `defaultAvatar()`, validación/clamp y (de)serialización segura para `localStorage`.
2. **`AvatarStore`** (servicio con Signals sobre `localStorage`, clave `psychosim_avatar`): `avatar()` signal, `update(partial)`, `save()`, `reset()`, carga inicial tolerante a datos corruptos.
3. **Pantalla `CharacterEditorComponent`** en `/portal/personaje` (ESTUDIANTE/ADMIN), layout del mockup: panel izq de apariencia, **avatar SVG en vivo** al centro, panel der de resumen, selector de uniforme (sin bata / con bata) + presets, botones **Guardar / Restablecer / Continuar**. Estética liquid-glass oscura morada (consistente con el HUD).
4. **Renderer de avatar por capas** (`avatar-figure.component`): compone el SVG desde `AvatarConfig` (sombra → cuerpo → piel → uniforme → bata → rostro → cabello-atrás/adelante → accesorio), cada capa una función/`@if` aislada y reemplazable por arte real.
5. **Entrada de navegación** al editor (item en el shell + acceso desde el catálogo/menú del simulador).
6. **Persistencia** del avatar; cargar/guardar entre sesiones. (Integración de mostrarlo dentro del juego Phaser queda como gancho mínimo/posterior — ver No-objetivos.)

**No-objetivos (otras rebanadas):**
- Arte pixel-art real del avatar; animaciones de caminar/hablar.
- **Renderizar el avatar personalizado dentro del runtime Phaser** (el jugador en el mapa sigue siendo el sprite Kenney por ahora; se conecta cuando exista arte de avatar jugable). El editor SÍ guarda el avatar para ese futuro.
- Persistencia en BD / perfil de servidor (sería cambio de esquema, RNF-010).
- Tocar backend, contratos, ni el flujo del estudiante.

## 3. Diseño

### 3.1 Modelo y catálogos — `avatar.model.ts`

```ts
export type Uniform = 'sin-bata' | 'con-bata';
export interface AvatarConfig {
  skinTone: string;     // id de SKIN_TONES
  hairStyle: string;    // id de HAIR_STYLES (incluye 'ninguno')
  hairColor: string;    // id de HAIR_COLORS
  fringe: boolean;      // flequillo
  eyes: string;         // id de EYES
  brows: string;        // id de BROWS
  mouth: string;        // id de MOUTHS
  accessory: string;    // id de ACCESSORIES ('ninguno' | 'gafas' | 'pin')
  uniform: Uniform;
}
```
Catálogos como `ReadonlyArray<{ id: string; label: string; value: string }>` (p.ej. `SKIN_TONES` con hex, `HAIR_COLORS` con hex, `HAIR_STYLES`/`EYES`/`BROWS`/`MOUTHS`/`ACCESSORIES` con ids y label ES). Suficientes para combinar muchos avatares con pocas piezas (doc §19.4/§20).

### 3.2 Utilidades puras — `avatar-config.util.ts` (+ spec)

```ts
export function defaultAvatar(): AvatarConfig;          // valores válidos por defecto
export function isValidAvatar(x: unknown): x is AvatarConfig; // valida ids contra catálogos
export function coerceAvatar(x: unknown): AvatarConfig; // mezcla con default + descarta ids inválidos
export function serializeAvatar(a: AvatarConfig): string;
export function parseAvatar(raw: string | null): AvatarConfig; // parse tolerante → coerceAvatar (corrupto → default)
```
- `coerceAvatar`: para cada campo, si el id no existe en su catálogo, cae al default. Garantiza que el render nunca reciba ids inválidos. `parseAvatar(null)` o JSON inválido → `defaultAvatar()`.

### 3.3 Store — `avatar.store.ts` (+ spec)

Servicio `@Injectable({providedIn:'root'})` con Signals:
- `private _avatar = signal<AvatarConfig>(parseAvatar(localStorage.getItem(KEY)))`.
- `readonly avatar = this._avatar.asReadonly();`
- `update(patch: Partial<AvatarConfig>)`: set merge (no persiste aún → permite "Restablecer" antes de guardar).
- `save()`: `localStorage.setItem(KEY, serializeAvatar(this._avatar()))`.
- `reset()`: `_avatar.set(defaultAvatar())` (no borra lo guardado hasta `save()`).
- `loadSaved()`: re-lee de `localStorage`.
- Clave `KEY = 'psychosim_avatar'`. Acceso a `localStorage` envuelto en try/catch (modo privado / cuota).
- **Test:** con un mock de `localStorage` (objeto en memoria), verificar roundtrip save→load, merge en `update`, `reset`, y tolerancia a corrupto.

### 3.4 Renderer — `avatar-figure.component.ts`

`input<AvatarConfig>()` + `input pose: 'front'|'side' = 'front'`. Renderiza un `<svg viewBox="0 0 120 160">` componiendo, en orden de profundidad:
1. sombra elíptica bajo los pies.
2. cuerpo/torso con color de uniforme (gris-azulado institucional, doc §19.3).
3. cabeza/cuello con `skinTone`.
4. bata blanca encima si `uniform==='con-bata'` (overlay + solapas + pin).
5. rostro: ojos/cejas/boca según ids (formas SVG simples por id).
6. cabello-atrás y cabello-adelante (paths por `hairStyle`, tinte `hairColor`, `fringe` añade flequillo).
7. accesorio (`gafas`/`pin`).
- `pose==='side'`: variante simplificada (transform/mirror) — sin requerir arte nuevo.
- Cada capa es un bloque `@if`/`<ng-container>` aislado y comentado como **punto de reemplazo por arte real**.

### 3.5 Pantalla — `character-editor.component.ts` (ruta `/portal/personaje`)

Layout (mockup §4 / doc §21.2):
- **Header**: kicker "Editor de personaje" + subtítulo; chips de Programa/Rol (de `auth.service.currentUser()`).
- **Panel izq — Apariencia**: grupos Rostro (tono de piel, ojos, cejas, nariz/boca), Cabello (peinado, flequillo, largo→incluido en estilos, color), Accesorios. Cada opción = fila de botones/swatches que llaman `store.update({campo:id})`.
- **Centro — Avatar**: `<app-avatar-figure [config]="avatar()" [pose]="pose()">` grande, con selector de pose (Frontal/Lateral) y aro de luz morado (estético).
- **Panel der — Resumen + Uniforme**: vista del avatar, datos (Programa: Psicología, Rol), selector **Sin bata / Con bata**, presets rápidos (Casual/Clínico/Académico → aplican un `Partial<AvatarConfig>`), detalles seleccionados.
- **Footer**: **Restablecer** (`store.reset()`), **Guardar personaje** (`store.save()` + toast), **Continuar** (guarda y navega a `/portal/simulador`).
- Estética: tema oscuro liquid-glass morado reutilizando los patrones de la rebanada 2 (vars locales `--sim-*` análogas).
- Accesibilidad: cada grupo es un `role="radiogroup"` con `aria-checked`; avatar `aria-hidden` con un resumen textual `sr-only`.

### 3.6 Navegación

- Añadir ruta hija en `app.routes.ts`: `{ path: 'personaje', canActivate:[roleGuard('ESTUDIANTE','ADMIN')], loadComponent: ... }`.
- Añadir item de nav en `shell.component.ts` (rol ESTUDIANTE/ADMIN) "Mi personaje".

## 4. Errores / bordes / accesibilidad

- `localStorage` no disponible (modo privado) → store opera en memoria; `save()` no rompe (try/catch).
- JSON corrupto en la clave → `parseAvatar` cae a `defaultAvatar()`.
- Ids inválidos (versión vieja del modelo) → `coerceAvatar` los normaliza.
- `prefers-reduced-motion`: el aro/halo no anima.
- Contraste AA en los swatches y textos sobre glass oscuro.

## 5. Pruebas

- **jest (TDD):**
  - `avatar-config.util.spec.ts`: `defaultAvatar()` es válido; `coerceAvatar` corrige ids inválidos y conserva válidos; `parseAvatar(null)`/JSON corrupto → default; `serialize`→`parse` roundtrip estable.
  - `avatar.store.spec.ts` (con `localStorage` mock): `save()`→`loadSaved()` roundtrip; `update` hace merge; `reset` vuelve a default sin borrar lo guardado hasta `save`; tolera storage corrupto.
- **ng build** verde; suite jest sin regresión.
- **Smoke navegador (Brave):** ir a `/portal/personaje`; cambiar tono de piel, peinado, color, uniforme (sin/con bata) → el avatar SVG refleja en vivo; Guardar; recargar → persiste; Continuar → navega; verificar layout liquid-glass y legibilidad; portal claro del resto intacto.

## 6. Criterios de aceptación

- Pantalla `/portal/personaje` funcional con avatar SVG en vivo por capas; cambios de apariencia/uniforme se reflejan inmediatamente.
- Avatar persiste en `localStorage` y sobrevive recarga; Restablecer y Continuar funcionan.
- `avatar-config.util.spec.ts` y `avatar.store.spec.ts` verdes; `ng build` verde; suite jest sin regresión.
- Sin backend, sin migración; el flujo del estudiante y el resto de la app intactos.
- Renderer arquitectado por capas reemplazables (documentado) para arte real futuro.

## 7. Cómo se procede

`writing-plans` → plan → `executing-plans` (TDD util+store, luego renderer y pantalla, build entre pasos) → `verify` (jest + build + smoke) → `finishing-a-development-branch` (merge a master). Integrar el avatar dentro del runtime Phaser y el arte real son rebanadas posteriores.
