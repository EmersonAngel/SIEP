# T3.2 — Retiro del quiz legacy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirar el quiz ABCD legacy (apps `casos` + `sesiones`) sin romper el simulador ni tocar el esquema Flyway, extrayendo primero el reporting del simulador a una app `apps.reportes` propia.

**Architecture:** Refactor en 3 slices. (1) Extraer reporting → nueva app `apps.reportes` (sin modelos, solo-simulador), purgando la mezcla legacy; (2) borrar apps `casos`/`sesiones`; (3) frontend: borrar UI del quiz + DTO solo-simulador. Las tablas las posee Flyway y permanecen (modelos `managed=False`).

**Tech Stack:** Django 5.1 + DRF (backend, `psico_project_v2/backend_django`), Angular 21 (frontend, `psicologia_proyecto/admin-panel`). pytest (settings `psychosim.settings.test`, BD real :5433), jest, `ng build`.

**Spec:** `docs/superpowers/specs/2026-06-05-retire-legacy-quiz-design.md`

---

## Pre-flight

- [ ] **Confirmar BD arriba**: `docker compose up -d db` desde `psicologia_proyecto` (Postgres :5433). Docker Desktop encendido.
- [ ] **Backend baseline verde**: desde `backend_django`,
  `./.venv/Scripts/python.exe -m pytest -q` → 129 passed (baseline antes de tocar).
- [ ] **Crear rama de código** (en AMBOS repos), partiendo de la integración completa:
  ```bash
  # backend
  git -C /d/Sua_Files/IdeaProjects/psico_project_v2 checkout chore/cleanup-django
  git -C /d/Sua_Files/IdeaProjects/psico_project_v2 checkout -b feat/retire-legacy-quiz
  # frontend
  git -C /d/Sua_Files/IdeaProjects/psicologia_proyecto checkout chore/cleanup-django
  git -C /d/Sua_Files/IdeaProjects/psicologia_proyecto checkout -b feat/retire-legacy-quiz
  ```
  (El plan/spec ya viven en `master` del backend; el código va en esta rama.)

---

## Task 1: Backend — extraer reporting → `apps.reportes` (solo-simulador)

Crea la app de reporting nueva, sim-only, re-cablea `api/reportes` hacia ella, y elimina
los archivos de reporting viejos dentro de `sesiones`. El quiz (`casos`/`sesiones`) sigue
existiendo tras esta task; solo el reporting se muda y se purga de legacy.

**Files:**
- Create: `apps/reportes/__init__.py`, `apps/reportes/apps.py`, `apps/reportes/services.py`,
  `apps/reportes/views.py`, `apps/reportes/urls.py`, `apps/reportes/tests/__init__.py`,
  `apps/reportes/tests/test_reportes.py`
- Modify: `psychosim/settings/base.py` (INSTALLED_APPS), `psychosim/urls.py`
- Delete: `apps/sesiones/services_reportes.py`, `apps/sesiones/views_reportes.py`,
  `apps/sesiones/urls_reportes.py`, `apps/sesiones/tests/test_reportes.py`

- [ ] **Step 1: Escribir el test sim-only** (contrato nuevo del reporting)

`apps/reportes/tests/test_reportes.py` (crear, junto con `apps/reportes/tests/__init__.py` vacío):

