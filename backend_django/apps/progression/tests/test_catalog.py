import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.progression.models import StudentCaseCompletion
from apps.simulation.models import CaseVersion, SimulationCase

User = get_user_model()


def _cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_cat@x.com", password="x", nombre="Ad", apellido="Cat", role="ADMIN"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_cat@x.com", password="x", nombre="Est", apellido="Cat", role="ESTUDIANTE"
    )


@pytest.fixture
def second_case(db, admin):
    """A second PUBLISHED case so progression/unlock is testable (only SIM-VBG-001 is seeded)."""
    case = SimulationCase.objects.create(
        code="SIM-CAT-TEST-002", title="Caso de prueba 2", description="stub",
        active=True, created_by=admin,
    )
    return CaseVersion.objects.create(
        simulation_case=case, semantic_version="1.0.0", status="PUBLISHED",
        created_by=admin, published_at=timezone.now(),
    )


def test_student_sees_first_unlocked_rest_locked(estudiante, second_case):
    data = _cl(estudiante).get("/api/simulation/catalog").data["data"]
    assert len(data) >= 2
    assert data[0]["unlocked"] is True and data[0]["order"] == 0
    last = data[-1]
    assert last["caseVersionId"] == second_case.id
    assert last["unlocked"] is False and last["locked"] is True
    for key in ("caseVersionId", "code", "title", "description", "order", "unlocked", "completed", "locked"):
        assert key in data[0]


def test_completing_first_unlocks_second(estudiante, second_case):
    first = _cl(estudiante).get("/api/simulation/catalog").data["data"][0]
    first_case_id = CaseVersion.objects.get(pk=first["caseVersionId"]).simulation_case_id
    StudentCaseCompletion.objects.create(
        student_id=estudiante.id, simulation_case_id=first_case_id,
        first_completed_at=timezone.now(),
    )
    data = _cl(estudiante).get("/api/simulation/catalog").data["data"]
    assert data[0]["completed"] is True
    assert data[1]["unlocked"] is True


def test_staff_sees_everything_unlocked(admin, second_case):
    data = _cl(admin).get("/api/simulation/catalog").data["data"]
    assert all(item["unlocked"] for item in data)
    assert all(not item["locked"] for item in data)
