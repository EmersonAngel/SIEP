"""T16 — Audit trail. Django parity with Spring @Auditable + AuditLogAdapter +
AuditLogCleanupScheduler. Audit is written AFTER a successful operation, never on
failure, never breaking the business op; retention is occurred_at + 360 days; a
management command purges expired rows."""
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.grupos.models import Grupo
from apps.simulation.models import AuditLog, CaseVersion

User = get_user_model()
ADMIN_BASE = "/api/admin/cases"


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def assign_case_to_student(estudiante, case_version_id, codigo="AUDIT-G"):
    """Acceso del estudiante al caso (grupo activo + caso asignado)."""
    profesor = User.objects.create_user(
        email=f"prof_{codigo.lower()}@x.com", password="x",
        nombre="Pro", apellido="Asig", role="PROFESOR",
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


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_audit@x.com", password="x", nombre="Est", apellido="Audit", role="ESTUDIANTE"
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_audit@x.com", password="x", nombre="Ad", apellido="Audit", role="ADMIN"
    )


@pytest.fixture
def published_cv(db):
    return CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id


# --- game-flow auditing ----------------------------------------------------
def test_attempt_started_is_audited(estudiante, published_cv):
    assign_case_to_student(estudiante, published_cv, "AUDIT-START")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": published_cv}, format="json").data["data"]
    row = AuditLog.objects.filter(
        action="ATTEMPT_STARTED", resource_id=str(published_cv), actor_id=estudiante.id
    ).order_by("-id").first()
    assert row is not None
    assert row.resource_type == "CASE_VERSION"
    assert row.actor_role == "ESTUDIANTE"
    # retention window ≈ 360 days
    assert abs((row.retention_until - row.occurred_at).total_seconds() - 360 * 86400) < 10


def test_decision_is_audited_with_attempt_resource(estudiante, published_cv):
    assign_case_to_student(estudiante, published_cv, "AUDIT-DEC")
    c = cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": published_cv}, format="json").data["data"]
    token, attempt_id = start["attemptToken"], start["attemptId"]
    option_id = start["currentNode"]["options"][0]["id"]
    c.post(
        f"/api/simulation/attempts/{attempt_id}/decisions",
        {"attemptToken": token, "decisionOptionId": option_id},
        format="json",
    )
    row = AuditLog.objects.filter(action="DECISION_SELECTED", resource_id=attempt_id).first()
    assert row is not None
    assert row.resource_type == "ATTEMPT"
    assert row.actor_id == estudiante.id


# --- authoring auditing ----------------------------------------------------
def test_clone_and_create_node_are_audited(admin, published_cv):
    a = cl(admin)
    clone_id = a.post(f"{ADMIN_BASE}/{published_cv}/clone-version").data["data"]["caseVersionId"]
    assert AuditLog.objects.filter(
        action="ADMIN_CLONE_VERSION", resource_id=str(published_cv), actor_id=admin.id
    ).exists()

    created = a.post(
        f"{ADMIN_BASE}/{clone_id}/nodes",
        {"nodeKey": "extra", "title": "Extra", "narrative": "N",
         "requiredTools": [], "supportResources": []},
        format="json",
    ).data["data"]
    node_row = AuditLog.objects.filter(
        action="ADMIN_CREATE_NODE", resource_id=str(clone_id), actor_id=admin.id
    ).first()
    assert node_row is not None
    assert node_row.resource_type == "CASE_VERSION"

    # update uses the NODE id as resource (resourceIdParamIndex = 1)
    new_node = next(n for n in created["nodes"] if n["key"] == "extra")
    a.put(
        f"{ADMIN_BASE}/{clone_id}/nodes/{new_node['id']}",
        {"nodeKey": "extra", "title": "Extra2", "narrative": "N"},
        format="json",
    )
    upd = AuditLog.objects.filter(action="ADMIN_UPDATE_NODE", resource_id=str(new_node["id"])).first()
    assert upd is not None
    assert upd.resource_type == "NODE"


def test_failed_mutation_writes_no_audit(admin, published_cv):
    a = cl(admin)
    before = AuditLog.objects.filter(
        action="ADMIN_CREATE_NODE", resource_id=str(published_cv)
    ).count()
    # published version -> ensureDraft rejects (400) before any audit
    resp = a.post(
        f"{ADMIN_BASE}/{published_cv}/nodes",
        {"nodeKey": "x", "title": "t", "narrative": "n"},
        format="json",
    )
    assert resp.status_code == 400
    after = AuditLog.objects.filter(
        action="ADMIN_CREATE_NODE", resource_id=str(published_cv)
    ).count()
    assert after == before


# --- retention purge command -----------------------------------------------
def test_purge_audit_logs_command(db):
    now = timezone.now()
    AuditLog.objects.create(
        action="TEST_PURGE_OLD", actor_role="SYSTEM", retention_until=now - timedelta(days=1)
    )
    AuditLog.objects.create(
        action="TEST_PURGE_FUTURE", actor_role="SYSTEM", retention_until=now + timedelta(days=30)
    )
    call_command("purge_audit_logs")
    assert not AuditLog.objects.filter(action="TEST_PURGE_OLD").exists()
    assert AuditLog.objects.filter(action="TEST_PURGE_FUTURE").exists()
