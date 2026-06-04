"""T14 — Authoring (/api/admin/cases). Contract-faithful to Spring
SimulationAuthoringController + SimulationAuthoringService + WorldValidationService.

All endpoints are ADMIN-only. Runs against the real psychosim DB (rolled back per
test). Uses the seeded PUBLISHED SIM-VBG-001 as the source case version; the
clone-version flow produces an editable DRAFT to exercise mutations/publish.

Per the maintainer's decision, business-rule rejections use semantic HTTP codes:
ensureDraft / publish guards -> 400; saveWorld revision conflict -> 409.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion

User = get_user_model()
BASE = "/api/admin/cases"

NODE_KEYS = [
    "id", "key", "title", "narrative", "supportResources", "requiredTools",
    "sensitiveContent", "safeExitRequired", "warningMessage", "terminal",
    "startNode", "positionX", "positionY",
]


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_auth@x.com", password="x", nombre="Ad", apellido="Min", role="ADMIN"
    )


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_auth@x.com", password="x", nombre="Pr", apellido="Of", role="PROFESOR"
    )


@pytest.fixture
def published_cv(db):
    return CaseVersion.objects.get(
        simulation_case__code="SIM-VBG-001", status="PUBLISHED"
    ).id


# --- permissions / editor --------------------------------------------------
def test_editor_forbidden_for_profesor(profesor, published_cv):
    assert cl(profesor).get(f"{BASE}/{published_cv}/editor").status_code == 403


def test_editor_missing_version_404(admin):
    assert cl(admin).get(f"{BASE}/99999999/editor").status_code == 404


def test_editor_returns_view(admin, published_cv):
    resp = cl(admin).get(f"{BASE}/{published_cv}/editor")
    assert resp.status_code == 200
    data = resp.data["data"]
    assert data["caseVersionId"] == published_cv
    assert data["status"] == "PUBLISHED"
    assert len(data["nodes"]) >= 1
    for key in ("decisions", "maps", "objects", "tools", "rubrics"):
        assert key in data
    assert isinstance(data["checklistCompletion"], int)
    assert isinstance(data["publishable"], bool)
    node = data["nodes"][0]
    for key in NODE_KEYS:
        assert key in node, f"node missing {key}"
    edge = data["decisions"][0]
    for key in ("id", "optionKey", "sourceNodeId", "sourceKey", "targetNodeId",
                "targetKey", "classification", "prohibitedConduct", "scoreDelta"):
        assert key in edge


# --- ensureDraft guard -----------------------------------------------------
def test_mutation_on_published_400(admin, published_cv):
    resp = cl(admin).post(
        f"{BASE}/{published_cv}/nodes",
        {"nodeKey": "x", "title": "t", "narrative": "n"},
        format="json",
    )
    assert resp.status_code == 400
    assert "DRAFT" in resp.data["message"]


# --- world editor / validation ---------------------------------------------
def test_validate_world(admin, published_cv):
    resp = cl(admin).post(f"{BASE}/{published_cv}/world/validate")
    assert resp.status_code == 200
    data = resp.data["data"]
    assert "errors" in data and "warnings" in data and "canPublish" in data
    assert isinstance(data["errors"], list)


def test_world_editor(admin, published_cv):
    resp = cl(admin).get(f"{BASE}/{published_cv}/world-editor")
    assert resp.status_code == 200
    data = resp.data["data"]
    assert data["schemaVersion"] == 2
    assert data["caseVersionId"] == published_cv
    assert "revision" in data
    assert data["map"] is not None
    assert "objects" in data and "validation" in data
    assert "configured" in data["safeExit"]


def test_world_preview_matches_editor(admin, published_cv):
    resp = cl(admin).get(f"{BASE}/{published_cv}/world-preview")
    assert resp.status_code == 200
    assert resp.data["data"]["schemaVersion"] == 2


# --- clone + draft mutations -----------------------------------------------
def test_clone_and_create_node(admin, published_cv):
    a = cl(admin)
    source_nodes = len(a.get(f"{BASE}/{published_cv}/editor").data["data"]["nodes"])

    clone = a.post(f"{BASE}/{published_cv}/clone-version")
    assert clone.status_code == 200
    assert clone.data["message"] == "Version clonada"
    cd = clone.data["data"]
    assert cd["status"] == "DRAFT"
    clone_id = cd["caseVersionId"]
    assert clone_id != published_cv
    assert cd["checklistCompletion"] == 0
    assert len(cd["nodes"]) == source_nodes

    created = a.post(
        f"{BASE}/{clone_id}/nodes",
        {"nodeKey": "extra", "title": "Extra", "narrative": "N",
         "requiredTools": [], "supportResources": []},
        format="json",
    )
    assert created.status_code == 200
    assert created.data["message"] == "Nodo creado"
    assert len(created.data["data"]["nodes"]) == source_nodes + 1


def test_world_save_optimistic_lock(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    rev, node_id = we["revision"], we["nodeId"]

    bad = a.put(
        f"{BASE}/{clone_id}/world?nodeId={node_id}",
        {"revision": (rev or 0) + 999},
        format="json",
    )
    assert bad.status_code == 409

    ok = a.put(
        f"{BASE}/{clone_id}/world?nodeId={node_id}",
        {"revision": rev},
        format="json",
    )
    assert ok.status_code == 200
    assert ok.data["message"] == "Mundo guardado"
    assert ok.data["data"]["schemaVersion"] == 2


# --- checklist + publish gates ---------------------------------------------
def test_publish_blocked_without_checklist(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    pub = a.post(f"{BASE}/{clone_id}/publish")
    assert pub.status_code == 400
    assert pub.data["message"] == "El checklist ético y académico debe estar al 100% antes de publicar."


def test_checklist_partial_ratio(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    chk = a.put(
        f"{BASE}/{clone_id}/checklist",
        {"contentOriginal": True, "ethicsReviewed": True, "safetyProtocols": True,
         "noStigmatizing": False, "triggerWarnings": False, "accessibilityOk": False},
        format="json",
    )
    assert chk.status_code == 200
    assert chk.data["data"]["checklistCompletion"] == 50
    assert chk.data["data"]["publishable"] is False


def test_checklist_full_then_publish(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    chk = a.put(
        f"{BASE}/{clone_id}/checklist",
        {"contentOriginal": True, "ethicsReviewed": True, "safetyProtocols": True,
         "noStigmatizing": True, "triggerWarnings": True, "accessibilityOk": True},
        format="json",
    )
    assert chk.data["message"] == "Checklist actualizado"
    assert chk.data["data"]["checklistCompletion"] == 100
    assert chk.data["data"]["publishable"] is True

    val = a.post(f"{BASE}/{clone_id}/world/validate").data["data"]
    pub = a.post(f"{BASE}/{clone_id}/publish")
    if val["canPublish"]:
        assert pub.status_code == 200
        assert pub.data["message"] == "Caso publicado"
        assert pub.data["data"]["status"] == "PUBLISHED"
    else:
        assert pub.status_code == 400
        assert pub.data["message"].startswith(
            "El caso no puede publicarse con errores de validación"
        )


# --- Fase 1: dialogue authoring (save_world persists trees/lines/choices) ---
def test_world_save_persists_dialogue_with_choices(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    rev, node_id = we["revision"], we["nodeId"]
    obj_key = we["objects"][0]["key"]
    decision_id = a.get(f"{BASE}/{clone_id}/editor").data["data"]["decisions"][0]["id"]

    body = {
        "revision": rev,
        "map": we["map"],
        "objects": we["objects"],
        "collisionZones": we["collisionZones"],
        "clinicalTools": we["clinicalTools"],
        "dialogues": [{
            "id": None, "key": "dlg-test", "speakerName": "Consultante",
            "portraitKey": None, "emotion": "ansiedad",
            "mapObjectId": None, "mapObjectKey": obj_key,
            "lines": [{"order": 0, "speakerName": "Consultante",
                       "text": "Tengo miedo.", "emotion": "ansiedad"}],
            "choices": [{"key": "c1", "text": "Estás a salvo aquí.",
                         "decisionOptionId": decision_id, "requiredToolCode": None,
                         "effect": {}, "displayOrder": 0}],
        }],
    }
    resp = a.put(f"{BASE}/{clone_id}/world?nodeId={node_id}", body, format="json")
    assert resp.status_code == 200

    reloaded = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    tree = next(t for t in reloaded["dialogues"] if t["key"] == "dlg-test")
    assert len(tree["lines"]) == 1 and tree["lines"][0]["text"] == "Tengo miedo."
    assert len(tree["choices"]) == 1
    assert tree["choices"][0]["decisionOptionId"] == decision_id


def test_world_save_removes_absent_dialogues(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    we = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    obj_key = we["objects"][0]["key"]
    base = {"map": we["map"], "objects": we["objects"],
            "collisionZones": we["collisionZones"], "clinicalTools": we["clinicalTools"]}

    a.put(f"{BASE}/{clone_id}/world?nodeId={we['nodeId']}",
          {**base, "revision": we["revision"], "dialogues": [{
              "id": None, "key": "tmp", "speakerName": "X", "portraitKey": None,
              "emotion": "neutral", "mapObjectId": None, "mapObjectKey": obj_key,
              "lines": [], "choices": []}]}, format="json")
    we2 = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    assert any(t["key"] == "tmp" for t in we2["dialogues"])

    a.put(f"{BASE}/{clone_id}/world?nodeId={we2['nodeId']}",
          {**base, "revision": we2["revision"], "dialogues": []}, format="json")
    we3 = a.get(f"{BASE}/{clone_id}/world-editor").data["data"]
    assert all(t["key"] != "tmp" for t in we3["dialogues"])


def test_world_editor_exposes_available_decisions(admin, published_cv):
    we = cl(admin).get(f"{BASE}/{published_cv}/world-editor").data["data"]
    assert "availableDecisions" in we
    for d in we["availableDecisions"]:
        for k in ("id", "optionKey", "text", "classification", "targetNodeKey", "prohibitedConduct"):
            assert k in d, f"availableDecisions missing {k}"
