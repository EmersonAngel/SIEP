import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.casos.models import Caso

User = get_user_model()


# --- T5: model ---------------------------------------------------------------
def test_caso_str():
    assert str(Caso(titulo="Caso X")) == "Caso X"


# --- fixtures ----------------------------------------------------------------
@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_casos@x.com", password="pass1234", nombre="Pro", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def otro_profesor(db):
    return User.objects.create_user(
        email="prof2_casos@x.com", password="pass1234", nombre="Otro", apellido="P", role="PROFESOR"
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_casos@x.com", password="pass1234", nombre="Adm", apellido="N", role="ADMIN"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_casos@x.com", password="pass1234", nombre="Est", apellido="U", role="ESTUDIANTE"
    )


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


PAYLOAD = {
    "titulo": "Caso Demo",
    "descripcion": "Una descripción",
    "contextoNarrativo": "Contexto",
    "escenarios": [
        {
            "orden": 1,
            "nombre": "Escena 1",
            "contexto": "ctx",
            "mapaKey": "mapa-1",
            "preguntas": [
                {
                    "orden": 1,
                    "enunciado": "¿Qué harías?",
                    "puntosCorrecta": 20,
                    "opciones": [
                        {"texto": "Opción A", "esCorrecta": True, "feedbackTexto": "bien", "normativaRef": "L1"},
                        {"texto": "Opción B", "esCorrecta": False},
                    ],
                }
            ],
        }
    ],
}


# --- T6: API -----------------------------------------------------------------
def test_list_requires_auth():
    resp = APIClient().get("/api/casos")
    assert resp.status_code == 401


def test_list_returns_envelope_list(profesor):
    resp = client_for(profesor).get("/api/casos")
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert isinstance(resp.data["data"], list)


def test_create_forbidden_for_estudiante(estudiante):
    resp = client_for(estudiante).post("/api/casos", PAYLOAD, format="json")
    assert resp.status_code == 403
    assert resp.data["message"] == "No tiene permisos para realizar esta acción"


def test_create_caso_returns_201_and_resumen(profesor):
    resp = client_for(profesor).post("/api/casos", PAYLOAD, format="json")
    assert resp.status_code == 201
    assert resp.data["message"] == "Caso creado"
    data = resp.data["data"]
    assert data["titulo"] == "Caso Demo"
    assert data["activo"] is True
    assert data["escenarios"] is None  # resumen omits nested


def test_detail_hides_answer_key_and_shows_structure(profesor):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    resp = client_for(profesor).get(f"/api/casos/{created['id']}")
    assert resp.status_code == 200
    detalle = resp.data["data"]
    assert len(detalle["escenarios"]) == 1
    esc = detalle["escenarios"][0]
    assert esc["mapaKey"] == "mapa-1"
    preg = esc["preguntas"][0]
    assert preg["puntosCorrecta"] == 20
    opciones = preg["opciones"]
    assert len(opciones) == 2
    # CRITICAL: only id + texto leave the server (answer key hidden)
    for op in opciones:
        assert set(op.keys()) == {"id", "texto"}


def test_detail_404_message(profesor):
    resp = client_for(profesor).get("/api/casos/99999999")
    assert resp.status_code == 404
    assert resp.data["message"] == "Caso no encontrado: 99999999"


def test_update_by_creator_ok(profesor):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    upd = dict(PAYLOAD, titulo="Caso Editado", escenarios=[])
    resp = client_for(profesor).put(f"/api/casos/{created['id']}", upd, format="json")
    assert resp.status_code == 200
    assert resp.data["message"] == "Caso actualizado"
    assert resp.data["data"]["titulo"] == "Caso Editado"
    # nested replaced (now empty)
    detalle = client_for(profesor).get(f"/api/casos/{created['id']}").data["data"]
    assert detalle["escenarios"] == []


def test_update_by_other_profesor_forbidden(profesor, otro_profesor):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    resp = client_for(otro_profesor).put(
        f"/api/casos/{created['id']}", dict(PAYLOAD, titulo="Hack"), format="json"
    )
    assert resp.status_code == 403


def test_update_by_admin_allowed(profesor, admin):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    resp = client_for(admin).put(
        f"/api/casos/{created['id']}", dict(PAYLOAD, titulo="Admin Edit"), format="json"
    )
    assert resp.status_code == 200


def test_delete_requires_admin(profesor):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    resp = client_for(profesor).delete(f"/api/casos/{created['id']}")
    assert resp.status_code == 403


def test_delete_soft_deletes(profesor, admin):
    created = client_for(profesor).post("/api/casos", PAYLOAD, format="json").data["data"]
    resp = client_for(admin).delete(f"/api/casos/{created['id']}")
    assert resp.status_code == 200
    assert resp.data["message"] == "Caso eliminado"
    # now inactive -> detail 404
    assert client_for(profesor).get(f"/api/casos/{created['id']}").status_code == 404
