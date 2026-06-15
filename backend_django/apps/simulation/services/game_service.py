"""Port of Spring's SimulationGameService — the DAG state machine."""
import base64
import hashlib
import secrets

from django.db import connection, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.simulation.models import (
    AttemptEvent,
    CaseVersion,
    DecisionOption,
    ReflectionJournal,
    SimulationAttempt,
    SimulationNode,
)
from apps.simulation.serializers import game_dtos as dto
from . import case_effects, crypto_service, decision_effects
from .audit_service import auditable


def _hash_token(raw_token: str) -> str:
    digest = hashlib.sha256(raw_token.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _save_event(attempt, event_type, node, decision, score_delta, stress_delta, detail):
    AttemptEvent.objects.create(
        attempt=attempt,
        event_type=event_type,
        node=node,
        decision_option=decision,
        score_delta=score_delta,
        stress_delta=stress_delta,
        detail=detail,
    )


def _lock_reflections(attempt):
    ReflectionJournal.objects.filter(attempt_id=attempt.id).update(
        locked=True, updated_at=timezone.now()
    )


def _require_published(case_version_id):
    version = CaseVersion.objects.filter(pk=case_version_id).select_related("simulation_case").first()
    if not version:
        raise NotFound("Versión de caso no encontrada")
    if version.status != "PUBLISHED" or not version.simulation_case.active:
        raise PermissionDenied("El caso no está publicado")
    return version


def _require_attempt(attempt_id, attempt_token, actor):
    if not attempt_token:
        raise ValidationError("El token del intento es obligatorio")
    attempt = (
        SimulationAttempt.objects.filter(
            pk=attempt_id, attempt_token_hash=_hash_token(attempt_token)
        )
        .select_related("case_version__simulation_case", "current_node", "student")
        .first()
    )
    if not attempt:
        raise NotFound("Intento no encontrado")
    owner = attempt.student_id == actor.id
    staff = actor.role in ("ADMIN", "PROFESOR")
    if not owner and not staff:
        raise PermissionDenied("No tiene acceso a este intento")
    return attempt


def _reissue_token(attempt):
    raw = _new_token()
    attempt.attempt_token_hash = _hash_token(raw)
    attempt.save(update_fields=["attempt_token_hash"])
    return raw


def _assigned_case_version_ids(student_id):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT gcv.case_version_id
            FROM grupo_estudiante ge
            INNER JOIN grupos g ON g.id = ge.grupo_id AND g.activo = TRUE
            INNER JOIN grupo_case_version gcv ON gcv.grupo_id = ge.grupo_id
            WHERE ge.estudiante_id = %s
            """,
            [student_id],
        )
        return [row[0] for row in cur.fetchall()]


def _student_can_access_case(student_id, case_version_id):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM grupo_estudiante ge
            INNER JOIN grupos g ON g.id = ge.grupo_id AND g.activo = TRUE
            INNER JOIN grupo_case_version gcv ON gcv.grupo_id = ge.grupo_id
            WHERE ge.estudiante_id = %s AND gcv.case_version_id = %s
            LIMIT 1
            """,
            [student_id, case_version_id],
        )
        return cur.fetchone() is not None


def list_published_cases(actor=None):
    versions = (
        CaseVersion.objects.filter(status="PUBLISHED", simulation_case__active=True)
        .select_related("simulation_case")
        .order_by("-published_at")
    )
    if actor is not None and getattr(actor, "role", None) == "ESTUDIANTE":
        assigned_ids = _assigned_case_version_ids(actor.id)
        if not assigned_ids:
            return []
        versions = versions.filter(id__in=assigned_ids)
    result = []
    for v in versions:
        node_count = SimulationNode.objects.filter(case_version_id=v.id).count()
        result.append(dto.case_summary(v, node_count))
    return result


def _close_active_attempts(student_id, case_version_id, reason):
    actives = SimulationAttempt.objects.filter(
        student_id=student_id, case_version_id=case_version_id, status="IN_PROGRESS"
    )
    now = timezone.now()
    for active in actives:
        active.status = "SAFE_EXITED"
        active.ended_at = now
        active.locked_at = now
        active.save()
        _lock_reflections(active)
        _save_event(active, "SAFE_EXIT_REQUESTED", active.current_node, None, 0, 0, reason)


