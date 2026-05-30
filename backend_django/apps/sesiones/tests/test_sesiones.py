import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.casos.models import Caso, Escenario, Opcion, Pregunta

User = get_user_model()


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_s@x.com", password="pass1234", nombre="P", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_s@x.com", password="pass1234", nombre="E", apellido="S", role="ESTUDIANTE"
    )


@pytest.fixture
def otro_estudiante(db):
    return User.objects.create_user(
        email="est_s2@x.com", password="pass1234", nombre="E2", apellido="S", role="ESTUDIANTE"
    )


@pytest.fixture
def caso(profesor):
    caso = Caso.objects.create(titulo="Caso S", created_by=profesor)
    esc = Escenario.objects.create(caso=caso, orden=1, nombre="E1", mapa_key="m1")
    preg = Pregunta.objects.create(escenario=esc, orden=1, enunciado="¿?", puntos_correcta=15)
    correcta = Opcion.objects.create(pregunta=preg, texto="OK", es_correcta=True)
    incorrecta = Opcion.objects.create(pregunta=preg, texto="NO", es_correcta=False)
    return {"caso": caso, "pregunta": preg, "correcta": correcta, "incorrecta": incorrecta}


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_iniciar_201(estudiante, caso):
    resp = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json")
    assert resp.status_code == 201
    assert resp.data["data"]["casoId"] == caso["caso"].id
    assert resp.data["data"]["casoTitulo"] == "Caso S"
    assert resp.data["data"]["puntajeTotal"] == 0
    assert resp.data["data"]["completado"] is False


def test_iniciar_missing_caso_404(estudiante):
    resp = cl(estudiante).post("/api/sesiones", {"casoId": 99999999}, format="json")
    assert resp.status_code == 404


def test_responder_correct_scores(estudiante, caso):
    sid = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json").data["data"]["id"]
    resp = cl(estudiante).post(
        f"/api/sesiones/{sid}/respuesta",
        {"preguntaId": caso["pregunta"].id, "opcionId": caso["correcta"].id, "tiempoMs": 1200},
        format="json",
    )
    assert resp.status_code == 200
    d = resp.data["data"]
    assert d["esCorrecta"] is True
    assert d["puntosObtenidos"] == 15
    assert d["opcionCorrectaId"] == caso["correcta"].id


def test_responder_wrong_zero_points_reveals_correct(estudiante, caso):
    sid = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json").data["data"]["id"]
    resp = cl(estudiante).post(
        f"/api/sesiones/{sid}/respuesta",
        {"preguntaId": caso["pregunta"].id, "opcionId": caso["incorrecta"].id},
        format="json",
    )
    d = resp.data["data"]
    assert d["esCorrecta"] is False
    assert d["puntosObtenidos"] == 0
    assert d["opcionCorrectaId"] == caso["correcta"].id


def test_responder_foreign_session_403(estudiante, otro_estudiante, caso):
    sid = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json").data["data"]["id"]
    resp = cl(otro_estudiante).post(
        f"/api/sesiones/{sid}/respuesta",
        {"preguntaId": caso["pregunta"].id, "opcionId": caso["correcta"].id},
        format="json",
    )
    assert resp.status_code == 403


def test_finalizar_marks_completed(estudiante, caso):
    sid = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json").data["data"]["id"]
    resp = cl(estudiante).put(f"/api/sesiones/{sid}/finalizar")
    assert resp.status_code == 200
    assert resp.data["data"]["completado"] is True
    assert resp.data["data"]["fechaFin"] is not None


def test_mis_sesiones_lists(estudiante, caso):
    sid = cl(estudiante).post("/api/sesiones", {"casoId": caso["caso"].id}, format="json").data["data"]["id"]
    data = cl(estudiante).get("/api/sesiones/mis-sesiones").data["data"]
    assert any(s["id"] == sid for s in data)
