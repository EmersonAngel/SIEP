# T3.2 — Retiro del quiz legacy (con extracción del reporting)

> Estado: **diseño aprobado** (2026-06-05). Sub-proyecto del cleanup Tier 3.
> Precede a la fase de plan (`writing-plans`) → implementación (`executing-plans`).

## Contexto y objetivo

El backend Django arrastra el **quiz ABCD legacy** (apps `casos` + `sesiones`), que el
**simulador** ya reemplazó por completo. El usuario confirmó (2026-06-05) que **ningún
curso lo usa** → se retira.

Objetivo: eliminar el camino de código del quiz legacy (backend + frontend), **sin tocar
las tablas Flyway** (retención de datos) y **sin romper el simulador**.

## Hallazgo clave que define el alcance

`reportes` **no es legacy**. Vive físicamente dentro de la app `sesiones`
(`services_reportes.py`, `views_reportes.py`, `urls_reportes.py`, `tests/test_reportes.py`),
pero es la **capa de reporting del simulador**: mezcla datos del quiz legacy (`SesionJuego`)
**con** datos del simulador (`SimulationAttempt`, `AttemptEvent`, `ReflectionJournal`,
`RubricEvaluation`). El **dashboard** y el **reporte de grupo** dependen de ello.

⇒ Borrar `sesiones` a secas rompería el dashboard y los reportes del simulador. Por eso
T3.2 **no es un borrado, es un refactor**: primero se **extrae** el reporting del simulador
fuera de `sesiones` (purgando la mezcla legacy), y **luego** se borra el quiz.

## Arquitectura objetivo

```
ANTES                                  DESPUÉS
apps/
  casos/         (quiz content CRUD)     ── borrada
  sesiones/                              ── borrada
    services.py  (quiz playing)
    services_reportes.py (BLEND) ───────► apps/reportes/services.py  (solo-simulador)
    views_reportes.py            ───────► apps/reportes/views.py
    urls_reportes.py             ───────► apps/reportes/urls.py
    tests/test_reportes.py       ───────► apps/reportes/tests/test_reportes.py
  grupos/        (sin cambios)           grupos/    (sin cambios)
  simulation/    (sin cambios)           simulation/(sin cambios)
                                         reportes/  (NUEVA: sin modelos; consume
                                                     simulation + grupos)
```

`apps.reportes` **no define modelos** (consulta los de `simulation` y `grupos`), así que no
requiere migraciones.

## Cambios backend

**A. Nueva app `apps.reportes`** (sin modelos):
- Mover `services_reportes.py` → `apps/reportes/services.py`, **purgando lo legacy**:
  - `get_dashboard()`: quitar `sesiones_completadas_hoy`, `avg_legacy`, `ultimas_sesiones`,
    y las entradas `origen="LEGACY"` de `intentos_recientes`. `estudiantesActivos` pasa a
    ser solo `simulaciones_completadas_hoy`. El DTO **deja de exponer** `ultimasSesiones`;
    `casosCompletadosHoy` se renombra/reemplaza por `simulacionesCompletadasHoy`.
  - `generar_reporte_grupo(grupo_id, case_version_id)`: quitar `_build_legacy_report` y
    los campos legacy del envoltorio (`totalSesiones`, `puntajePromedio` legacy,
    `tasaAciertos`, `tiempoPromedioMs`, `estudiantes` legacy). El reporte pasa a ser el
    bloque `simulacion` + `grupoId`/`caseVersionId`. Se elimina el parámetro `caso_id`.
  - `exportar_csv(grupo_id, case_version_id)`: quitar la rama CSV legacy; siempre layout
    de simulación. Se elimina `caso_id`.
  - Quitar `from .models import SesionJuego` y todo helper que dependa de él
    (`_build_legacy_report`, `_empty_legacy`).
- Mover `views_reportes.py` → `apps/reportes/views.py` y `urls_reportes.py` →
  `apps/reportes/urls.py`, ajustando el plumbing de parámetros (sin `casoId`).
- Mover `tests/test_reportes.py` → `apps/reportes/tests/`, **adaptando** las aserciones que
  validaban la mezcla legacy (quitarlas; conservar/expandir las de simulación).

