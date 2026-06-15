"""Caso PDF — puertas backend-driven con validación de doorKey/requires y
efecto mariposa (flags, métricas y 4 finales).

Corre contra el caso publicado por seed_caso_pdf (SIM-VBG-001 v2.x):
hospital-urgencias ⇄ hospital-sala-escucha → comisaria-recepcion ⇄
comisaria-consultorio, con 6 decisiones canónicas.
"""
import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIClient

from apps.grupos.models import Grupo
from apps.simulation.models import CaseVersion, DecisionOption

User = get_user_model()


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def estudiante(db, case_version_id):
    estudiante = User.objects.create_user(
        email="est_pdf@x.com", password="x", nombre="Est", apellido="Pdf", role="ESTUDIANTE"
    )
    profesor = User.objects.create_user(
        email="prof_pdf@x.com", password="x", nombre="Prof", apellido="Pdf", role="PROFESOR"
    )
    grupo = Grupo.objects.create(nombre="Grupo PDF", codigo="PDF", profesor=profesor)
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            [grupo.id, estudiante.id],
        )
        cur.execute(
            "INSERT INTO grupo_case_version (grupo_id, case_version_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            [grupo.id, case_version_id],
        )
    return estudiante


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id


def _start(client, case_version_id):
    data = client.post(
        "/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json"
    ).data["data"]
    return data["attemptId"], data["attemptToken"]


def _world(client, attempt_id, token):
    return client.get(
        f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}"
    ).data["data"]


def _inspect(client, attempt_id, token, key):
    resp = client.post(
        f"/api/simulation/attempts/{attempt_id}/interactions/{key}",
        {"attemptToken": token}, format="json",
    )
    assert resp.status_code == 200, f"interacción {key}: {resp.data}"
    return resp.data["data"]


def _enter(client, attempt_id, token, target, door_key=None, entry=(160, 452)):
    body = {"attemptToken": token, "targetNodeKey": target,
            "entryX": entry[0], "entryY": entry[1]}
    if door_key:
        body["doorKey"] = door_key
    return client.post(
        f"/api/simulation/attempts/{attempt_id}/enter-room", body, format="json",
    )


def _decide(client, attempt_id, token, option_key, case_version_id):
    option = DecisionOption.objects.get(case_version_id=case_version_id, option_key=option_key)
    resp = client.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": option.id}, format="json",
    )
    assert resp.status_code == 200, f"decisión {option_key}: {resp.data}"
    return resp.data["data"]


# ─── Puertas: validación backend ──────────────────────────────────────────────