```python
"""T3.2 — Reportes sim-only (extraídos de sesiones, sin mezcla legacy).

Corren contra la BD real psychosim (rollback por test). Los agregados del
dashboard son GLOBALES; se asertan estructura, permisos y deltas deterministas
de estudiantes recién creados (sin intentos previos).
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIClient

from apps.grupos.models import Grupo
from apps.simulation.models import CaseVersion

User = get_user_model()

DASHBOARD_KEYS = [
    "estudiantesActivos", "simulacionesCompletadasHoy", "puntajePromedioGlobal",
    "simulacionesCompletadas", "simulacionesEnProgreso", "puntajePromedioSimulacion",
    "decisionesAdecuadas", "decisionesRiesgosas", "decisionesInadecuadas",
    "decisionesProhibidas", "ultimosIntentos", "intentosRecientes",
]
LEGACY_KEYS_GONE = ["casosCompletadosHoy", "ultimasSesiones"]


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_rep@x.com", password="pass1234", nombre="Pro", apellido="Fe", role="PROFESOR"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_rep@x.com", password="pass1234", nombre="Est", apellido="Rep", role="ESTUDIANTE"
    )


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(
        simulation_case__code="SIM-VBG-001", status="PUBLISHED"
    ).id


def _grupo(profesor):
    return Grupo.objects.create(
        nombre="G-rep", codigo=f"REP{uuid.uuid4().hex[:6].upper()}", profesor=profesor
    )


def _add_student(grupo, estudiante):
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            [grupo.id, estudiante.id],
        )


# --- permissions -----------------------------------------------------------
def test_dashboard_forbidden_for_estudiante(estudiante):
    assert cl(estudiante).get("/api/reportes/dashboard").status_code == 403


def test_grupo_forbidden_for_estudiante(estudiante):
    assert cl(estudiante).get("/api/reportes/grupo/1").status_code == 403


# --- dashboard (sim-only) --------------------------------------------------
def test_dashboard_structure_is_simulation_only(profesor):
    resp = cl(profesor).get("/api/reportes/dashboard")
    assert resp.status_code == 200
    data = resp.data["data"]
    for key in DASHBOARD_KEYS:
        assert key in data, f"missing {key}"
    for key in LEGACY_KEYS_GONE:
        assert key not in data, f"legacy key should be gone: {key}"
    assert isinstance(data["intentosRecientes"], list)
    assert isinstance(data["ultimosIntentos"], list)


# --- group report (sim-only) ----------------------------------------------
def test_grupo_report_404(profesor):
    assert cl(profesor).get("/api/reportes/grupo/99999999").status_code == 404


def test_grupo_report_no_version_is_empty(profesor):
    grupo = _grupo(profesor)
    d = cl(profesor).get(f"/api/reportes/grupo/{grupo.id}").data["data"]
    assert d["grupoId"] == grupo.id
    assert d["caseVersionId"] is None
    assert d["simulacion"] is None
    assert "totalSesiones" not in d
    assert "estudiantes" not in d


def test_grupo_report_simulation_block(profesor, estudiante, case_version_id):
    grupo = _grupo(profesor)
    _add_student(grupo, estudiante)
    c = cl(estudiante)
    start = c.post(
        "/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json"
    ).data["data"]
    token, attempt_id = start["attemptToken"], start["attemptId"]
    option_id = start["currentNode"]["options"][0]["id"]
    c.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": option_id},
        format="json",
    )
    d = cl(profesor).get(
        f"/api/reportes/grupo/{grupo.id}?caseVersionId={case_version_id}"
    ).data["data"]
    sim = d["simulacion"]
    assert sim is not None
    assert d["caseVersionId"] == case_version_id
    assert sim["totalIntentos"] == 1
    assert sim["intentosEnProgreso"] == 1
    decisiones = (
        sim["decisionesAdecuadas"] + sim["decisionesRiesgosas"] + sim["decisionesInadecuadas"]
    )
    assert decisiones == 1
    mine = next(e for e in sim["estudiantes"] if e["nombre"] == "Est Rep")
    assert mine["totalIntentos"] == 1
    assert mine["estado"] == "EN_PROGRESO"


# --- CSV export (sim-only) -------------------------------------------------
def test_export_csv_simulation_format(profesor, estudiante, case_version_id):
    grupo = _grupo(profesor)
    _add_student(grupo, estudiante)
    cl(estudiante).post(
        "/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json"
    )
    resp = cl(profesor).get(
        f"/api/reportes/grupo/{grupo.id}/export?caseVersionId={case_version_id}"
    )
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/csv;charset=UTF-8"
    content = resp.content.decode("utf-8")
    assert "success" not in content
    lines = content.split("\n")
    assert lines[0] == (
        "Estudiante,Intentos,Completados,En progreso,Salida segura,Puntaje prom.,"
        "Adecuadas,Riesgosas,Inadecuadas,Bitacoras,Rubricas,Estado"
    )
    assert any(line.startswith("Est Rep,1,") for line in lines)
```

