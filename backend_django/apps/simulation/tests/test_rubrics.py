import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion, Rubric, SimulationRubricAssignment
from apps.simulation.services.rubric_service import seed_default_rubric

User = get_user_model()


def cl(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_rubric@x.com", password="x", nombre="A", apellido="R", role="ADMIN"
    )


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_rubric@x.com", password="x", nombre="P", apellido="R", role="PROFESOR"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_rubric@x.com", password="x", nombre="E", apellido="R", role="ESTUDIANTE"
    )


def _rubric_payload(name="Rubrica prueba"):
    return {
        "name": name,
        "description": "Descripcion",
        "version": "1.0",
        "active": False,
        "criteria": [
            {"title": "Uno", "description": "A", "weight": 50, "displayOrder": 1, "active": True},
            {"title": "Dos", "description": "B", "weight": 50, "displayOrder": 2, "active": True},
        ],
    }


def test_student_cannot_manage_rubrics(estudiante):
    assert cl(estudiante).get("/api/rubrics/").status_code == 403


def test_create_edit_activate_and_default_rubric(admin):
    client = cl(admin)
    created = client.post("/api/rubrics/", _rubric_payload(), format="json")
    assert created.status_code == 201
    rubric_id = created.data["data"]["id"]

    edited = client.put(
        f"/api/rubrics/{rubric_id}",
        {**_rubric_payload("Rubrica editada"), "active": True},
        format="json",
    )
    assert edited.status_code == 200
    assert edited.data["data"]["totalWeight"] == 100.0

    default = client.post(f"/api/rubrics/{rubric_id}/default", {}, format="json")
    assert default.status_code == 200
    assert default.data["data"]["isDefault"] is True
    assert Rubric.objects.filter(is_default=True, active=True).count() == 1


def test_activate_rejects_weights_that_do_not_sum_100(admin):
    payload = _rubric_payload("Rubrica incompleta")
    payload["criteria"][0]["weight"] = 30
    resp = cl(admin).post("/api/rubrics/", payload, format="json")
    assert resp.status_code == 201
    rubric_id = resp.data["data"]["id"]

    activated = cl(admin).post(f"/api/rubrics/{rubric_id}/activate", {}, format="json")
    assert activated.status_code == 400
    assert "100" in activated.data["message"]


def test_seed_default_rubric_is_idempotent_and_assigns_published_case(admin):
    first = seed_default_rubric(admin)
    second = seed_default_rubric(admin)
    assert first["id"] == second["id"]
    assert second["name"] == "Rúbrica básica de desempeño SIEP"
    assert second["totalWeight"] == 100.0
    case_version = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED")
    assert SimulationRubricAssignment.objects.filter(case_version=case_version, rubric_id=second["id"], active=True).exists()


def test_assign_rubric_to_case_version(profesor):
    rubric = cl(profesor).post("/api/rubrics/", _rubric_payload("Rubrica asignable"), format="json").data["data"]
    cl(profesor).post(f"/api/rubrics/{rubric['id']}/activate", {}, format="json")
    case_version = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED")

    resp = cl(profesor).put(
        f"/api/rubrics/case-versions/{case_version.id}",
        {"rubricId": rubric["id"]},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["data"]["caseVersionId"] == case_version.id
    assert resp.data["data"]["rubric"]["id"] == rubric["id"]
