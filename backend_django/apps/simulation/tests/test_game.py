import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIClient

from apps.grupos.models import Grupo
from apps.simulation.models import AttemptEvent, CaseVersion, DecisionOption, ReflectionJournal
from apps.simulation.services import crypto_service

User = get_user_model()


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_sim@x.com", password="pass1234", nombre="Est", apellido="Sim", role="ESTUDIANTE"
    )


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(
        simulation_case__code="SIM-VBG-001", status="PUBLISHED"
    ).id


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def assign_case_to_student(estudiante, case_version_id, codigo="SIM-G"):
    profesor = User.objects.create_user(
        email=f"prof_{codigo.lower()}@x.com",
        password="pass1234",
        nombre="Pro",
        apellido="Sim",
        role="PROFESOR",
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
    return grupo


def test_crypto_roundtrip():
    cipher = crypto_service.encrypt("Texto sensible áéí")
    assert cipher != "Texto sensible áéí"
    assert crypto_service.decrypt(cipher) == "Texto sensible áéí"
    assert crypto_service.key_ref() == "local-aes-gcm-v1"


def test_cases_lists_only_assigned_for_students(estudiante, case_version_id):
    assert cl(estudiante).get("/api/simulation/cases").data["data"] == []
    assign_case_to_student(estudiante, case_version_id)

    resp = cl(estudiante).get("/api/simulation/cases")
    assert resp.status_code == 200
    codes = {c["code"] for c in resp.data["data"]}
    assert "SIM-VBG-001" in codes


def test_start_attempt_requires_group_case_assignment(estudiante, case_version_id):
    resp = cl(estudiante).post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json")
    assert resp.status_code == 403


def test_full_playthrough_reaches_terminal_and_locks_reflection(estudiante, case_version_id):
    assign_case_to_student(estudiante, case_version_id, "SIM-FULL")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json")
    assert start.status_code == 200
    assert start.data["message"] == "Intento iniciado"
    data = start.data["data"]
    token, attempt_id = data["attemptToken"], data["attemptId"]
    assert data["status"] == "IN_PROGRESS"
    assert data["metrics"]["userTrust"] == 50 and data["metrics"]["victimRisk"] == 50

    # Reflection at the start node -> encrypted at rest, unlocked while in progress.
    node_id = data["currentNode"]["id"]
    r = c.post(
        f"/api/simulation/attempts/{attempt_id}/reflections",
        {"attemptToken": token, "nodeId": node_id, "text": "Mi reflexión inicial"},
        format="json",
    )
    assert r.status_code == 200 and r.data["data"]["locked"] is False
    refl = ReflectionJournal.objects.get(attempt_id=attempt_id, node_id=node_id)
    assert refl.encrypted_text != "Mi reflexión inicial"  # stored encrypted
    assert crypto_service.decrypt(refl.encrypted_text) == "Mi reflexión inicial"

    # Walk the DAG (first option each step) until a terminal node.
    state = data
    for _ in range(20):
        if state["status"] != "IN_PROGRESS":
            break
        options = state["currentNode"]["options"]
        assert options, "non-terminal node must offer decisions"
        option = next((o for o in options if o["classification"] == "ADEQUATE"), options[0])
        resp = c.post(
            f"/api/simulation/attempts/{attempt_id}/decisions",
            {"attemptToken": token, "decisionOptionId": option["id"]},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["message"] == "Decision procesada"
        assert resp.data["data"]["feedback"] is not None
        state = resp.data["data"]

    assert state["status"] == "COMPLETED"
    assert state["completionReport"] is not None
    assert state["completionReport"]["status"] == "COMPLETED"

    # Reflection is locked once the attempt ends.
    refl.refresh_from_db()
    assert refl.locked is True

    # Cannot add reflections to a finished attempt.
    blocked = c.post(
        f"/api/simulation/attempts/{attempt_id}/reflections",
        {"attemptToken": token, "nodeId": node_id, "text": "tarde"},
        format="json",
    )
    assert blocked.status_code == 400

    report = c.get(f"/api/simulation/attempts/{attempt_id}/completion-report?attemptToken={token}")
    assert report.status_code == 200
    assert report.data["data"]["status"] == "COMPLETED"


def test_inadequate_decision_requires_retry_without_advancing(estudiante, case_version_id):
    assign_case_to_student(estudiante, case_version_id, "SIM-RETRY")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    attempt_id, token = start["attemptId"], start["attemptToken"]
    node_id = start["currentNode"]["id"]
    node_key = start["currentNode"]["key"]
    initial_score = start["accumulatedScore"]
    initial_stress = start["stressIndex"]

    wrong = DecisionOption.objects.filter(
        source_node_id=node_id,
        classification="INADEQUATE",
    ).first()
    assert wrong is not None

    retry = c.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": wrong.id},
        format="json",
    )
    assert retry.status_code == 200
    retry_state = retry.data["data"]
    assert retry_state["status"] == "IN_PROGRESS"
    assert retry_state["currentNode"]["key"] == node_key
    assert retry_state["accumulatedScore"] == initial_score
    assert retry_state["stressIndex"] == initial_stress
    assert "volver a responder" in retry_state["feedback"]["message"]
    assert AttemptEvent.objects.filter(
        attempt_id=attempt_id,
        event_type="PROHIBITED_DECISION_RETRY_REQUIRED",
        decision_option_id=wrong.id,
    ).exists()

    correct = DecisionOption.objects.filter(
        source_node_id=node_id,
        classification="ADEQUATE",
    ).first()
    assert correct is not None
    advanced = c.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": correct.id},
        format="json",
    )
    assert advanced.status_code == 200
    assert advanced.data["data"]["currentNode"]["key"] != node_key