- [ ] **Step 2: Correr el test → debe FALLAR**

Run: `./.venv/Scripts/python.exe -m pytest apps/reportes/tests/test_reportes.py -q`
Expected: error de colección / 404 (la app `apps.reportes` y la ruta aún no existen).

- [ ] **Step 3: Crear el package `apps.reportes`**

`apps/reportes/__init__.py` (vacío).

`apps/reportes/apps.py`:
```python
from django.apps import AppConfig


class ReportesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reportes"
```

- [ ] **Step 4: Escribir `apps/reportes/services.py`** (sim-only, sin `SesionJuego`)

```python
"""Reporting del simulador: dashboard global + reporte por grupo + export CSV.

Extraído de la app legacy ``sesiones`` (T3.2). Todas las métricas son
solo-simulación (SimulationAttempt / AttemptEvent / ReflectionJournal /
RubricEvaluation); se removió la mezcla del quiz legacy. El CSV se devuelve como
string plano (sin envoltorio JSON), con ``.`` decimal y ``,`` delimitador.
"""
from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Avg
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.grupos.models import Grupo
from apps.simulation.models.attempt import (
    AttemptEvent,
    ReflectionJournal,
    SimulationAttempt,
)
from apps.simulation.models.rubric import RubricEvaluation

User = get_user_model()

DECISION_EVENT_TYPES = ["DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED"]
SCORED_STATUSES = ["COMPLETED", "SAFE_EXITED"]


def _nombre_completo(user):
    return f"{user.nombre} {user.apellido}"


def _grupo_student_ids(grupo_id):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT estudiante_id FROM grupo_estudiante WHERE grupo_id = %s", [grupo_id]
        )
        return [row[0] for row in cur.fetchall()]


def _count_decisions(attempt_ids, classification):
    if not attempt_ids:
        return 0
    return AttemptEvent.objects.filter(
        attempt_id__in=attempt_ids,
        event_type__in=DECISION_EVENT_TYPES,
        decision_option__classification=classification,
    ).count()


def _count_reflections(attempt_ids):
    if not attempt_ids:
        return 0
    return ReflectionJournal.objects.filter(attempt_id__in=attempt_ids).count()


def _count_rubrics(attempt_ids):
    if not attempt_ids:
        return 0
    return (
        RubricEvaluation.objects.filter(attempt_id__in=attempt_ids)
        .values("attempt_id")
        .distinct()
        .count()
    )


# --- Dashboard -------------------------------------------------------------
def get_dashboard():
    start_of_day = datetime.combine(timezone.now().date(), time.min)

    simulaciones_completadas_hoy = SimulationAttempt.objects.filter(
        status__in=SCORED_STATUSES, ended_at__gte=start_of_day
    ).count()
    simulaciones_en_progreso = SimulationAttempt.objects.filter(
        status="IN_PROGRESS"
    ).count()
    simulaciones_completadas = SimulationAttempt.objects.filter(
        status__in=SCORED_STATUSES
    ).count()
    avg_sim = float(
        SimulationAttempt.objects.filter(status__in=SCORED_STATUSES).aggregate(
            a=Avg("accumulated_score")
        )["a"]
        or 0
    )

    ultimos_intentos = [
        {
            "id": str(a.id),
            "casoTitulo": a.case_version.simulation_case.title,
            "estudiante": _nombre_completo(a.student),
            "puntaje": a.accumulated_score,
            "estado": a.status,
        }
        for a in SimulationAttempt.objects.select_related(
            "case_version__simulation_case", "student"
        ).order_by("-started_at")[:10]
    ]
    intentos_recientes = sorted(
        ultimos_intentos, key=lambda x: x["puntaje"], reverse=True
    )[:10]

    return {
        "estudiantesActivos": simulaciones_completadas_hoy,
        "simulacionesCompletadasHoy": simulaciones_completadas_hoy,
        "puntajePromedioGlobal": avg_sim,
        "simulacionesCompletadas": simulaciones_completadas,
        "simulacionesEnProgreso": simulaciones_en_progreso,
        "puntajePromedioSimulacion": avg_sim,
        "decisionesAdecuadas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="ADEQUATE",
        ).count(),
        "decisionesRiesgosas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="RISKY",
        ).count(),
        "decisionesInadecuadas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="INADEQUATE",
        ).count(),
        "decisionesProhibidas": AttemptEvent.objects.filter(
            event_type="PROHIBITED_DECISION_SELECTED"
        ).count(),
        "ultimosIntentos": ultimos_intentos,
        "intentosRecientes": intentos_recientes,
    }


# --- Group report ----------------------------------------------------------
def generar_reporte_grupo(grupo_id, case_version_id):
    grupo = Grupo.objects.filter(pk=grupo_id).first()
    if not grupo:
        raise NotFound(f"Grupo no encontrado: {grupo_id}")
    simulacion = (
        _build_simulation_report(grupo, case_version_id)
        if case_version_id is not None
        else None
    )
    return {
        "grupoId": grupo_id,
        "caseVersionId": case_version_id,
        "simulacion": simulacion,
    }


def _empty_simulation_report():
    return {
        "totalIntentos": 0,
        "intentosCompletados": 0,
        "intentosEnProgreso": 0,
        "intentosSalidaSegura": 0,
        "puntajePromedio": 0.0,
        "decisionesAdecuadas": 0,
        "decisionesRiesgosas": 0,
        "decisionesInadecuadas": 0,
        "bitacorasRegistradas": 0,
        "rubricasAplicadas": 0,
        "estudiantes": [],
    }


def _build_simulation_report(grupo, case_version_id):
    student_ids = _grupo_student_ids(grupo.id)
    if not student_ids:
        return _empty_simulation_report()

    attempts = list(
        SimulationAttempt.objects.filter(
            case_version_id=case_version_id, student_id__in=student_ids
        ).order_by("-started_at")
    )
    if not attempts:
        return _empty_simulation_report()

    completados = sum(1 for a in attempts if a.status == "COMPLETED")
    en_progreso = sum(1 for a in attempts if a.status == "IN_PROGRESS")
    salida_segura = sum(1 for a in attempts if a.status == "SAFE_EXITED")
    scored = [a for a in attempts if a.status in SCORED_STATUSES]
    puntaje_promedio = (
        sum(a.accumulated_score for a in scored) / len(scored) if scored else 0.0
    )

    attempt_ids = [a.id for a in attempts]
    by_student = {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(a)

    students = list(User.objects.filter(id__in=student_ids))
    estudiantes = [
        _estudiante_sim_dto(st, by_student.get(st.id, [])) for st in students
    ]
    estudiantes.sort(key=lambda e: e["nombre"])

    return {
        "totalIntentos": len(attempts),
        "intentosCompletados": completados,
        "intentosEnProgreso": en_progreso,
        "intentosSalidaSegura": salida_segura,
        "puntajePromedio": float(puntaje_promedio),
        "decisionesAdecuadas": _count_decisions(attempt_ids, "ADEQUATE"),
        "decisionesRiesgosas": _count_decisions(attempt_ids, "RISKY"),
        "decisionesInadecuadas": _count_decisions(attempt_ids, "INADEQUATE"),
        "bitacorasRegistradas": _count_reflections(attempt_ids),
        "rubricasAplicadas": _count_rubrics(attempt_ids),
        "estudiantes": estudiantes,
    }


def _estudiante_sim_dto(student, attempts):
    completados = sum(1 for a in attempts if a.status == "COMPLETED")
    en_progreso = sum(1 for a in attempts if a.status == "IN_PROGRESS")
    salida_segura = sum(1 for a in attempts if a.status == "SAFE_EXITED")
    scored = [a for a in attempts if a.status in SCORED_STATUSES]
    puntaje = sum(a.accumulated_score for a in scored) / len(scored) if scored else 0.0
    attempt_ids = [a.id for a in attempts]

    if en_progreso > 0:
        estado = "EN_PROGRESO"
    elif completados > 0:
        estado = "COMPLETADO"
    elif salida_segura > 0:
        estado = "SAFE_EXITED"
    else:
        estado = "PENDIENTE"

    return {
        "id": student.id,
        "nombre": _nombre_completo(student),
        "totalIntentos": len(attempts),
        "intentosCompletados": completados,
        "intentosEnProgreso": en_progreso,
        "intentosSalidaSegura": salida_segura,
        "puntajePromedio": float(puntaje),
        "decisionesAdecuadas": _count_decisions(attempt_ids, "ADEQUATE"),
        "decisionesRiesgosas": _count_decisions(attempt_ids, "RISKY"),
        "decisionesInadecuadas": _count_decisions(attempt_ids, "INADEQUATE"),
        "bitacorasRegistradas": _count_reflections(attempt_ids),
        "rubricasAplicadas": _count_rubrics(attempt_ids),
        "estado": estado,
    }


# --- CSV export ------------------------------------------------------------
def exportar_csv(grupo_id, case_version_id):
    reporte = generar_reporte_grupo(grupo_id, case_version_id)
    parts = []
    if reporte["simulacion"] is not None:
        parts.append(
            "Estudiante,Intentos,Completados,En progreso,Salida segura,Puntaje prom.,"
            "Adecuadas,Riesgosas,Inadecuadas,Bitacoras,Rubricas,Estado\n"
        )
        for e in reporte["simulacion"]["estudiantes"]:
            parts.append(
                "{},{},{},{},{},{:.1f},{},{},{},{},{},{}\n".format(
                    e["nombre"],
                    e["totalIntentos"],
                    e["intentosCompletados"],
                    e["intentosEnProgreso"],
                    e["intentosSalidaSegura"],
                    e["puntajePromedio"],
                    e["decisionesAdecuadas"],
                    e["decisionesRiesgosas"],
                    e["decisionesInadecuadas"],
                    e["bitacorasRegistradas"],
                    e["rubricasAplicadas"],
                    e["estado"],
                )
            )
    return "".join(parts)
```

