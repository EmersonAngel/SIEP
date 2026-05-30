import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion, ReflectionJournal
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


def test_crypto_roundtrip():
    cipher = crypto_service.encrypt("Texto sensible áéí")
    assert cipher != "Texto sensible áéí"
    assert crypto_service.decrypt(cipher) == "Texto sensible áéí"
    assert crypto_service.key_ref() == "local-aes-gcm-v1"


def test_cases_lists_published(estudiante, case_version_id):
    resp = cl(estudiante).get("/api/simulation/cases")
    assert resp.status_code == 200
    codes = {c["code"] for c in resp.data["data"]}
    assert "SIM-VBG-001" in codes


def test_full_playthrough_reaches_terminal_and_locks_reflection(estudiante, case_version_id):
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
        resp = c.post(
            f"/api/simulation/attempts/{attempt_id}/decisions",
            {"attemptToken": token, "decisionOptionId": options[0]["id"]},
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


def test_wrong_token_404(estudiante, case_version_id):
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    resp = c.get(f"/api/simulation/attempts/{start['attemptId']}?attemptToken=bogus-token")
    assert resp.status_code == 404


def test_safe_exit_returns_resources(estudiante, case_version_id):
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
