# Auditoría — Flujo Competitivo + NPCs Modulares Vivos (2026-06-12)

Rama `feat/flujo-competitivo-npcs` sobre `34b45c1` (fase C). Plan ejecutado:
`docs/superpowers/plans/2026-06-11-flujo-competitivo-npcs-modulares.md`
(spec: `docs/PROMPT_MAESTRO_FLUJO_COMPETITIVO_NPCS_MODULARES.md`).

## Commits de la fase

| Commit | Contenido |
|---|---|
| `a4a8df9` | fix(game): unificar nudge tactil con movimiento de jugador |
| `e99d7ed` | feat(game): agregar presets de npc modular |
| `a0a36f4` | feat(game): renderizar npcs con avatar modular |
| `c83861a` | feat(game): movimiento de npc por zonas |
| `e23eff8` | feat(game): configurar npcs vivos en caso principal |
| `5da2810` | feat(game): fortalecer flujo de decisiones y evidencia |
| `0dd20eb` | feat(game): conectar salas por puertas de caso |
| `49353ce` | feat(game): mejorar reporte final de consecuencias |
| `e36bc5e` | fix(game): puertas jugables — prioridad npc sobre ambient y entrada persistida |
| (este)   | test(game): auditoria e2e de flujo competitivo |

## Gates

- `npm run build` ✅ · `npm test -- --runInBand` ✅ **32 suites / 190 tests**
  (baseline fase C: 31/158 — 32 tests nuevos de nudge, presets, render NPC,
  motion por zonas, validación de escenarios, paciente, evidencia y timeline).
- `pytest apps/simulation` ✅ **67 passed** (baseline 65 — nuevos: seed de
  puertas idempotente+jugable y timeline del completion report).
- BD dev: `manage.py seed_competitive_doors` aplicado (2 puertas EXIT).

## Recorridos E2E live (Playwright, evidencia en esta carpeta)

**Camino ideal (`flow_check.py --good`) → RESULTADO: OK**
PAP → enfermera (canvas) → línea desbloqueada de la consultante ("me amenazó
con un cuchillo") → decisión adecuada → RISK_METER → Ruta VBG → Informe →
Valoración → Ruta NNA → **COMPLETED**: 5 adecuadas, confianza 100%, riesgo 25%,
ruta institucional activada, desempeño *Excelente*, timeline mm:ss con deltas
(`09-final-report-good.png`).

**Camino con errores (`flow_check.py --bad`) → RESULTADO: OK**
Decisión sin evidencia → chip "Información incompleta" + gate "Criterio
profesional" (`06-stage-1-risky-path.png`, `06b-evidence-gate.png`) →
mediación con agresor (prohibida) → *Alerta ética* + paciente en crisis
(`06c-prohibited-feedback.png`) → salida segura → reporte: -80 pts, estrés 77%,
*Requiere refuerzo*, "Riesgo de revictimización detectado", timeline con la
prohibida en rojo (`10-final-report-bad-or-risky.png`).

**Puertas (`door_check.py`) → RESULTADO: OK**
Prompt "Sala de escucha →" (`03-door-prompt.png`) → E sin evidencia →
bloqueada con feedback (`03b-door-locked.png`) → hablar con enfermera
(`03c-enfermera-dialogue.png`) → E → cruce con entrada persistida y prompt de
regreso (`04-room-transition.png`) → E → de vuelta en urgencias
(`04b-room-return.png`).

## Criterios de aceptación (spec §21)

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Flujo de caso de 5-6 etapas completo | ✅ | flow_check --good (6 nodos hasta terminal) |
| 2 | Camino ideal jugable | ✅ | 09-final-report-good.png |
| 3 | ≥3 errores recuperables | ✅ | decisiones 1,2,4,7,11 (RISKY/INADEQUATE no prohibidas) |
| 4 | ≥1 error grave/prohibido con consecuencia | ✅ | decisiones 5 y 9; 06c + revictimización en reporte |
| 5 | Decisiones cambian métricas visiblemente | ✅ | feedback con deltas + HUD + reporte |
| 6 | trust/risk/stress/PatientState reflejados | ✅ | barras C/B en HUD, tint/shake paciente, chips del reporte |
| 7 | ≥4 NPCs modulares con skins fijas | ✅ | urgencias: enfermera/madre/seguridad/colega + paciente marker (01) |
| 8 | Sin Kenney en demo principal (solo fallback) | ✅ | 01-player-and-modular-npcs.png |
| 9 | ≥3 comportamientos configurados | ✅ | attentive/pace/patrol/subtle-wander/avoidant en JSONs (spec jest los valida) |
| 10 | NPCs en zonas sin atravesar paredes | ✅ | scenario-npc-configs.spec (colisiones reales) + 02 |
| 11 | NPCs se pausan en diálogo/journal/outcome | ✅ | `worldMotionPaused` → `setMotionPaused` (02 + live) |
| 12 | ≥2 salas conectadas por puertas | ✅ | urgencias ↔ sala de escucha (door_check) |
| 13 | Puerta usa enterRoom existente | ✅ | `tryOpenDoor` → `SimulationService.enterRoom`; sin sistema paralelo |
| 14 | Se puede volver a la sala anterior | ✅ | 04b-room-return.png |
| 15 | Reporte explica decisiones y consecuencias | ✅ | timeline + consecuencias + recomendaciones (09/10) |
| 16 | Desktop 1600×900 sin solapes | ✅ | 01/02 + measurements (canvas.right 1488 < 1600) |
| 17 | Desktop 1366×768 sin solapes | ✅ | 04b-desktop-1366.png + measurements |
| 18 | Mobile 390×844 sin overflow horizontal | ✅ | scrollWidth 390 = viewport (11/12/13) |
| 19 | `npm run build` pasa | ✅ | gate final |
| 20 | `npm test -- --runInBand` pasa | ✅ | 190/190 |
| 21 | Tests backend pasan | ✅ | pytest 67/67 |
| 22 | Capturas de auditoría guardadas | ✅ | esta carpeta (before + 01-14) |
| 23 | Sin errores críticos de consola | ✅ | measurements: 0 en los 5 contextos |
| 24 | Sin assets 404 | ✅ | measurements: 0 en los 5 contextos |

## Hallazgos del walk-through live (arreglados en `e36bc5e`)

1. La zona ambiental del protocolo (r=68 en 760,430) se robaba la E junto a la
   enfermera → ahora un NPC en rango de diálogo tiene prioridad sobre ambient.
2. La puerta de regreso quedaba sellada entre el sofá y la planta → reubicada
   a la esquina inferior izquierda (122,460) con entrada (160,452).
3. Al cambiar de mapa, el `keepPosition` del re-render transicional pisaba la
   entrada persistida por `enter_room` → `setWorld` resetea `currentRoomKey`
   cuando cambia `map.key`.

## Notas / deuda conocida

- La paciente del caso es el marker PERSON `escucha-segura` (preset
  `paciente-vbg`, estática); el behavior `avoidant` corre en los NPCs de
  comisaría (`paciente-comisaria`) y NNA (`adolescente-nna`).
- Salas 2-6 comparten el lienzo de la sala autoría con tono/NPCs/markers
  propios; arte único por sala queda para una fase de arte.
- El registro "habló con NPC" para evidencia es de sesión (frontend);
  refrescar la página re-pide hablar con la enfermera (gating de presentación,
  el backend sigue siendo la autoridad del puntaje).
- `intervention-rules.json` se carga por HTTP con fallback empotrado.