- [ ] **Step 5: Escribir `apps/reportes/views.py`** (sin `casoId`)

```python
"""Reportes endpoints (solo-simulador). Todo el controller es PROFESOR/ADMIN.
El export CSV devuelve bytes crudos (attachment), NO el envoltorio JSON."""
from django.http import HttpResponse
from rest_framework.views import APIView

from shared.permissions import IsProfesorOrAdmin
from shared.response import api_ok

from . import services


def _long(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class DashboardView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request):
        return api_ok(services.get_dashboard())


class ReporteGrupoView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, grupo_id):
        case_version_id = _long(request.query_params.get("caseVersionId"))
        return api_ok(services.generar_reporte_grupo(grupo_id, case_version_id))


class ReporteGrupoExportView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, grupo_id):
        case_version_id = _long(request.query_params.get("caseVersionId"))
        csv = services.exportar_csv(grupo_id, case_version_id)
        response = HttpResponse(csv.encode("utf-8"), content_type="text/csv;charset=UTF-8")
        response["Content-Disposition"] = (
            f'attachment; filename="reporte-grupo-{grupo_id}.csv"'
        )
        return response
```

- [ ] **Step 6: Escribir `apps/reportes/urls.py`**

```python
from django.urls import path

from .views import DashboardView, ReporteGrupoExportView, ReporteGrupoView

# Montado en "api/reportes" (sin slash final) — sub-rutas empiezan con "/".
urlpatterns = [
    path("/dashboard", DashboardView.as_view()),
    path("/grupo/<int:grupo_id>", ReporteGrupoView.as_view()),
    path("/grupo/<int:grupo_id>/export", ReporteGrupoExportView.as_view()),
]
```