def test_wrong_token_404(estudiante, case_version_id):
    assign_case_to_student(estudiante, case_version_id, "SIM-WRONG")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    resp = c.get(f"/api/simulation/attempts/{start['attemptId']}?attemptToken=bogus-token")
    assert resp.status_code == 404


def test_safe_exit_returns_resources(estudiante, case_version_id):
    assign_case_to_student(estudiante, case_version_id, "SIM-SAFE")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    resp = c.post(
        f"/api/simulation/attempts/{start['attemptId']}/safe-exit",
        {"attemptToken": start["attemptToken"], "reason": "Necesito una pausa"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Salida segura registrada"
    assert resp.data["data"]["status"] == "SAFE_EXITED"
    assert len(resp.data["data"]["supportResources"]) == 3


def test_completion_report_includes_timeline(estudiante, case_version_id):
    assign_case_to_student(estudiante, case_version_id, "SIM-REPORT")
    c = cl(estudiante)
    attempt = c.post("/api/simulation/attempts",
                     {"caseVersionId": case_version_id, "forceNew": True}, format="json").data["data"]
    attempt_id, token = attempt["attemptId"], attempt["attemptToken"]
    option_id = next(
        o for o in attempt["currentNode"]["options"] if o["classification"] == "ADEQUATE"
    )["id"]
    c.post(f"/api/simulation/attempts/{attempt_id}/decisions",
           {"attemptToken": token, "decisionOptionId": option_id}, format="json")
    c.post(f"/api/simulation/attempts/{attempt_id}/safe-exit",
           {"attemptToken": token, "reason": "test"}, format="json")

    report = c.get(
        f"/api/simulation/attempts/{attempt_id}/completion-report?attemptToken={token}"
    ).data["data"]

    assert "timeline" in report
    decisions = [t for t in report["timeline"]
                 if t["type"] in ("DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED")]
    assert decisions, "la decisión elegida debe aparecer en la línea de tiempo"
    entry = decisions[0]
    assert entry["label"]
    assert entry["classification"] in ("ADEQUATE", "RISKY", "INADEQUATE")
    assert entry["time"].count(":") == 1          # mm:ss
    assert isinstance(entry["scoreDelta"], int)
    assert isinstance(entry["stressDelta"], int)
    assert report["totalDurationSeconds"] is None or report["totalDurationSeconds"] >= 0