def test_door_locked_until_familia_inspected(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    # Sin hablar con la familia: bloqueada (requiresInspected).
    resp = _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha")
    assert resp.status_code == 400
    # Tras la interacción: pasa.
    _inspect(c, attempt_id, token, "familia-crisis")
    resp = _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha")
    assert resp.status_code == 200
    assert resp.data["data"]["map"]["key"] == "hospital-sala-escucha"
    assert resp.data["data"]["player"]["x"] == 160


def test_door_nonexistent_key_404(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    resp = _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-fantasma")
    assert resp.status_code == 404


def test_door_target_mismatch_400(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _inspect(c, attempt_id, token, "familia-crisis")
    # puerta-sala-escucha NO conduce a comisaria-recepcion.
    resp = _enter(c, attempt_id, token, "comisaria-recepcion", "puerta-sala-escucha")
    assert resp.status_code == 400


def test_salida_institucional_locked_by_node(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _inspect(c, attempt_id, token, "familia-crisis")
    assert _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha").status_code == 200
    # En etapa hospitalaria la salida institucional sigue bloqueada (requiresNodes).
    resp = _enter(c, attempt_id, token, "comisaria-recepcion", "salida-institucional")
    assert resp.status_code == 400


def test_door_room_persists_after_reload(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _inspect(c, attempt_id, token, "familia-crisis")
    _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha")
    again = _world(c, attempt_id, token)
    assert again["map"]["key"] == "hospital-sala-escucha"
    # Y la vuelta funciona.
    resp = _enter(c, attempt_id, token, "hospital-urgencias", "puerta-urgencias", entry=(786, 440))
    assert resp.status_code == 200
    assert resp.data["data"]["map"]["key"] == "hospital-urgencias"


def test_entry_coordinates_clamped(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _inspect(c, attempt_id, token, "familia-crisis")
    resp = _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha",
                  entry=(99999, -50))
    assert resp.status_code == 200
    player = resp.data["data"]["player"]
    assert player["x"] == 960
    assert player["y"] == 0


# ─── Efecto mariposa: flags y métricas por decisión ───────────────────────────

def test_decision_hospital_recomendada_aplica_flags(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _world(c, attempt_id, token)  # materializa el world state
    state = _decide(c, attempt_id, token, "h1-pap-contencion", case_version_id)
    assert state["feedback"]["classification"] == "ADEQUATE"
    world = _world(c, attempt_id, token)
    flags = world["flags"]["caseFlags"]
    metrics = world["flags"]["caseMetrics"]
    assert flags["pap_aplicado"] is True
    assert flags["familia_contenida"] is True
    assert metrics["confianza"] > 50
    assert metrics["crisis_emocional"] < 50


def test_decision_hospital_critica_exige_reintento_sin_flags_negativos(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _world(c, attempt_id, token)
    state = _decide(c, attempt_id, token, "h1-interrogar-victima", case_version_id)
    assert state["feedback"]["prohibitedConduct"] is True
    assert state["currentNode"]["key"] == "hospital-urgencias"
    world = _world(c, attempt_id, token)
    flags = world["flags"].get("caseFlags", {})
    metrics = world["flags"].get("caseMetrics", {})
    assert flags.get("interrogatorio_prematuro") is not True
    assert metrics.get("etica_profesional", 50) == 50
    assert metrics.get("riesgo_victima", 50) == 50


def _play_hospital(c, attempt_id, token, case_version_id, h1, h2, h3):
    _world(c, attempt_id, token)
    _decide(c, attempt_id, token, h1, case_version_id)
    _decide(c, attempt_id, token, h2, case_version_id)
    _decide(c, attempt_id, token, h3, case_version_id)


def test_decision_comisaria_recomendada_aplica_flags(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _play_hospital(c, attempt_id, token, case_version_id,
                   "h1-pap-contencion", "h2-459-1257", "h3-integral-psicosocial")
    state = _decide(c, attempt_id, token, "c1-riesgo-proteccion-derechos", case_version_id)
    assert state["feedback"]["institutionalRouteActivated"] is True
    world = _world(c, attempt_id, token)
    flags = world["flags"]["caseFlags"]
    assert flags["riesgo_feminicidio_valorado"] is True
    assert flags["medidas_proteccion_activadas"] is True
    assert flags["asesoria_derechos_realizada"] is True


def test_decision_comisaria_critica_exige_reintento_sin_flags_negativos(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _play_hospital(c, attempt_id, token, case_version_id,
                   "h1-pap-contencion", "h2-459-1257", "h3-integral-psicosocial")
    state = _decide(c, attempt_id, token, "c1-mediacion-perdon", case_version_id)
    assert state["feedback"]["prohibitedConduct"] is True
    assert state["currentNode"]["key"] == "hospital-cierre-bloque"
    world = _world(c, attempt_id, token)
    flags = world["flags"]["caseFlags"]
    metrics = world["flags"]["caseMetrics"]
    assert flags.get("mediacion_agresor_intentada") is not True
    assert metrics["riesgo_victima"] <= 50


# ─── Finales ──────────────────────────────────────────────────────────────────

def _play_full(c, attempt_id, token, case_version_id, keys):
    _world(c, attempt_id, token)
    state = None
    for key in keys:
        state = _decide(c, attempt_id, token, key, case_version_id)
    return state


def test_final_integral(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    state = _play_full(c, attempt_id, token, case_version_id, [
        "h1-pap-contencion", "h2-459-1257", "h3-integral-psicosocial",
        "c1-riesgo-proteccion-derechos", "c2-2126-1098-1257", "c3-integral-derechos",
    ])
    assert state["status"] == "COMPLETED"
    ending = state["completionReport"]["ending"]
    assert ending["key"] == "integral"
    assert ending["severityCounts"]["critical"] == 0
    assert ending["severityCounts"]["recommended"] == 6
    assert ending["caseFlags"]["medidas_proteccion_activadas"] is True


def test_final_critico_con_dos_criticas(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    state = _play_full(c, attempt_id, token, case_version_id, [
        "h1-interrogar-victima", "h1-pap-contencion", "h2-solo-459", "h3-parcial-disonancia",
        "c1-mediacion-perdon", "c1-riesgo-proteccion-derechos", "c2-eje-1448", "c3-parcial-clinica",
    ])
    assert state["status"] == "COMPLETED"
    ending = state["completionReport"]["ending"]
    assert ending["key"] == "critico"
    assert ending["severityCounts"]["critical"] >= 2


def test_final_riesgo_persistente_por_omision(estudiante, case_version_id):
    # Sin críticas, pero sin valorar feminicidio ni activar protección (C1
    # desviada a patrones de infancia + C3 con valoración pero sin medidas).
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    state = _play_full(c, attempt_id, token, case_version_id, [
        "h1-pap-contencion", "h2-459-1257", "h3-integral-psicosocial",
        "c1-patrones-infancia", "c2-2126-1098-1257", "c3-valoracion-dependientes",
    ])
    ending = state["completionReport"]["ending"]
    assert ending["key"] == "riesgo"


def test_final_brechas_con_parciales(estudiante, case_version_id):
    # Protección completa (C1 recomendada) pero parciales acumuladas leves.
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    state = _play_full(c, attempt_id, token, case_version_id, [
        "h1-pap-contencion", "h2-solo-459", "h3-pap-epicee",
        "c1-riesgo-proteccion-derechos", "c2-2126-1098-1257", "c3-integral-derechos",
    ])
    ending = state["completionReport"]["ending"]
    assert ending["key"] == "brechas"


def test_cambiar_sala_no_puntua_ni_avanza(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    _inspect(c, attempt_id, token, "familia-crisis")
    _enter(c, attempt_id, token, "hospital-sala-escucha", "puerta-sala-escucha")
    state = c.get(
        f"/api/simulation/attempts/{attempt_id}?attemptToken={token}"
    ).data["data"]
    assert state["accumulatedScore"] == 0
    assert state["currentNode"]["key"] == "hospital-urgencias"  # el DAG no avanzó