- [ ] **Step 7: Re-cablear settings + urls**

En `psychosim/settings/base.py`, dentro de `INSTALLED_APPS`, agregar `"apps.reportes",`
después de `"apps.simulation",` (no quitar nada todavía):
```python
    "apps.simulation",
    "apps.reportes",
    "apps.progression",
```

En `psychosim/urls.py`, cambiar la línea de reportes para que apunte a la app nueva:
```python
    path("api/reportes", include("apps.reportes.urls")),
```
(antes: `include("apps.sesiones.urls_reportes")`).

- [ ] **Step 8: Eliminar los archivos de reporting viejos dentro de `sesiones`**

```bash
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 rm \
  backend_django/apps/sesiones/services_reportes.py \
  backend_django/apps/sesiones/views_reportes.py \
  backend_django/apps/sesiones/urls_reportes.py \
  backend_django/apps/sesiones/tests/test_reportes.py
```

- [ ] **Step 9: Correr los tests del reporting → PASAN**

Run: `./.venv/Scripts/python.exe -m pytest apps/reportes/tests/test_reportes.py -q`
Expected: PASS (todos).

- [ ] **Step 10: Correr la suite completa → verde**

Run: `./.venv/Scripts/python.exe -m pytest -q`
Expected: PASS (sin los 7 tests viejos de reportes; el resto del simulador + quiz intactos). Si algún módulo importa `apps.sesiones.services_reportes`, corregir (no debería: solo `urls.py` lo referenciaba).

