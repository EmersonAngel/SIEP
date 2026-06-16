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


def _assign_case(grupo, case_version_id):
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_case_version (grupo_id, case_version_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            [grupo.id, case_version_id],
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
    _assign_case(grupo, case_version_id)
    c = cl(estudiante)
    start = c.post(
        "/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json"
    ).data["data"]
    token, attempt_id = start["attemptToken"], start["attemptId"]
    options = start["currentNode"]["options"]
    option = next((o for o in options if o["classification"] == "ADEQUATE"), options[0])
    c.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": option["id"]},
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
    _assign_case(grupo, case_version_id)
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
