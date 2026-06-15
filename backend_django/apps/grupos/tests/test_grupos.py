import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion

User = get_user_model()


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_g@x.com", password="pass1234", nombre="P", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def otro_profesor(db):
    return User.objects.create_user(
        email="prof_g2@x.com", password="pass1234", nombre="P2", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_g@x.com", password="pass1234", nombre="E", apellido="S", role="ESTUDIANTE"
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_g@x.com", password="pass1234", nombre="A", apellido="D", role="ADMIN"
    )


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_list_forbidden_for_estudiante(estudiante):
    assert cl(estudiante).get("/api/grupos").status_code == 403


def test_list_forbidden_for_admin(admin):
    assert cl(admin).get("/api/grupos").status_code == 403


def test_create_forbidden_for_admin(admin):
    resp = cl(admin).post("/api/grupos", {"nombre": "Admin", "codigo": "ADM1"}, format="json")
    assert resp.status_code == 403


def test_create_grupo_201(profesor):
    resp = cl(profesor).post("/api/grupos", {"nombre": "G1", "codigo": "ABC123"}, format="json")
    assert resp.status_code == 201
    assert resp.data["message"] == "Grupo creado"
    assert resp.data["data"] == {
        "id": resp.data["data"]["id"], "nombre": "G1", "codigo": "ABC123", "totalEstudiantes": 0
    }


def test_create_duplicate_codigo_400(profesor):
    cl(profesor).post("/api/grupos", {"nombre": "G1", "codigo": "DUP1"}, format="json")
    resp = cl(profesor).post("/api/grupos", {"nombre": "G2", "codigo": "DUP1"}, format="json")
    assert resp.status_code == 400
    assert resp.data["message"] == "Ya existe un grupo con el código: DUP1"


def test_add_student_increments_total(profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "ADD1"}, format="json").data["data"]
    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Estudiante agregado"
    assert resp.data["data"]["totalEstudiantes"] == 1


def test_list_students_in_group(profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "LIST1"}, format="json").data["data"]
    cl(profesor).post(f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json")

    resp = cl(profesor).get(f"/api/grupos/{grupo['id']}/estudiantes")

    assert resp.status_code == 200
    assert resp.data["data"] == [{
        "id": estudiante.id,
        "nombre": estudiante.nombre,
        "apellido": estudiante.apellido,
        "email": estudiante.email,
        "role": "ESTUDIANTE",
        "activo": True,
    }]


def test_assign_case_to_group(profesor):
    case_version_id = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "CASE1"}, format="json").data["data"]

    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/casos",
        {"caseVersionId": case_version_id},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["message"] == "Caso asignado"
    assert resp.data["data"][0]["caseVersionId"] == case_version_id


def test_assign_case_to_foreign_group_400(profesor, otro_profesor):
    case_version_id = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "CASE2"}, format="json").data["data"]

    resp = cl(otro_profesor).post(
        f"/api/grupos/{grupo['id']}/casos",
        {"caseVersionId": case_version_id},
        format="json",
    )

    assert resp.status_code == 400
    assert resp.data["message"] == "No tiene permiso sobre este grupo"


def test_add_student_to_foreign_group_400(profesor, otro_profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "FOR1"}, format="json").data["data"]
    resp = cl(otro_profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "No tiene permiso sobre este grupo"


def test_add_non_student_400(profesor, otro_profesor):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "NS1"}, format="json").data["data"]
    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": otro_profesor.email}, format="json"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "El usuario no tiene rol de estudiante"


def test_add_student_missing_group_404(profesor, estudiante):
    resp = cl(profesor).post(
        "/api/grupos/99999999/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 404


def test_list_only_own_groups(profesor, otro_profesor):
    cl(profesor).post("/api/grupos", {"nombre": "Mio", "codigo": "OWN1"}, format="json")
    cl(otro_profesor).post("/api/grupos", {"nombre": "Suyo", "codigo": "OTH1"}, format="json")
    data = cl(profesor).get("/api/grupos").data["data"]
    codigos = {g["codigo"] for g in data}
    assert "OWN1" in codigos
    assert "OTH1" not in codigos