- [ ] **Step 11: Commit**

```bash
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 add backend_django/apps/reportes backend_django/apps/sesiones backend_django/psychosim
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 commit -m "refactor(reportes): extract simulation reporting into apps.reportes (sim-only, drop legacy quiz blend)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Backend — borrar apps `casos` + `sesiones`

Con el reporting ya fuera, el quiz legacy queda aislado. Se borra completo. Las tablas
Flyway (`casos`, `escenarios`, `preguntas`, `opciones`, `sesiones_juego`, `respuestas`)
**permanecen** — solo desaparece el Python (modelos `managed=False`).

**Files:**
- Delete: `apps/casos/` (todo), `apps/sesiones/` (todo)
- Modify: `psychosim/settings/base.py` (INSTALLED_APPS), `psychosim/urls.py`

- [ ] **Step 1: Verificar que nada fuera de casos/sesiones los importa**

Run:
```bash
grep -rIn "apps.casos\|apps.sesiones\|from apps\.casos\|from apps\.sesiones" \
  /d/Sua_Files/IdeaProjects/psico_project_v2/backend_django/apps \
  | grep -v "/casos/\|/sesiones/"
```
Expected: sin resultados (ya confirmado: ninguna dependencia cruzada; `apps.reportes` es sim-only).

- [ ] **Step 2: Quitar de INSTALLED_APPS**

En `psychosim/settings/base.py`, eliminar las líneas `"apps.casos",` y `"apps.sesiones",`.
Queda:
```python
    "apps.users",
    "apps.grupos",
    "apps.simulation",
    "apps.reportes",
    "apps.progression",
```

- [ ] **Step 3: Quitar las rutas del root urlconf**

En `psychosim/urls.py`, eliminar las líneas:
```python
    path("api/casos", include("apps.casos.urls")),
    path("api/sesiones", include("apps.sesiones.urls")),
```

- [ ] **Step 4: Borrar las apps**

```bash
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 rm -r \
  backend_django/apps/casos backend_django/apps/sesiones
```

- [ ] **Step 5: Correr la suite completa → verde**

Run: `cd backend_django && ./.venv/Scripts/python.exe -m pytest -q`
Expected: PASS. Desaparecen `test_casos` y `test_sesiones`; el resto verde. Si `pytest` se
queja de migraciones huérfanas, no aplica (settings.test no corre `migrate` sobre managed=False;
si hubiese un check de apps, confirmar que INSTALLED_APPS ya no las lista).

- [ ] **Step 6: Smoke de arranque del server**

Run: `./.venv/Scripts/python.exe manage.py check`
Expected: "System check identified no issues".

- [ ] **Step 7: Commit**

```bash
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 add -A backend_django
git -C /d/Sua_Files/IdeaProjects/psico_project_v2 commit -m "refactor(quiz): remove legacy quiz apps casos + sesiones (tables retained, managed=False)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Frontend — quitar UI del quiz + DTO solo-simulador

**Files:**
- Delete: `src/app/features/casos/caso-list.component.ts`, `src/app/features/casos/caso-form.component.ts`,
  `src/app/core/api/caso.service.ts`, `src/app/core/models/caso.model.ts`
- Modify: `src/app/app.routes.ts`, `src/app/shared/layout/shell.component.ts`,
  `src/app/core/models/sesion.model.ts`, `src/app/core/api/reporte.service.ts`,
  `src/app/features/dashboard/dashboard.component.ts`,
  `src/app/features/reportes/reporte-grupo.component.ts`