**B. Borrar `apps.casos`** completa (models, serializers, services, views, urls, tests,
migrations).

**C. Borrar `apps.sesiones`** completa, una vez extraído el reporting (models
`SesionJuego`/`Respuesta`, serializers, services, views, urls, tests, migrations).

**D. Wiring**:
- `psychosim/settings/base.py` → `INSTALLED_APPS`: quitar `apps.casos`, `apps.sesiones`;
  agregar `apps.reportes`.
- `psychosim/urls.py`: quitar `api/casos` y `api/sesiones`; `api/reportes` →
  `include("apps.reportes.urls")`.

**Base de datos**: **sin cambios**. Los modelos eran `managed=False`; las tablas
(`casos`, `escenarios`, `preguntas`, `opciones`, `sesiones_juego`, `respuestas`) las posee
Flyway y **permanecen** (retención de datos, RNF-010 intacto). Solo desaparece el Python.

## Cambios frontend

- **Borrar** `features/casos/` (`caso-list.component`, `caso-form.component`) y sus rutas
  legacy en `app.routes.ts` (`casos`, `casos/nuevo`, `casos/:id/editar`) + los redirects
  `casos`/`reportes`. **Conservar** `casos/:caseVersionId/editor` (es el editor del
  simulador, no el quiz).
- **`dashboard.component.ts`**: quitar el panel "Últimas sesiones" (usaba `ultimasSesiones`)
  y la métrica con fallback legacy; consumir el DTO solo-simulador
  (`simulacionesCompletadasHoy`, etc.). Conserva TODAS las métricas del simulador.
- **`reporte-grupo.component.ts`**: quitar la sección del reporte legacy y el parámetro
  `casoId`; pasar a `getReporteGrupo(grupoId, caseVersionId)` solo-simulación.
- **Report service**: quitar `getCasos`/llamadas legacy; actualizar la firma de
  `getReporteGrupo` y los tipos del DTO de dashboard/reporte.

## Consecuencia visible (aprobada)

Dashboard y reporte de grupo quedan **enfocados solo en el simulador**: conservan todas las
métricas del simulador (intentos, decisiones, bitácoras, rúbricas, promedios), y pierden los
paneles del quiz legacy ("Últimas sesiones", "casos completados hoy"), que ya salían vacíos
sin el quiz.

## Testing y verificación

- **pytest**: se eliminan `test_casos` y `test_sesiones`; `test_reportes` se adapta a
  solo-simulación (sin aserciones de mezcla legacy). El resto de la suite del simulador debe
  permanecer **verde** (regresión = no romper el flujo del estudiante).
- **jest**: las specs del frontend afectadas (dashboard, reporte) se ajustan al DTO nuevo.
- **`ng build`** verde.
- **Smoke** (HTTP/navegador): dashboard carga con métricas de simulación; reporte de grupo
  carga por `caseVersionId`; el editor (`casos/:id/editor`) y el juego del estudiante siguen
  funcionando.

## Riesgos y reversibilidad

- **Reversible** vía git (rama dedicada; las tablas no se tocan).
- Riesgo principal: que el de-legacy del reporting cambie el contrato del dashboard y rompa
  el frontend → mitigado actualizando frontend y specs en el mismo cambio + smoke.
- Cumple reglas de oro: Spring intacto, esquema intacto (`managed=False`), flujo del
  estudiante intacto, sin modificar versiones publicadas.

## Fuera de alcance

- No se borran tablas (Flyway).
- No se toca el backend Spring (T3.3, diferido).
- No se toca `ScenarioConfig` (T3.1, coexistencia justificada).

## Secuencia de slices (para el plan)

1. **Extraer reporting → `apps.reportes`** (solo-simulador) + re-wire `urls`/`INSTALLED_APPS`;
   pytest del reporting verde. *(El quiz sigue existiendo en este punto.)*
2. **Borrar `apps.casos` + `apps.sesiones`** (backend) + wiring; pytest verde.
3. **Frontend**: borrar `features/casos` + rutas; actualizar dashboard/reporte/servicio al
   DTO solo-simulador; jest + ng build + smoke verdes.
