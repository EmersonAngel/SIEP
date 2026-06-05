"""T15b — Explorable world (/api/simulation/.../world|world-state|interactions|tools).
Contract-faithful to Spring SimulationGameController + SimulationWorldService.
Runs against the seeded SIM-VBG-001 (every node has a scene map)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion

User = get_user_model()


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_world@x.com", password="x", nombre="Est", apellido="World", role="ESTUDIANTE"
    )


@pytest.fixture
def otro_estudiante(db):
    return User.objects.create_user(
        email="est_world2@x.com", password="x", nombre="Otro", apellido="Est", role="ESTUDIANTE"
    )


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_world@x.com", password="x", nombre="Pro", apellido="World", role="PROFESOR"
    )


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id


def _start(client, case_version_id):
    data = client.post(
        "/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json"
    ).data["data"]
    return data["attemptId"], data["attemptToken"]


def test_get_world_returns_scene(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    resp = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}")
    assert resp.status_code == 200
    world = resp.data["data"]
    assert world["attemptId"] == attempt_id
    assert world["status"] == "IN_PROGRESS"
    assert world["map"]["id"] is not None
    assert world["player"]["x"] == world["map"]["spawnX"]
    assert isinstance(world["objects"], list)
    assert len(world["tools"]) >= 1
    obj = world["objects"][0]
    for key in ("key", "label", "type", "x", "y", "color", "shortCode", "collision",
                "dialogue", "movementPattern", "facing", "metadata"):
        assert key in obj


def test_update_world_state_clamps_and_records(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    resp = c.patch(
        f"/api/simulation/attempts/{attempt_id}/world-state",
        {"attemptToken": token, "playerX": 5000, "playerY": 200, "currentMapKey": "x"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Estado de mundo actualizado"
    assert resp.data["data"]["player"]["x"] == 960  # clamped to map max
    assert resp.data["data"]["player"]["y"] == 200


def test_interaction_marks_inspected(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    world = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}").data["data"]
    key = world["objects"][0]["key"]
    resp = c.post(
        f"/api/simulation/attempts/{attempt_id}/interactions/{key}",
        {"attemptToken": token},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Interaccion registrada"
    result = resp.data["data"]
    assert result["interaction"]["key"] == key
    assert key in result["world"]["inspectedObjectKeys"]
    assert "preparedDecisionOptionId" in result


def test_use_tool_generic_is_pertinent(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    world = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}").data["data"]
    tool_code = world["tools"][0]["code"]
    resp = c.post(
        f"/api/simulation/attempts/{attempt_id}/tools/use",
        {"attemptToken": token, "toolCode": tool_code},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Herramienta usada"
    result = resp.data["data"]
    assert result["toolCode"] == tool_code
    assert result["pertinent"] is True  # no target -> generic use is pertinent
    assert result["stressDelta"] == -5
    assert tool_code in result["world"]["inventory"]


def test_staff_can_view_world_but_other_student_cannot(estudiante, otro_estudiante, profesor, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    # Professor (staff, non-owner) may view.
    staff_resp = cl(profesor).get(
        f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}"
    )
    assert staff_resp.status_code == 200
    # A different student (non-owner, non-staff) may not.
    other_resp = cl(otro_estudiante).get(
        f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}"
    )
    assert other_resp.status_code == 403


def test_world_requires_token(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, _ = _start(c, case_version_id)
    resp = c.get(f"/api/simulation/attempts/{attempt_id}/world")
    assert resp.status_code == 400  # token obligatorio


def test_world_objects_expose_movement_fields(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    world = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}").data["data"]
    assert world["objects"], "expected at least one world object in SIM-VBG-001"
    for obj in world["objects"]:
        assert "movementPattern" in obj
        assert "facing" in obj
        assert "metadata" in obj
        assert isinstance(obj["movementPattern"], dict)
        assert isinstance(obj["metadata"], dict)
        assert isinstance(obj["facing"], str)


# --- Fase 5: spatial doors (enter-room, non-scored, decoupled from DAG) --------
def test_enter_room_moves_and_persists(estudiante, case_version_id):
    from apps.simulation.models import SceneMap
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    cur = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}").data["data"]["map"]["key"]
    target = (
        SceneMap.objects.filter(case_version_id=case_version_id)
        .select_related("node").exclude(map_key=cur).first()
    )
    assert target, "SIM-VBG-001 should have multiple rooms"

    resp = c.post(
        f"/api/simulation/attempts/{attempt_id}/enter-room",
        {"attemptToken": token, "targetNodeKey": target.node.node_key, "entryX": 100, "entryY": 120},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["data"]["map"]["key"] == target.map_key
    # persists across a fresh /world load (door room is NOT reset to the DAG node's map)
    again = c.get(f"/api/simulation/attempts/{attempt_id}/world?attemptToken={token}").data["data"]
    assert again["map"]["key"] == target.map_key


def test_enter_room_invalid_node(estudiante, case_version_id):
    c = cl(estudiante)
    attempt_id, token = _start(c, case_version_id)
    resp = c.post(
        f"/api/simulation/attempts/{attempt_id}/enter-room",
        {"attemptToken": token, "targetNodeKey": "no-existe", "entryX": 0, "entryY": 0},
        format="json",
    )
    assert resp.status_code in (400, 404)