- [ ] **Step 1: Confirmar que `caso.service`/`caso.model` solo los usa `features/casos`**

Run:
```bash
grep -rln "caso.service\|caso.model\|CasoService\|CasoRequest" \
  /d/Sua_Files/IdeaProjects/psicologia_proyecto/admin-panel/src/app --include="*.ts" \
  | grep -v "features/casos\|core/api/caso.service\|core/models/caso.model"
```
Expected: sin resultados.

- [ ] **Step 2: Borrar la feature legacy + servicios/modelos del quiz**

```bash
git -C /d/Sua_Files/IdeaProjects/psicologia_proyecto rm \
  admin-panel/src/app/features/casos/caso-list.component.ts \
  admin-panel/src/app/features/casos/caso-form.component.ts \
  admin-panel/src/app/core/api/caso.service.ts \
  admin-panel/src/app/core/models/caso.model.ts
```
(Si `features/casos/` queda vacía, git la elimina sola.)

- [ ] **Step 3: Quitar rutas legacy en `app.routes.ts`**

Eliminar los 3 bloques de rutas legacy (`casos`, `casos/nuevo`, `casos/:id/editar`) y el
redirect `{ path: 'casos', redirectTo: 'portal/casos', pathMatch: 'full' }`.
**CONSERVAR** `casos/:caseVersionId/editor` (editor del simulador) y todo lo de `reportes`.
Tras el cambio, dentro de `children` ya no existen los `path: 'casos'`, `'casos/nuevo'`,
`'casos/:id/editar'`; sí permanece `'casos/:caseVersionId/editor'`.

- [ ] **Step 4: Quitar el item "Casos" del nav**

En `src/app/shared/layout/shell.component.ts`, eliminar del array `navItems` la línea:
```typescript
    { label: 'Casos',      icon: 'account_tree', route: '/portal/casos',                 caption: 'Catálogo y versiones', roles: ['PROFESOR', 'ADMIN'] },
```
(El editor del simulador se alcanza desde el catálogo "Simulador" → tarjeta → editar.)

- [ ] **Step 5: Actualizar tipos en `sesion.model.ts`**

En `Dashboard`: quitar `casosCompletadosHoy` y `ultimasSesiones`; agregar
`simulacionesCompletadasHoy: number;`. En `IntentoReciente`: quitar el campo `origen`.
Borrar las interfaces ahora sin uso `UltimaSesion` y `EstudianteReporte`.
Reemplazar `ReporteGrupo` por la versión sim-only:
```typescript
export interface ReporteGrupo {
  grupoId: number;
  caseVersionId: number | null;
  simulacion: ReporteSimulacionGrupo | null;
}
```
(`ReporteSimulacionGrupo` y `EstudianteSimulacionReporte` se conservan tal cual.)

- [ ] **Step 6: Actualizar `reporte.service.ts`** (sin `casoId`)

```typescript
  getReporteGrupo(grupoId: number, caseVersionId?: number | null) {
    let params = new HttpParams();
    if (caseVersionId != null) params = params.set('caseVersionId', caseVersionId);
    return this.http.get<ApiResponse<ReporteGrupo>>(`${this.API}/grupo/${grupoId}`, { params })
      .pipe(map(r => r.data));
  }

  exportarCsv(grupoId: number, caseVersionId?: number | null) {
    let params = new HttpParams();
    if (caseVersionId != null) params = params.set('caseVersionId', caseVersionId);
    return this.http.get(`${this.API}/grupo/${grupoId}/export`, { params, responseType: 'blob' });
  }
```

- [ ] **Step 7: Actualizar `dashboard.component.ts`** (sim-only)

