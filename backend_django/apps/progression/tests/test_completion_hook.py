import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIClient

from apps.grupos.models import Grupo
from apps.progression.models import StudentCaseCompletion
from apps.simulation.models import CaseVersion

User = get_user_model()


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_prog@x.com", password="x", nombre="Est", apellido="Prog", role="ESTUDIANTE"
    )


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id


def _cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _assign_case(estudiante, case_version_id, codigo):
    profesor = User.objects.create_user(
        email=f"prof_{codigo}@x.com", password="x", nombre="Pro", apellido="Prog", role="PROFESOR",
    )
    grupo = Grupo.objects.create(nombre=f"Grupo {codigo}", codigo=codigo, profesor=profesor)
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            [grupo.id, estudiante.id],
        )
        cur.execute(
            "INSERT INTO grupo_case_version (grupo_id, case_version_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            [grupo.id, case_version_id],
        )


def test_completing_case_records_completion(estudiante, case_version_id):
    _assign_case(estudiante, case_version_id, "prog-complete")
    c = _cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    token, attempt_id = start["attemptToken"], start["attemptId"]
    state = start
    for _ in range(25):
        if state["status"] != "IN_PROGRESS":
            break
        options = state["currentNode"]["options"]
        assert options
        option = next((o for o in options if o["classification"] == "ADEQUATE"), options[0])
        state = c.post(
            f"/api/simulation/attempts/{attempt_id}/decisions",
            {"attemptToken": token, "decisionOptionId": option["id"]},
            format="json",
        ).data["data"]
    assert state["status"] == "COMPLETED"
    case_id = CaseVersion.objects.get(pk=case_version_id).simulation_case_id
    assert StudentCaseCompletion.objects.filter(
        student_id=estudiante.id, simulation_case_id=case_id
    ).count() == 1


def test_safe_exit_does_not_record_completion(estudiante, case_version_id):
    _assign_case(estudiante, case_version_id, "prog-safe")
    c = _cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    c.post(
        f"/api/simulation/attempts/{start['attemptId']}/safe-exit",
        {"attemptToken": start["attemptToken"], "reason": "pausa"},
        format="json",
    )
    case_id = CaseVersion.objects.get(pk=case_version_id).simulation_case_id
    assert not StudentCaseCompletion.objects.filter(
        student_id=estudiante.id, simulation_case_id=case_id
    ).exists()