@transaction.atomic
def start_attempt(case_version_id, actor, force_new=False):
    version = _require_published(case_version_id)
    if getattr(actor, "role", None) == "ESTUDIANTE" and not _student_can_access_case(actor.id, case_version_id):
        raise PermissionDenied("El caso no ha sido asignado a tu grupo")

    if not force_new:
        active = (
            SimulationAttempt.objects.filter(
                student_id=actor.id, case_version_id=case_version_id, status="IN_PROGRESS"
            )
            .select_related("case_version__simulation_case", "current_node")
            .order_by("-started_at")
            .first()
        )
        if active:
            return dto.attempt_state(active, _reissue_token(active), None)
    else:
        _close_active_attempts(actor.id, case_version_id, "Reemplazado por nuevo intento")

    start_node = SimulationNode.objects.filter(case_version_id=version.id, start_node=True).first()
    if not start_node:
        raise NotFound("El caso no tiene nodo inicial")

    raw_token = _new_token()
    attempt = SimulationAttempt.objects.create(
        attempt_token_hash=_hash_token(raw_token),
        case_version=version,
        student_id=actor.id,
        current_node=start_node,
        status="IN_PROGRESS",
        accumulated_score=0,
        stress_index=0,
        victim_risk=50,
        user_trust=50,
        institutional_route_activated=False,
        revictimization_risk=False,
    )
    _save_event(attempt, "ATTEMPT_STARTED", start_node, None, 0, 0, "Intento iniciado")
    _save_event(attempt, "NODE_ENTERED", start_node, None, 0, 0, "Nodo inicial")
    return dto.attempt_state(attempt, raw_token, None)


def find_active_attempt(case_version_id, actor):
    _require_published(case_version_id)
    active = (
        SimulationAttempt.objects.filter(
            student_id=actor.id, case_version_id=case_version_id, status="IN_PROGRESS"
        )
        .select_related("case_version__simulation_case", "current_node")
        .order_by("-started_at")
        .first()
    )
    if not active:
        return None
    return dto.attempt_state(active, _reissue_token(active), None)