En `metrics()`, primera métrica: cambiar
`data.simulacionesCompletadas ?? data.casosCompletadosHoy` por `data.simulacionesCompletadas`.
En `rows()`, quitar el fallback legacy: devolver solo desde `intentosRecientes`:
```typescript
  rows() {
    const data = this.dashboard();
    return data?.intentosRecientes?.map(item => ({
      casoTitulo: item.casoTitulo,
      estudiante: item.estudiante,
      puntaje: item.puntaje,
      completado: item.estado === 'COMPLETADO' || item.estado === 'SAFE_EXITED'
    })) ?? [];
  }
```
En el template, cambiar el eyebrow del panel de `Últimas sesiones` a `Intentos recientes`
(línea ~67: `<p class="psy-eyebrow">Intentos recientes</p>`). El panel sigue mostrando
intentos del simulador.

- [ ] **Step 8: Actualizar `reporte-grupo.component.ts`** (sim-only)

- Quitar el `mat-form-field` "ID del caso (legacy)" (`formControlName="casoId"`).
- En el `form`, quitar `casoId: [null as number | null],`.
- Quitar el bloque `<!-- Métricas legacy -->` (`*ngIf="reporte()!.totalSesiones > 0"`) y el
  bloque `<!-- Tabla legacy por estudiante -->` (`*ngIf="reporte()!.estudiantes.length"`).
- Quitar la propiedad `cols = [...]` (solo la usaba la tabla legacy). Conservar `simCols`.
- `hasReportFilter()` → `return this.form.getRawValue().caseVersionId != null;`
- `generar()` y `exportar()` → leer solo `grupoId` y `caseVersionId` del form y llamar
  `getReporteGrupo(grupoId, caseVersionId)` / `exportarCsv(grupoId, caseVersionId)`.

- [ ] **Step 9: jest verde**

Run: `cd admin-panel && npm test -- --watch=false`
Expected: 55 passed (ninguna spec referenciaba estos componentes/servicios; si algún import
roto aparece, corregirlo).

- [ ] **Step 10: build verde**

Run: `cd admin-panel && npm run build`
Expected: build exitoso, sin errores de tipos (TS) por campos eliminados.

- [ ] **Step 11: Smoke (navegador o HTTP)**

Levantar `npm start` (proxy a :8091) + Django runserver 8091. Login admin
(`admin@psychosim.edu.co`/`Admin123!`). Verificar:
- Dashboard carga con métricas de simulación (sin panel/errores legacy).
- "Reportes" carga; generar por `caseVersionId` muestra el bloque simulación; export CSV baja.
- "Simulador" → tarjeta → editar abre el editor (`casos/:id/editor`) — sin regresión.
- El nav ya no muestra "Casos".

- [ ] **Step 12: Commit**

```bash
git -C /d/Sua_Files/IdeaProjects/psicologia_proyecto add -A admin-panel
git -C /d/Sua_Files/IdeaProjects/psicologia_proyecto commit -m "refactor(quiz): remove legacy quiz UI; dashboard/reporte become simulation-only" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Extraer reporting → `apps.reportes` sim-only → Task 1. ✓
- Borrar `casos`/`sesiones`, tablas intactas → Task 2. ✓
- Frontend: borrar `features/casos`, rutas (conservar editor), dashboard/reporte/servicio
  sim-only, nav → Task 3. ✓
- Verificación pytest/jest/build/smoke → Steps de cierre de cada task. ✓
- Reglas de oro (Spring intacto, esquema intacto, flujo estudiante intacto) → no se tocan
  modelos `managed=False` ni Spring; suite verde como gate. ✓

**Consistencia de tipos/contrato:** `simulacionesCompletadasHoy` (backend dashboard) ↔
`Dashboard.simulacionesCompletadasHoy` (frontend) ↔ test `DASHBOARD_KEYS`. `ReporteGrupo`
sim-only ↔ `generar_reporte_grupo` devuelve `{grupoId, caseVersionId, simulacion}`. Firmas
`getReporteGrupo(grupoId, caseVersionId)` / `exportarCsv(grupoId, caseVersionId)` ↔ views que
solo leen `caseVersionId`. ✓

**Sin placeholders:** todos los pasos traen código/comando concreto. ✓

## Notas de integración (post-plan)

- Código en `feat/retire-legacy-quiz` (ambos repos). PRs por web (gh no instalado).
- No se borran tablas. T3.3 (Spring) sigue diferido; T3.1 (ScenarioConfig) = coexistencia.