def get_attempt(attempt_id, attempt_token, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    return dto.attempt_state(attempt, attempt_token, None)


def get_completion_report(attempt_id, attempt_token, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    if attempt.status == "IN_PROGRESS":
        raise ValidationError("El intento aún está en progreso")
    events = list(AttemptEvent.objects.filter(attempt_id=attempt.id).order_by("occurred_at", "id"))
    return dto.build_completion_report(attempt, events)


@transaction.atomic
def choose_decision(attempt_id, attempt_token, decision_option_id, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    if attempt.status != "IN_PROGRESS":
        raise ValidationError("El intento ya no acepta decisiones")

    decision = (
        DecisionOption.objects.filter(pk=decision_option_id)
        .select_related("source_node", "target_node", "case_version")
        .first()
    )
    if not decision:
        raise NotFound("Decisión no encontrada")
    if decision.source_node_id != attempt.current_node_id:
        raise ValidationError("La decisión no está disponible desde la escena actual")
    if decision.case_version_id != attempt.case_version_id:
        raise ValidationError("La decisión no pertenece al caso del intento")

    effects = decision_effects.resolve(decision)
    retry_required = decision.prohibited_conduct or decision.classification == "INADEQUATE"
    if retry_required:
        message = (
            "La intervención requiere revisar mejor la información disponible antes de continuar. "
            "Puedes volver a responder esta escena."
        )
        event_type = (
            "PROHIBITED_DECISION_RETRY_REQUIRED"
            if decision.prohibited_conduct
            else "DECISION_RETRY_REQUIRED"
        )
        # El intento queda trazado para revisión/rúbrica docente, pero no cambia
        # métricas ni avanza el DAG hasta que el estudiante elija una ruta viable.
        _save_event(attempt, event_type, decision.source_node, decision, 0, 0, message)
        feedback = dto.feedback_dto(decision, effects, message)
        return dto.attempt_state(attempt, attempt_token, feedback)

    decision_effects.apply(attempt, effects)
    # Efecto mariposa del caso: flags clínicos + métricas acumulativas (se
    # aplica ANTES de avanzar el nodo — el world state sigue sincronizado al
    # nodo actual y el próximo /world hará el reset de sala que corresponda).
    case_effects.apply_case_effects(attempt, decision)
    event_type = "PROHIBITED_DECISION_SELECTED" if decision.prohibited_conduct else "DECISION_SELECTED"

    message = decision_effects.format_feedback(decision, effects)
    attempt.current_node = decision.target_node

    _save_event(attempt, event_type, decision.source_node, decision, effects.score_delta, effects.stress_delta, message)
    _save_event(attempt, "NODE_ENTERED", decision.target_node, None, 0, 0, "Nodo visitado")

    if decision.target_node.terminal_node:
        now = timezone.now()
        attempt.status = "COMPLETED"
        attempt.ended_at = now
        attempt.locked_at = now
        _lock_reflections(attempt)

    attempt.save()

    if attempt.status == "COMPLETED":
        _save_event(attempt, "ATTEMPT_COMPLETED", decision.target_node, None, 0, 0, "Intento finalizado")
        from apps.progression.services import record_case_completion
        record_case_completion(attempt.student_id, attempt.case_version.simulation_case_id)

    feedback = dto.feedback_dto(decision, effects, message)
    return dto.attempt_state(attempt, attempt_token, feedback)


@transaction.atomic
def save_reflection(attempt_id, attempt_token, node_id, text, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    if attempt.status != "IN_PROGRESS":
        raise ValidationError("La bitácora ya está bloqueada")
    if not text or not text.strip():
        raise ValidationError("La bitácora requiere texto")
    node = SimulationNode.objects.filter(pk=node_id).select_related("case_version").first()
    if not node:
        raise NotFound("Nodo no encontrado")
    if node.case_version_id != attempt.case_version_id:
        raise ValidationError("El nodo no pertenece al caso del intento")

    reflection = ReflectionJournal.objects.filter(attempt_id=attempt.id, node_id=node.id).first()
    if reflection and reflection.locked:
        raise ValidationError("La bitácora ya está bloqueada")
    if not reflection:
        reflection = ReflectionJournal(attempt=attempt, node=node)
    reflection.encrypted_text = crypto_service.encrypt(text)
    reflection.encryption_key_ref = crypto_service.key_ref()
    reflection.locked = attempt.status != "IN_PROGRESS"
    reflection.save()

    _save_event(attempt, "REFLECTION_SAVED", node, None, 0, 0, "Bitácora registrada")
    return {"nodeId": node.id, "locked": reflection.locked}


@transaction.atomic
def safe_exit(attempt_id, attempt_token, reason, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    if attempt.status != "IN_PROGRESS":
        return dto.attempt_state(attempt, attempt_token, None)
    now = timezone.now()
    attempt.status = "SAFE_EXITED"
    attempt.ended_at = now
    attempt.locked_at = now
    attempt.save()
    _lock_reflections(attempt)
    detail = reason if (reason and reason.strip()) else "Salida segura solicitada"
    _save_event(attempt, "SAFE_EXIT_REQUESTED", attempt.current_node, None, 0, 0, detail)
    return dto.attempt_state(attempt, attempt_token, None)


def get_progress_map(attempt_id, attempt_token, actor):
    attempt = _require_attempt(attempt_id, attempt_token, actor)
    case_version_id = attempt.case_version_id

    all_nodes = list(SimulationNode.objects.filter(case_version_id=case_version_id).order_by("id"))
    by_id = {n.id: n for n in all_nodes}
    start = next((n for n in all_nodes if n.start_node), all_nodes[0] if all_nodes else None)

    adjacency = {n.id: [] for n in all_nodes}
    for d in DecisionOption.objects.filter(case_version_id=case_version_id).order_by("id"):
        adjacency.setdefault(d.source_node_id, []).append(d.target_node_id)

    ordered = []
    visited = set()
    queue = [start.id] if start else []
    while queue:
        cur = queue.pop(0)
        if cur in visited:
            continue
        visited.add(cur)
        if cur in by_id:
            ordered.append(by_id[cur])
        for nxt in adjacency.get(cur, []):
            if nxt not in visited:
                queue.append(nxt)
    for n in all_nodes:
        if n.id not in visited:
            ordered.append(n)

    visited_keys = list(dict.fromkeys(
        ev.node.node_key
        for ev in AttemptEvent.objects.filter(attempt_id=attempt_id, event_type="NODE_ENTERED")
        .select_related("node").order_by("occurred_at", "id")
        if ev.node_id
    ))

    return {
        "nodes": [dto.progress_map_node(n) for n in ordered],
        "visitedNodeKeys": visited_keys,
        "currentNodeKey": attempt.current_node.node_key,
    }


# ─── Audit instrumentation (parity with Spring @Auditable) ───────────────────
start_attempt = auditable("ATTEMPT_STARTED", "CASE_VERSION")(start_attempt)
choose_decision = auditable("DECISION_SELECTED", "ATTEMPT")(choose_decision)
save_reflection = auditable("REFLECTION_SAVED", "ATTEMPT")(save_reflection)
safe_exit = auditable("SAFE_EXIT_REQUESTED", "ATTEMPT")(safe_exit)
